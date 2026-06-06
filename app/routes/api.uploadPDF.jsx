import crypto from "node:crypto";
import process from "node:process";
import { authenticate } from "../shopify.server";
import { uploadEmojiFromFormData } from "./api.uploadEmoji";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const uploadAttempts = new Map();

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function clientKey(request, shop) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0].trim() || "unknown";

  return `${shop}:${ip}`;
}

function assertRateLimit(request, shop) {
  const key = clientKey(request, shop);
  const now = Date.now();
  const current = uploadAttempts.get(key);

  if (!current || current.resetAt <= now) {
    uploadAttempts.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new Response("Too many upload attempts.", { status: 429 });
  }

  current.count += 1;
}

async function assertPdfFile(file) {
  if (!(file instanceof File)) {
    throw new Response("PDF file is required.", { status: 400 });
  }

  if (file.size <= 0) {
    throw new Response("PDF file is empty.", { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new Response("PDF file is too large.", { status: 413 });
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const signature = String.fromCharCode(...header);

  if (signature !== "%PDF-") {
    throw new Response("Only PDF uploads are allowed.", { status: 415 });
  }
}

function safePublicId(value) {
  return String(value || "")
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function cloudinarySignature(params, apiSecret) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

async function uploadToCloudinary({ file, configId, shop }) {
  const cloudName = requiredEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requiredEnv("CLOUDINARY_API_KEY");
  const apiSecret = requiredEnv("CLOUDINARY_API_SECRET");
  const folder = process.env.CLOUDINARY_PDF_FOLDER || "shoelaces-configurations";
  const publicId =
    safePublicId(configId) || `shoelace-${Date.now()}-${crypto.randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParams = {
    folder,
    public_id: publicId,
    overwrite: "false",
    tags: "shoelaces,pdf,cart-upload",
    context: `shop=${shop}|config_id=${publicId}`,
    timestamp,
  };

  const uploadForm = new FormData();
  uploadForm.append("file", file, `${publicId}.pdf`);
  Object.entries(uploadParams).forEach(([key, value]) => {
    uploadForm.append(key, String(value));
  });
  uploadForm.append("api_key", apiKey);
  uploadForm.append(
    "signature",
    cloudinarySignature(uploadParams, apiSecret),
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: uploadForm,
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || "Cloudinary upload failed.");
  }

  return {
    assetId: result.asset_id,
    publicId: result.public_id,
    secureUrl: result.secure_url,
    bytes: result.bytes,
    format: result.format,
    pages: result.pages,
    width: result.width,
    height: result.height,
  };
}

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  try {
    const { session, shop } = await authenticate.public.appProxy(request);

    // If HMAC is valid but session is missing, it means the offline token is not in the DB
    if (!session) {
      const targetShop = shop || new URL(request.url).searchParams.get("shop");
      console.error(`[AppProxy] No offline session found for shop: ${targetShop}`);
      return json({ ok: false, error: `Session not found for ${targetShop}. Please re-install the app.` }, { status: 401 });
    }

    const formData = await request.formData();

    if (formData.get("uploadType") === "emoji") {
      const upload = await uploadEmojiFromFormData({
        request,
        formData,
        shop: session.shop,
      });

      return json({
        ok: true,
        upload,
      });
    }

    assertRateLimit(request, session.shop);

    const file = formData.get("pdf");
    const configId = formData.get("configId");

    await assertPdfFile(file);

    const upload = await uploadToCloudinary({
      file,
      configId,
      shop: session.shop,
    });

    return json({
      ok: true,
      upload,
    });
  } catch (error) {
    if (error instanceof Response) {
      const message = await error.text();

      return json(
        {
          ok: false,
          error: message || "PDF upload failed.",
        },
        { status: error.status || 500 },
      );
    }

    return json(
      {
        ok: false,
        error: error.message || "PDF upload failed.",
      },
      { status: 500 },
    );
  }
};
