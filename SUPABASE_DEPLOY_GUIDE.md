# NexusGrid — Supabase + Vercel Deployment Guide

## Prerequisites
- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) project (free tier works)

---

## Step 1 — Set Up Supabase Database

1. Go to **[supabase.com](https://supabase.com)** → New Project
2. Navigate to **SQL Editor** → New Query
3. Paste the full contents of **`database_postgres.sql`** and click **Run**
4. This creates all 7 tables + seeds 110 RLHF tasks and default accounts

### Default Accounts (change passwords after deploy!)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nexusgrid.com | admin123 |
| Contributor | alex@example.com | alex123 |
| Contributor | festus@example.com | festus123 |

---

## Step 2 — Get Your Database URL

1. Supabase Dashboard → **Project Settings** → **Database**
2. Scroll to **Connection string** → select **URI** mode
3. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```

---

## Step 3 — Deploy to Vercel

### Option A: Deploy from GitHub (Recommended)
1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Import your `nexusgrid-platform` GitHub repository
3. Framework preset: **Other**
4. Add environment variable:
   - **Key:** `DATABASE_URL`
   - **Value:** your Supabase connection string from Step 2
5. Click **Deploy**

### Option B: Deploy from CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```
When prompted, add `DATABASE_URL` as an environment variable.

---

## Step 4 — Verify Deployment

After deploy, visit:
- `https://your-project.vercel.app/` — Contributor Portal
- `https://your-project.vercel.app/admin` — Admin Panel
- `https://your-project.vercel.app/api?action=tasks` — API health check

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | Supabase PostgreSQL connection URI |

---

## Project Structure

```
├── index.html          # Contributor portal (static)
├── admin.html          # Admin panel (static)
├── app.js              # Contributor JS
├── admin.js            # Admin JS
├── styles.css          # Global styles
├── api/
│   ├── index.js        # Node.js serverless API (all endpoints)
│   └── _db.js          # PostgreSQL pool connection
├── database_postgres.sql  # Full Supabase schema + 110 tasks
├── vercel.json         # Vercel routing config
├── package.json        # Node.js dependencies (pg, bcryptjs)
└── .vercelignore       # Files excluded from deployment
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `DATABASE_URL not set` | Add it in Vercel → Project Settings → Environment Variables |
| `relation "users" does not exist` | Run `database_postgres.sql` in Supabase SQL Editor |
| `SSL connection required` | Already handled — `ssl: { rejectUnauthorized: false }` is set |
| Login fails | Make sure the SQL seed ran and passwords match |
| API returns 500 | Check Vercel function logs: Vercel Dashboard → Deployments → Functions |
