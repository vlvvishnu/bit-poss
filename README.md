# BITE. POS — Setup Guide

## How it works

You push code to GitHub → Cloudflare Pages builds it automatically → live at your URL.
No local setup needed for deployment.

---

## First-time setup

### 1. Push to GitHub

```bash
cd bite-pos
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bite-pos.git
git push -u origin main
```

### 2. Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Pages → Create a project → Connect to Git
3. Select your `bite-pos` repo
4. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**

### 3. Add environment variables

In Cloudflare Pages → your project → Settings → Environment variables, add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `BREVO_API_KEY` | Your Brevo key (optional, for email receipts) |

### 4. Redeploy

After adding env vars: Deployments → click latest → Retry deployment.

---

## Every future update

```bash
git add .
git commit -m "your change"
git push
```

Cloudflare auto-deploys in ~30 seconds. Done.

---

## Local development (optional)

If you want to test locally before pushing:

```bash
# Create .env.local (never commit this file)
echo "VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=your_anon_key" >> .env.local

npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Supabase — where to find your keys

1. Go to [supabase.com](https://supabase.com) → your project
2. Settings → API
3. Copy **Project URL** → `SUPABASE_URL`
4. Copy **anon public** key → `SUPABASE_ANON_KEY`
