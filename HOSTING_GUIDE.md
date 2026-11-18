# NexusGrid — Production Hosting & Deployment Guide

This guide explains how to host NexusGrid on any standard web hosting provider (cPanel, Shared Hosting, Cloud VPS, Ubuntu/Debian Apache, or Nginx).

---

## 📋 System Requirements

- **PHP Version:** PHP 8.0, 8.1, 8.2, 8.3, or 8.4
- **PHP Extensions:** `pdo_mysql`, `json`, `mbstring` (all enabled by default on standard hosts)
- **Database:** MySQL 5.7+ / 8.0+ or MariaDB 10.3+
- **Web Server:** Apache (with `mod_rewrite` & `mod_headers`) or Nginx

---

## 🚀 Quick Deployment in 3 Steps

### Step 1: Upload Files
Upload the contents of this repository to your web server root (e.g. `public_html/` on cPanel, or `/var/www/html/` on Ubuntu).

### Step 2: Import the Database
1. Open your hosting database manager (e.g., **phpMyAdmin** in cPanel).
2. Create a new database (e.g., `nexusgrid_db`).
3. Click **Import** and select `database.sql` (or `schema.sql`) located in this directory.
4. Execute the import. This will create all required tables and automatically seed:
   - **110 RLHF enterprise dilemma tasks**
   - **Pre-seeded administrator & contributor accounts**
   - **Active AI alignment workstreams and qualification protocols**

### Step 3: Configure Database Credentials
1. In your site root directory, copy `config.sample.php` to `config.php`:
   ```bash
   cp config.sample.php config.php
   ```
2. Open `config.php` and enter your database credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_PORT', '3306');
   define('DB_NAME', 'your_cpanel_dbname');
   define('DB_USER', 'your_cpanel_dbuser');
   define('DB_PASS', 'your_strong_password');
   ```
3. Save the file. NexusGrid is now live and fully operational!

---

## 🔑 Default Credentials

| Portal | URL Path | Email | Password | Role |
|:---|:---|:---|:---|:---|
| **Admin Workspace** | `/admin.php` | `admin@nexusgrid.com` | `admin123` | Administrator |
| **Contributor Portal** | `/index.php` (or `/`) | `alex@example.com` | `alex123` | Contributor |
| **Contributor Portal** | `/index.php` (or `/`) | `festus@example.com` | `festus123` | Contributor |

> **Security Tip:** Immediately after hosting, log in as `admin@nexusgrid.com`, go to **Users & Logins**, and update passwords or add your own administrative account.

---

## ✉️ Email Notifications Setup

NexusGrid includes automatic grading notification emails and a broadcast tool for contributors.
- **Shared Hosting / cPanel:** PHP's built-in `mail()` function works out-of-the-box.
- To customize the sender address, update `MAIL_FROM` in `config.php`:
  ```php
  define('MAIL_FROM', 'noreply@yourdomain.com');
  define('MAIL_FROM_NAME', 'NexusGrid Admin');
  define('MAIL_REPLY_TO', 'support@yourdomain.com');
  ```

---

## 🔒 Security Features Included

- **Protected Sensitive Files:** `.htaccess` automatically denies public access to `database.sql`, `schema.sql`, `config.php`, `.env`, and backup files.
- **Directory Browsing Disabled:** `Options -Indexes` prevents directory listings.
- **HTTP Security Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.
- **Prepared Statements (PDO):** Complete protection against SQL injection attacks.
- **Bcrypt Password Hashing:** User passwords are encrypted with `PASSWORD_DEFAULT` (bcrypt).
- **Authentication Gating:** Task catalog and opportunity cards are strictly hidden from visitors until authenticated.
- **Daily Contributor Quota:** Server-side rate limit enforces a maximum of 2 task submissions per contributor per day.

---

## 🌐 Local Development (WampServer / XAMPP)

No `config.php` is required for local development. By default, NexusGrid connects to:
- **Host:** `127.0.0.1:3306`
- **Database:** `givegrid`
- **User:** `root`
- **Password:** *(empty)*
