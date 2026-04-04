# Deployment

## Deploy to Cloudflare Pages

### 1) Create the Pages project
1. In Cloudflare Dashboard → **Workers & Pages** → **Pages** → **Create a project**.
2. Connect this GitHub repo.

Use these build settings:
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`

> This repo includes `public/_redirects` so React Router deep-links (e.g. `/login`) work on Pages.

### 2) Set required environment variables
In the Pages project → **Settings** → **Environment variables**, add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are consumed in `src/config/supabase.ts` via `import.meta.env`.

### 3) (Optional) Set up portal subdomains
This app chooses the portal based on hostname (`driver.*`, `manager.*`, `admin.*`).

In Pages → **Custom domains**, add one of:
- Separate domains: `driver.yourdomain.com`, `manager.yourdomain.com`, `admin.yourdomain.com`, `yourdomain.com`
- Or a wildcard: `*.yourdomain.com` (plus `yourdomain.com`)

Point the DNS records to Cloudflare Pages when prompted.
