# Upload PDF to Cloudinary

The storefront uploads generated shoelace PDFs through the Shopify app proxy:

`/apps/shoelaces-upload-pdf`

Shopify forwards that request to the app route:

`/api/uploadPDF`

The app validates the Shopify app proxy request, checks that the upload is a PDF,
then uploads it to Cloudinary using server-side credentials.

PDFs are uploaded as Cloudinary `image` assets, not `raw` assets. Cloudinary's
image asset pipeline is what gives PDFs the in-dashboard preview, page
dimensions, and normal PDF viewer behavior.

## Required Environment Variables

Add these variables to your app environment:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Optional:

```bash
CLOUDINARY_PDF_FOLDER=shoelaces-configurations
```

Never put `CLOUDINARY_API_SECRET` in theme Liquid, JavaScript assets, or any
browser-visible code.

## Shopify App Proxy

The app proxy is configured in `shopify.app.toml`:

```toml
[app_proxy]
url = "/api/uploadPDF"
subpath = "shoelaces-upload-pdf"
prefix = "apps"
```

After changing app proxy settings, run:

```bash
npm run deploy
```

For local development, run:

```bash
npm run dev
```

Then test from the storefront domain, not only the theme preview tunnel. The
browser request should go to:

`https://your-store.myshopify.com/apps/shoelaces-upload-pdf`

## Security Notes

- Cloudinary credentials stay on the server.
- The route uses `authenticate.public.appProxy(request)` so random external
  requests cannot call the upload route directly.
- Uploads are limited to PDF files with a valid `%PDF-` file signature.
- Upload size is capped at 8 MB.
- A lightweight per-shop/IP rate limit blocks repeated upload spam.
- The uploaded PDF URL is saved on the cart line item as `Design PDF`.
