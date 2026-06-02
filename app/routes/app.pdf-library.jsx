import { Buffer } from "node:buffer";
import process from "node:process";
import { useMemo, useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import styles from "../styles/pdf-library.module.css";

const MAX_LIBRARY_RESULTS = 1000;

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function cloudinaryFolder() {
  return process.env.CLOUDINARY_PDF_FOLDER || "shoelaces-configurations";
}

function cloudinaryEmojiFolder() {
  return process.env.CLOUDINARY_EMOJI_FOLDER || "shoelaces-custom-emojis";
}

function cloudinaryCredentials() {
  return {
    cloudName: requiredEnv("CLOUDINARY_CLOUD_NAME"),
    authHeader: `Basic ${Buffer.from(
      `${requiredEnv("CLOUDINARY_API_KEY")}:${requiredEnv(
        "CLOUDINARY_API_SECRET",
      )}`,
    ).toString("base64")}`,
  };
}

async function cloudinaryRequest(path, options = {}) {
  const { cloudName, authHeader } = cloudinaryCredentials();
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}${path}`,
    {
      ...options,
      headers: {
        Authorization: authHeader,
        ...(options.headers || {}),
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || "Cloudinary request failed.");
  }

  return data;
}

function contextValue(resource, key) {
  const custom = resource.context?.custom || {};

  return custom[key] || "";
}

function displayId(publicId) {
  return (publicId.split("/").pop() || publicId).replace(/\.(pdf|svg)$/i, "");
}

function formatDate(value) {
  if (!value) {
    return "N/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function pdfPreviewUrl(url) {
  return url
    .replace("/upload/", "/upload/pg_1,f_jpg/")
    .replace(/\.pdf$/i, ".jpg");
}

function mapResource(resource, type = "pdf") {
  return {
    assetId: resource.asset_id,
    publicId: resource.public_id,
    displayId: displayId(resource.public_id),
    type,
    format: resource.format || type,
    bytes: resource.bytes || 0,
    secureUrl: resource.secure_url,
    createdAt: resource.created_at,
    createdAtLabel: formatDate(resource.created_at),
    configId:
      contextValue(resource, "config_id") || displayId(resource.public_id),
    iconName: contextValue(resource, "icon_name"),
    shop: contextValue(resource, "shop"),
  };
}

function matchesQuery(file, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    file.assetId,
    file.publicId,
    file.displayId,
    file.configId,
    file.iconName,
    file.shop,
    file.format,
    file.createdAtLabel,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

async function listCloudinaryFiles({ folder, type, query }) {
  const resources = [];
  let nextCursor = "";

  do {
    const params = new URLSearchParams({
      prefix: `${folder}/`,
      max_results: "100",
      context: "true",
    });

    if (nextCursor) {
      params.set("next_cursor", nextCursor);
    }

    const data = await cloudinaryRequest(`/resources/image/upload?${params}`);
    resources.push(...(data.resources || []));
    nextCursor = data.next_cursor || "";
  } while (nextCursor && resources.length < MAX_LIBRARY_RESULTS);

  return resources
    .map((resource) => mapResource(resource, type))
    .filter((file) => matchesQuery(file, query))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function listPdfFiles(query) {
  return listCloudinaryFiles({
    folder: cloudinaryFolder(),
    type: "pdf",
    query,
  });
}

async function listEmojiFiles(query) {
  return listCloudinaryFiles({
    folder: cloudinaryEmojiFolder(),
    type: "emoji",
    query,
  });
}

function sanitizePublicIdSegment(value) {
  const clean = String(value || "")
    .trim()
    .replace(/\.(pdf|svg)$/i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (!clean) {
    throw new Error("Enter a valid PDF ID.");
  }

  return clean;
}

function folderForType(type) {
  return type === "emoji" ? cloudinaryEmojiFolder() : cloudinaryFolder();
}

function labelForType(type) {
  return type === "emoji" ? "custom emoji SVG" : "PDF";
}

async function renameAsset(formData, type = "pdf") {
  const folder = folderForType(type);
  const fromPublicId = String(formData.get("publicId") || "");
  const newName = sanitizePublicIdSegment(formData.get("newName"));
  const toPublicId = `${folder}/${newName}`;
  const body = new URLSearchParams({
    from_public_id: fromPublicId,
    to_public_id: toPublicId,
    overwrite: "false",
    invalidate: "true",
  });

  if (!fromPublicId.startsWith(`${folder}/`)) {
    throw new Error(
      `This ${labelForType(type)} is outside the configured shoelaces folder.`,
    );
  }

  await cloudinaryRequest("/image/rename", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

async function deleteAsset(formData, type = "pdf") {
  const folder = folderForType(type);
  const publicId = String(formData.get("publicId") || "");
  const body = new URLSearchParams({
    public_id: publicId,
    invalidate: "true",
  });

  if (!publicId.startsWith(`${folder}/`)) {
    throw new Error(
      `This ${labelForType(type)} is outside the configured shoelaces folder.`,
    );
  }

  await cloudinaryRequest("/image/destroy", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || "";

  try {
    return {
      ok: true,
      query,
      folder: cloudinaryFolder(),
      emojiFolder: cloudinaryEmojiFolder(),
      files: await listPdfFiles(""),
      emojiFiles: await listEmojiFiles(""),
    };
  } catch (error) {
    return {
      ok: false,
      query,
      folder: cloudinaryFolder(),
      emojiFolder: cloudinaryEmojiFolder(),
      files: [],
      emojiFiles: [],
      error: error.message,
    };
  }
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");
  const type = String(formData.get("type") || "pdf");
  const query = String(formData.get("q") || "");
  const redirectTo = `/app/pdf-library${query ? `?q=${encodeURIComponent(query)}` : ""}`;

  try {
    if (intent === "rename") {
      await renameAsset(formData, type);
      throw redirect(redirectTo);
    }

    if (intent === "delete") {
      await deleteAsset(formData, type);
      throw redirect(redirectTo);
    }

    throw new Error("Unknown PDF library action.");
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      ok: false,
      error: error.message,
    };
  }
};

export default function PdfLibrary() {
  const data = useLoaderData();
  const actionData = useActionData();
  const [query, setQuery] = useState(data.query || "");

  const visibleFiles = useMemo(() => {
    return data.files.filter((file) => matchesQuery(file, query));
  }, [data.files, query]);

  const visibleEmojiFiles = useMemo(() => {
    return data.emojiFiles.filter((file) => matchesQuery(file, query));
  }, [data.emojiFiles, query]);

  const renderAssetCard = (file) => {
    const isEmoji = file.type === "emoji";
    const title = isEmoji ? file.iconName || file.displayId : file.configId;
    const previewSrc = isEmoji ? file.secureUrl : pdfPreviewUrl(file.secureUrl);
    const previewAlt = isEmoji
      ? `Preview of ${title}`
      : `Preview of ${file.displayId}`;

    return (
      <article
        className={`${styles.card} ${isEmoji ? styles.emojiCard : ""}`}
        key={file.assetId}
      >
        <details className={styles.menu}>
          <summary aria-label={`Actions for ${file.displayId}`}>...</summary>
          <div className={styles.menuBody}>
            <Form className={styles.renameForm} method="post">
              <input type="hidden" name="intent" value="rename" />
              <input type="hidden" name="type" value={file.type} />
              <input type="hidden" name="q" value={data.query} />
              <input type="hidden" name="publicId" value={file.publicId} />
              <input
                className={styles.renameInput}
                name="newName"
                defaultValue={file.displayId}
                aria-label={isEmoji ? "New emoji ID" : "New PDF ID"}
                required
              />
              <button className={styles.menuItem} type="submit">
                Rename
              </button>
            </Form>

            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="type" value={file.type} />
              <input type="hidden" name="q" value={data.query} />
              <input type="hidden" name="publicId" value={file.publicId} />
              <button
                className={`${styles.menuItem} ${styles.danger}`}
                type="submit"
              >
                Delete
              </button>
            </Form>
          </div>
        </details>

        <a
          className={`${styles.previewLink} ${
            isEmoji ? styles.emojiPreviewLink : ""
          }`}
          href={file.secureUrl}
          target="_blank"
          rel="noreferrer"
        >
          <img
            className={styles.preview}
            src={previewSrc}
            alt={previewAlt}
            loading="lazy"
          />

          <div className={styles.overlay}>
            <p className={styles.id}>{title}</p>
            {isEmoji && file.configId ? (
              <p className={styles.date}>Design: {file.configId}</p>
            ) : null}
            <p className={styles.date}>{file.createdAtLabel}</p>
          </div>
        </a>
      </article>
    );
  };

  return (
    <s-page heading="PDF Library">
      <s-section>
        <div className={styles.library}>
          <div className={styles.searchForm}>
            <input
              className={styles.searchInput}
              name="q"
              placeholder="Search by ID..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {actionData?.ok === false ? (
            <div className={styles.error}>{actionData.error}</div>
          ) : null}

          {data.ok ? (
            <>
              <div className={styles.header}>
                <div>
                  <h2 className={styles.title}>PDF Library</h2>
                  <p className={styles.muted}>
                    {visibleFiles.length} PDF files in {data.folder}
                  </p>
                </div>
              </div>

              {visibleFiles.length ? (
                <div className={styles.grid}>
                  {visibleFiles.map((file) => (
                    <article className={styles.card} key={file.assetId}>
                      <details className={styles.menu}>
                        <summary aria-label={`Actions for ${file.displayId}`}>
                          ⋮
                        </summary>
                        <div className={styles.menuBody}>
                          <Form className={styles.renameForm} method="post">
                            <input type="hidden" name="intent" value="rename" />
                            <input type="hidden" name="q" value={data.query} />
                            <input
                              type="hidden"
                              name="publicId"
                              value={file.publicId}
                            />
                            <input
                              className={styles.renameInput}
                              name="newName"
                              defaultValue={file.displayId}
                              aria-label="New PDF ID"
                              required
                            />
                            <button className={styles.menuItem} type="submit">
                              Rename
                            </button>
                          </Form>

                          <Form method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="q" value={data.query} />
                            <input
                              type="hidden"
                              name="publicId"
                              value={file.publicId}
                            />
                            <button
                              className={`${styles.menuItem} ${styles.danger}`}
                              type="submit"
                            >
                              Delete
                            </button>
                          </Form>
                        </div>
                      </details>

                      <a
                        className={styles.previewLink}
                        href={file.secureUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          className={styles.preview}
                          src={pdfPreviewUrl(file.secureUrl)}
                          alt={`Preview of ${file.displayId}`}
                          loading="lazy"
                        />

                        <div className={styles.overlay}>
                          <p className={styles.id}>{file.configId}</p>
                          <p className={styles.date}>{file.createdAtLabel}</p>
                        </div>
                      </a>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  No PDF files found for this search.
                </div>
              )}

              <div className={styles.header}>
                <div>
                  <h2 className={styles.title}>Custom Emoji SVGs</h2>
                  <p className={styles.muted}>
                    {visibleEmojiFiles.length} SVG files in {data.emojiFolder}
                  </p>
                </div>
              </div>

              {visibleEmojiFiles.length ? (
                <div className={styles.grid}>
                  {visibleEmojiFiles.map((file) => renderAssetCard(file))}
                </div>
              ) : (
                <div className={styles.empty}>
                  No custom emoji SVGs found for this search.
                </div>
              )}
            </>
          ) : (
            <div className={styles.error}>{data.error}</div>
          )}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
