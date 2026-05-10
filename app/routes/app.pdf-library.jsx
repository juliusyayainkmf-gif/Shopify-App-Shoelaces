import { Buffer } from "node:buffer";
import process from "node:process";
import { useEffect, useMemo, useState } from "react";
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
  return (publicId.split("/").pop() || publicId).replace(/\.pdf$/i, "");
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

function mapResource(resource) {
  return {
    assetId: resource.asset_id,
    publicId: resource.public_id,
    displayId: displayId(resource.public_id),
    format: resource.format || "pdf",
    bytes: resource.bytes || 0,
    secureUrl: resource.secure_url,
    createdAt: resource.created_at,
    createdAtLabel: formatDate(resource.created_at),
    configId:
      contextValue(resource, "config_id") || displayId(resource.public_id),
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
    file.shop,
    file.createdAtLabel,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

async function listPdfFiles(query) {
  const folder = cloudinaryFolder();
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
    .map(mapResource)
    .filter((file) => matchesQuery(file, query))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function sanitizePublicIdSegment(value) {
  const clean = String(value || "")
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (!clean) {
    throw new Error("Enter a valid PDF ID.");
  }

  return clean;
}

async function renamePdf(formData) {
  const folder = cloudinaryFolder();
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
    throw new Error("This PDF is outside the configured shoelaces folder.");
  }

  await cloudinaryRequest("/image/rename", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

async function deletePdf(formData) {
  const folder = cloudinaryFolder();
  const publicId = String(formData.get("publicId") || "");
  const body = new URLSearchParams({
    public_id: publicId,
    invalidate: "true",
  });

  if (!publicId.startsWith(`${folder}/`)) {
    throw new Error("This PDF is outside the configured shoelaces folder.");
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
      files: await listPdfFiles(""),
    };
  } catch (error) {
    return {
      ok: false,
      query,
      folder: cloudinaryFolder(),
      files: [],
      error: error.message,
    };
  }
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");
  const query = String(formData.get("q") || "");
  const redirectTo = `/app/pdf-library${query ? `?q=${encodeURIComponent(query)}` : ""}`;

  try {
    if (intent === "rename") {
      await renamePdf(formData);
      throw redirect(redirectTo);
    }

    if (intent === "delete") {
      await deletePdf(formData);
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
  const [openMenu, setOpenMenu] = useState(null);

  const visibleFiles = useMemo(() => {
    return data.files.filter((file) => matchesQuery(file, query));
  }, [data.files, query]);

  useEffect(() => {
    const closeMenu = () => setOpenMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const toggleMenu = (id) => {
    setOpenMenu(openMenu === id ? null : id);
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
