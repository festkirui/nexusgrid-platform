# GiveGrid — PHP 8.3 & Laragon MySQL Edition

A high-fidelity clone of [GiveGrid](https://givegrid.vercel.app/) with separate **User/Contributor Portal** and **Administrator Dashboard** pages, powered by **PHP 8.3** and **MySQL in Laragon**.

---

## 🌐 Separate Pages Overview

| Page | URL | Description |
|---|---|---|
| **Contributor / User Page** | **[http://localhost/givegrid/](http://localhost/givegrid/)** (`index.php`) | Browse opportunities, submit responses, view accumulated earnings, track contributor account & ratings. Protected by **"authorize me"** login. |
| **Admin Portal Page** | **[http://localhost/givegrid/admin.php](http://localhost/givegrid/admin.php)** (`admin.php`) | Dedicated admin control center: add users & assign logins, monitor completed tasks count & accumulated money per user, review & grade submissions (1–5), publish new opportunities, and manage account security. |

---

## 🔑 Pre-Seeded Logins for Testing

| Portal | Email | Password | Role |
|---|---|---|---|
| **Admin Portal** | `admin@givegrid.com` | `admin123` | Administrator |
| **User Portal** | `alex@example.com` | `alex123` | Contributor |
| **User Portal** | `festus@example.com` | `festus123` | Contributor |

*(Admins can also add new contributors from `admin.php` and instantly copy generated logins to give to them!)*

## 📊 User Task & Earnings Tracking

- **Tasks Done:** Aggregated per user from approved submissions (`COUNT(CASE WHEN status = 'approved')`). Also displays pending task count.
- **Accumulated Money:** Exact sum of pay rates for each user's approved tasks (`SUM(pay)`), rendered in neon mint (`$XX.XX`) in both the Admin User Management table and the Contributor Rating metrics card.
- **Platform Total Payouts:** Real-time KPI counter on `admin.php` calculating the sum of earnings across all contributors.

---

## 🗄️ Laragon Database Configuration

- **Database:** `givegrid`
- **Host:** `127.0.0.1` (Port `3306`)
- **Username:** `root`
- **Password:** *(empty)*

### Tables in MySQL:
1. `users` — Administrator & Contributor login credentials with secure password hashes.
2. `tasks` — 100+ opportunity tasks across Writing, Coding, Research, and Evaluation.
3. `submissions` — Contributor task responses, statuses, grades (1–5), and admin feedback.
4. `account_controls` — Geo-alert flags and account status gating (`active`, `disabled`).
5. `verified_contributors` — Identity check verification records.

---

## 📁 File Structure

```
givegrid-php/ (linked to C:\laragon\www\givegrid)
├── index.php      # User / Contributor portal page
├── app.js         # User page controller & API integration
├── admin.php      # Standalone Administrator workspace page
├── admin.js       # Admin portal controller (users, reviews, tasks, security)
├── db.php         # PDO MySQL connection & database seeding
├── api.php        # Unified JSON REST API controller
├── styles.css     # Futuristic dark UI styling & animations
├── schema.sql     # MySQL database schema definition
└── README.md      # Project documentation
```
