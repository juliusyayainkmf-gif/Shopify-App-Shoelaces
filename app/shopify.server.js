import "@shopify/shopify-app-react-router/adapters/node";
import crypto from "crypto";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const splitEnv = (value) =>
  value
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) || [];

const createShopifyApp = ({
  apiKey,
  apiSecretKey,
  appUrl,
  customShopDomains = [],
}) => {
  const shopify = shopifyApp({
    apiKey,
    apiSecretKey,
    apiVersion: ApiVersion.October25,
    scopes: process.env.SCOPES?.split(","),
    appUrl,
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prisma),
    distribution: AppDistribution.AppStore,
    future: {
      expiringOfflineAccessTokens: true,
    },
    ...(customShopDomains.length ? { customShopDomains } : {}),
  });

  return { shopify, apiKey, apiSecretKey };
};

const shopifyApps = [
  createShopifyApp({
    apiKey:
      process.env.SHOELACES_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY,
    apiSecretKey:
      process.env.SHOELACES_SHOPIFY_API_SECRET ||
      process.env.SHOPIFY_API_SECRET ||
      "",
    appUrl:
      process.env.SHOELACES_SHOPIFY_APP_URL ||
      process.env.SHOPIFY_APP_URL ||
      "",
    customShopDomains: splitEnv(
      process.env.SHOELACES_SHOP_CUSTOM_DOMAINS ||
        process.env.SHOP_CUSTOM_DOMAIN,
    ),
  }),
  ...(process.env.KMF_SHOELACES_SHOPIFY_API_KEY ||
  process.env.KMF_SHOPIFY_API_KEY
    ? [
        createShopifyApp({
          apiKey:
            process.env.KMF_SHOELACES_SHOPIFY_API_KEY ||
            process.env.KMF_SHOPIFY_API_KEY,
          apiSecretKey:
            process.env.KMF_SHOELACES_SHOPIFY_API_SECRET ||
            process.env.KMF_SHOPIFY_API_SECRET ||
            "",
          appUrl:
            process.env.KMF_SHOELACES_SHOPIFY_APP_URL ||
            process.env.KMF_SHOPIFY_APP_URL ||
            process.env.SHOPIFY_APP_URL ||
            "",
          customShopDomains: splitEnv(
            process.env.KMF_SHOELACES_SHOP_CUSTOM_DOMAINS ||
              process.env.KMF_SHOP_CUSTOM_DOMAINS,
          ),
        }),
      ]
    : []),
];

const defaultApp = shopifyApps[0];

