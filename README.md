# NexusGrid — RLHF Contributor Platform

A full-stack RLHF (Reinforcement Learning from Human Feedback) contributor platform built with PHP, MySQL/PostgreSQL, and vanilla JavaScript.

---

## 🚀 Features

- **Contributor Portal** — Task browsing, submission, earnings dashboard
- **Admin Panel** — Full user management, submission review, analytics, security controls
- **Dual-Database** — Auto-detects PostgreSQL (Vercel/Neon/Supabase) or falls back to MySQL (local WampServer/XAMPP)
- **110 RLHF Tasks** across Writing, Coding, Analysis, QA, and Annotation categories
- **Vercel Serverless** — Deployable to Vercel with PostgreSQL in minutes

---

## 📂 Project Structure

```
├── index.php              # Contributor portal
├── admin.html              # Admin panel
├── api.php                # REST API (dual-DB compatible)
├── db.php                 # DB connection (PostgreSQL + MySQL auto-detect)
├── styles.css             # Global styles
├── app.js                 # Contributor JS
├── admin.js               # Admin JS
├── database.sql           # MySQL schema + seed (110 tasks)
├── database_postgres.sql  # PostgreSQL schema + seed (110 tasks)
├── schema.sql             # MySQL schema only
├── schema_postgres.sql    # PostgreSQL schema only
├── vercel.json            # Vercel deployment config
├── config.sample.php      # Environment config template
├── VERCEL_POSTGRES_GUIDE.md  # Vercel deploy guide
├── HOSTING_GUIDE.md       # General hosting guide
└── USER_MANUAL.md         # End-user manual
```

---

## ⚡ Quick Start

### Local (MySQL / WampServer)

1. Clone the repo and place in your web root (e.g. `C:\wamp64\www\nexusgrid\`)
2. Import `database.sql` into MySQL
3. Copy `config.sample.php` → `config.php` and fill in your DB credentials
4. Visit `http://localhost/nexusgrid/`

### Cloud (Vercel + PostgreSQL)

See **[VERCEL_POSTGRES_GUIDE.md](VERCEL_POSTGRES_GUIDE.md)** for the full step-by-step guide.

---

## 🔐 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@nexusgrid.com | Choose during one-time secure setup at `/admin.html` |
| Contributor | alex@example.com | alex123 |
| Contributor | festus@example.com | festus123 |

> Configure `ADMIN_BOOTSTRAP_SECRET` with a random value of at least 32 characters. Create the administrator once at `/admin.html`, set a password of at least 12 characters, and remove the bootstrap secret from the environment afterward.

---

## 🛠️ Tech Stack

- **Backend:** PHP 8.3, PDO (MySQL + PostgreSQL)
- **Frontend:** Vanilla JavaScript, CSS3
- **Database:** PostgreSQL (cloud) / MySQL 8 (local)
- **Deployment:** Vercel Serverless (`@vercel/php@0.7.1`)

---

## 📄 License

MIT
