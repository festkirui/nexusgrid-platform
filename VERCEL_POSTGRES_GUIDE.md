# Deploying NexusGrid on Vercel with PostgreSQL

This guide explains how to host NexusGrid on **Vercel** with a cloud **PostgreSQL** database (Vercel Postgres, Neon, or Supabase).

---

## 🏗️ Architecture on Vercel

```
┌────────────────────────────────────────────────────────┐
│                   Vercel Platform                      │
│                                                        │
│  ├── /index.php   → Serverless Contributor Portal      │
│  ├── /admin.php   → Serverless Admin Workspace         │
│  ├── /api.php     → Serverless JSON REST API           │
│  └── /styles.css  → Global CDN Edge Static Assets      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (Secure SSL Connection via PDO pgsql)
┌────────────────────────────────────────────────────────┐
│             Cloud PostgreSQL Database                  │
│       (Vercel Postgres / Neon / Supabase)              │
│                                                        │
│  ├── 110 RLHF Enterprise Dilemma Workstreams           │
│  ├── User Authentication & Administrator Accounts      │
│  └── Submissions, Auto-Scores & Security Controls      │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Create a PostgreSQL Database

You can use any cloud PostgreSQL service. Here are the two easiest options:

#### Option A: Vercel Postgres (Powered by Neon) — Recommended
1. Log in to [vercel.com](https://vercel.com/) and go to your dashboard.
2. Click the **Storage** tab at the top.
3. Click **Create Database** and select **Postgres (Neon)**.
4. Choose a database name (e.g., `nexusgrid-db`) and select your region.
5. Click **Create**.
6. When created, go to the **Quickstart** / **.env.local** tab and copy your `POSTGRES_URL`:
   ```
   postgres://default:xxxxxxxx@ep-xxxx-xxxx.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require
   ```

#### Option B: Neon.tech (Free Cloud Serverless Postgres)
1. Go to [neon.tech](https://neon.tech/) and sign up for free.
2. Create a new project named `nexusgrid`.
3. In the project dashboard, copy the **Connection string** (select `psql` or `Pooled connection`).

#### Option C: Supabase (Free Managed Postgres)
1. Go to [supabase.com](https://supabase.com/) and create a free project.
2. Go to **Project Settings** -> **Database** -> **Connection string** -> **URI**.

---

### Step 2: Initialize Database with All 110 Tasks

NexusGrid includes a ready-to-run PostgreSQL seed file: **`database_postgres.sql`**.

1. In your **Vercel Postgres**, **Neon**, or **Supabase** dashboard, click **SQL Editor** / **Query Console**.
2. Open the file `database_postgres.sql` in this directory.
3. Copy its entire content, paste it into the SQL Editor, and click **Run** / **Execute**.
4. This instantly creates all 7 tables and seeds:
   - ✅ **All 110 RLHF enterprise dilemma workstreams**
   - ✅ **Default Administrator:** `admin@nexusgrid.com` / `admin123`
   - ✅ **Default Contributors:** `alex@example.com` / `alex123` & `festus@example.com` / `festus123`
   - ✅ **All alignment streams & compliance protocols**

---

### Step 3: Connect & Deploy on Vercel

#### Method 1: Deploy via GitHub (Recommended)
1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "NexusGrid PostgreSQL Vercel Edition"
   git branch -M main
   git remote add origin https://github.com/your-username/nexusgrid.git
   git push -u origin main
   ```
2. In the Vercel Dashboard, click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. If you created a Vercel Postgres database in Step 1:
   - Click the **Storage** tab on your project page and click **Connect Store** -> select your Postgres database.
   - Vercel will automatically link `POSTGRES_URL` to your project!
5. If using Neon or Supabase:
   - Go to **Environment Variables** in Vercel Project Settings.
   - Add:
     - **Key:** `POSTGRES_URL` (or `DATABASE_URL`)
     - **Value:** *[Your PostgreSQL connection string]*
6. Click **Deploy**.

#### Method 2: Deploy via Vercel CLI
If you have Vercel CLI installed:
```bash
npm install -g vercel
vercel login
vercel --prod
```
When prompted, select your project and link your Postgres database.

---

## ⚙️ Environment Variables Reference for Vercel

| Variable | Description | Example / Default |
|:---|:---|:---|
| `POSTGRES_URL` | Cloud Postgres connection string | `postgres://user:pass@ep-xxxx.postgres.vercel-storage.com:5432/verceldb?sslmode=require` |
| `DATABASE_URL` | Alternative Postgres connection string | *Same as POSTGRES_URL* |
| `DB_CONNECTION` | Database engine | `pgsql` |
| `APP_ENV` | Environment type | `production` |
| `APP_DEBUG` | Path disclosure guard | `false` |
| `MAIL_FROM` | Sender address for grade emails | `noreply@yourdomain.com` |

---

## 🔑 Default Portal Logins

Once deployed on Vercel, access your site at `https://your-project.vercel.app/`:

| Portal | URL Path | Login Email | Login Password | Role |
|:---|:---|:---|:---|:---|
| **Admin Workspace** | `/admin.php` | `admin@nexusgrid.com` | `admin123` | Administrator |
| **Contributor Portal** | `/index.php` (or `/`) | `alex@example.com` | `alex123` | Contributor |
| **Contributor Portal** | `/index.php` (or `/`) | `festus@example.com` | `festus123` | Contributor |

---

## 🔄 Dual Database Engine Compatibility

NexusGrid automatically detects the database connection:
- When `POSTGRES_URL` or `DB_CONNECTION=pgsql` is detected, it connects via **PostgreSQL (PDO pgsql)**.
- When running locally without PostgreSQL variables, it connects via **MySQL (PDO mysql)**.
- Both engines use the same application logic, 110 enterprise dilemma tasks, and auto-score grading formulas.
