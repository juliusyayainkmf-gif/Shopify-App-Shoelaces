import crypto from "node:crypto";
import process from "node:process";
import { authenticate } from "../shopify.server";

const MAX_SVG_BYTES = 512 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 24;
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

async function assertSvgFile(file) {
  if (!(file instanceof File)) {
    throw new Response("SVG file is required.", { status: 400 });
  }

  if (file.size <= 0) {
    throw new Response("SVG file is empty.", { status: 400 });
  }

  if (file.size > MAX_SVG_BYTES) {
    throw new Response("SVG file is too large.", { status: 413 });
  }

  const text = await file.text();

  if (!/<svg[\s>]/i.test(text)) {
    throw new Response("Only SVG uploads are allowed.", { status: 415 });
  }

  if (/<script[\s>]/i.test(text) || /<foreignObject[\s>]/i.test(text)) {
    throw new Response("SVG contains unsupported markup.", { status: 415 });
  }
}

function safePublicId(value) {
  return String(value || "")
    .trim()
    .replace(/\.svg$/i, "")
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

async function uploadEmojiToCloudinary({ file, iconName, configId, shop }) {
  const cloudName = requiredEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requiredEnv("CLOUDINARY_API_KEY");
  const apiSecret = requiredEnv("CLOUDINARY_API_SECRET");
  const folder =
    process.env.CLOUDINARY_EMOJI_FOLDER || "shoelaces-custom-emojis";
  const safeIconName = safePublicId(iconName) || "custom-icon";
  const safeConfigId = safePublicId(configId);
  const publicId = safeConfigId
    ? `${safeConfigId}-${safeIconName}`
    : `${safeIconName}-${Date.now()}-${crypto.randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParams = {
    folder,
    public_id: publicId,
    overwrite: "false",
    tags: "shoelaces,custom-emoji,cart-upload",
    context: `shop=${shop}|config_id=${safeConfigId || "pending"}|icon_name=${safeIconName}`,
    timestamp,
  };

  const uploadForm = new FormData();
  uploadForm.append("file", file, `${safeIconName}.svg`);
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
    width: result.width,
    height: result.height,
  };
}

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, { status: 405 });
  }

  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session?.shop) {
      return json({ ok: false, error: "Unauthorized shop." }, { status: 401 });
    }

    const formData = await request.formData();
    const upload = await uploadEmojiFromFormData({
      request,
      formData,
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
          error: message || "Custom emoji upload failed.",
        },
        { status: error.status || 500 },
      );
    }

    return json(
      {
        ok: false,
        error: error.message || "Custom emoji upload failed.",
      },
      { status: 500 },
    );
  }
};

export async function uploadEmojiFromFormData({ request, formData, shop }) {
  assertRateLimit(request, shop);

  const file = formData.get("emoji");
  const iconName = formData.get("iconName");
  const configId = formData.get("configId");

  await assertSvgFile(file);

  return uploadEmojiToCloudinary({
    file,
    iconName,
    configId,
    shop,
  });
}