const timingSafeEqual = (left, right, encoding = "hex") => {
  const leftBuffer = Buffer.from(left, encoding);
  const rightBuffer = Buffer.from(right, encoding);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const getAppByApiKey = (apiKey) =>
  shopifyApps.find((app) => app.apiKey === apiKey);

const getAppFromApiKeyParam = (request) => {
  const url = new URL(request.url);
  const apiKey =
    url.searchParams.get("client_id") || url.searchParams.get("api_key");

  return apiKey ? getAppByApiKey(apiKey) : null;
};

const getAppFromUrlHmac = (request) => {
  const url = new URL(request.url);
  const hmac = url.searchParams.get("hmac");

  if (!hmac) return null;

  const message = [...url.searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return shopifyApps.find(({ apiSecretKey }) => {
    const digest = crypto
      .createHmac("sha256", apiSecretKey)
      .update(message)
      .digest("hex");

    return timingSafeEqual(digest, hmac);
  });
};

const getAppFromAppProxySignature = (request) => {
  const url = new URL(request.url);

  if (!url.searchParams.get("signature")) return null;

  const baseSearchParams = new URLSearchParams(url.search);
  if (!baseSearchParams.get("index")) {
    baseSearchParams.delete("index");
  }

  const cleanPath = url.pathname
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replaceAll("/", ".");
  const data = `routes%2F${cleanPath}`;
  const appProxySearchParams = [
    baseSearchParams,
    new URLSearchParams(
      `?_data=${data}&${baseSearchParams.toString().replace(/^\?/, "")}`,
    ),
    new URLSearchParams(
      `?_data=${data}._index&${url.search.replace(/^\?/, "")}`,
    ),
  ];

  return shopifyApps.find(({ apiSecretKey }) =>
    appProxySearchParams.some((searchParams) => {
      const query = Object.fromEntries(searchParams.entries());
      const { hmac, signature, ...signedQuery } = query;

      if (!signature) return false;

      const message = Object.entries(signedQuery)
        .sort(([left], [right]) => left.localeCompare(right))
        .reduce((payload, [key, value]) => `${payload}${key}=${value}`, "");
      const digest = crypto
        .createHmac("sha256", apiSecretKey)
        .update(message)
        .digest("hex");

      return timingSafeEqual(digest, signature);
    }),
  );
};

const getAppFromJwt = (request) => {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];

  if (!token) return null;

  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const signedPayload = `${header}.${payload}`;

  return shopifyApps.find(({ apiKey, apiSecretKey }) => {
    const digest = crypto
      .createHmac("sha256", apiSecretKey)
      .update(signedPayload)
      .digest("base64url");

    if (!timingSafeEqual(digest, signature, "utf8")) return false;

    try {
      const decodedPayload = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      );

      return !decodedPayload.aud || decodedPayload.aud === apiKey;
    } catch {
      return false;
    }
  });
};

const getAppFromWebhookHmac = async (request) => {
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!hmac) return null;

  let body;
  try {
    body = await request.clone().text();
  } catch {
    return null;
  }

  return shopifyApps.find(({ apiSecretKey }) => {
    const digest = crypto
      .createHmac("sha256", apiSecretKey)
      .update(body, "utf8")
      .digest("base64");

    return timingSafeEqual(digest, hmac, "base64");
  });
};

const getAppForRequest = async (request) =>
  getAppFromApiKeyParam(request) ||
  getAppFromUrlHmac(request) ||
  getAppFromAppProxySignature(request) ||
  getAppFromJwt(request) ||
  (await getAppFromWebhookHmac(request)) ||
  defaultApp;

export const getShopifyApiKey = async (request) =>
  (await getAppForRequest(request)).apiKey;

const shopify = defaultApp.shopify;

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = async (request, headers) => {
  const { shopify } = await getAppForRequest(request);
  return shopify.addDocumentResponseHeaders(request, headers);
};
export const authenticate = {
  admin: async (request) => {
    const { shopify } = await getAppForRequest(request);
    return shopify.authenticate.admin(request);
  },
  webhook: async (request) => {
    const { shopify } = await getAppForRequest(request);
    return shopify.authenticate.webhook(request);
  },
  flow: async (request) => {
    const { shopify } = await getAppForRequest(request);
    return shopify.authenticate.flow(request);
  },
  fulfillmentService: async (request) => {
    const { shopify } = await getAppForRequest(request);
    return shopify.authenticate.fulfillmentService(request);
  },
  pos: async (request) => {
    const { shopify } = await getAppForRequest(request);
    return shopify.authenticate.pos(request);
  },
  public: {
    checkout: async (request) => {
      const { shopify } = await getAppForRequest(request);
      return shopify.authenticate.public.checkout(request);
    },
    appProxy: async (request) => {
      const { shopify } = await getAppForRequest(request);
      return shopify.authenticate.public.appProxy(request);
    },
  },
};
export const unauthenticated = {
  admin: async (shop) => defaultApp.shopify.unauthenticated.admin(shop),
  storefront: async (shop) =>
    defaultApp.shopify.unauthenticated.storefront(shop),
};
export const login = async (request) => {
  const { shopify } = await getAppForRequest(request);
  return shopify.login(request);
};
export const registerWebhooks = async (options) => {
  return defaultApp.shopify.registerWebhooks(options);
};
export const sessionStorage = shopify.sessionStorage;
