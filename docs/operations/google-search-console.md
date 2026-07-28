# Google Search Console setup for ATTD.vn

This guide prepares Search Console measurement for the Content Platform without committing credentials.

## 1) Recommended property

- Use **Domain property**: `attd.vn`
- Canonical production host remains `https://www.attd.vn`

## 2) Verification method

- Preferred: **DNS TXT verification** at domain level
- Do not commit verification values to repository files
- Keep verification in DNS provider and Search Console settings only

## 3) Sitemap submission

- Submit: `https://www.attd.vn/sitemap.xml`
- Confirm robots references the same sitemap URL

## 4) URL Inspection workflow

After the first article is manually published:

1. Open URL Inspection in GSC
2. Inspect final production URL
3. Request indexing if URL is new
4. Re-check canonical selected by Google

## 5) API integration prerequisites (names only)

If enabling server-side GSC API later, configure only secure env/service-account references:

- `GOOGLE_SEARCH_CONSOLE_SITE_URL`
- `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`
- `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`

Or use a secret-mount reference managed by deployment platform.

Do not commit service-account JSON, private keys, or tokens.

## 6) Security policy

- Never return credential values from CMS APIs
- Never log private key material
- Never commit secrets in `.env.example`, source code, or docs

## 7) CMS connection status behavior

`/admin/content/performance/settings` should:

- show `NOT_CONNECTED` when required GSC config is absent
- show site/property identifier only (non-secret)
- show last success/error summary without credentials

## 8) Troubleshooting

- **Property mismatch**: domain property exists but site URL in CMS points to different host/protocol
- **Service-account access**: service account not granted property access in GSC
- **Delayed data**: Search Console data may lag; do not treat delay as failure immediately
- **Canonical mismatch**: published URL canonical differs from expected `www` host
- **Sitemap discovery issues**: sitemap submitted but URL missing due crawl/indexing delay
