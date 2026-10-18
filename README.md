# GiveGrid — PHP 8.3 & Laragon MySQL Edition

A high-fidelity clone of [GiveGrid](https://givegrid.vercel.app/) powered by **PHP 8.3** and **MySQL in Laragon**.

---

## 🚀 Live Access via Laragon

With Laragon running (Apache + MySQL):
- **Local URL:** [http://localhost/givegrid/](http://localhost/givegrid/)
- **Virtual Host (if enabled in Laragon):** `http://givegrid.test/`

---

## 🗄️ Laragon Database Configuration

- **Database Name:** `givegrid`
- **Host:** `127.0.0.1` (Port `3306`)
- **Username:** `root`
- **Password:** *(empty)*

### Tables Created:
1. `tasks` — 100+ opportunity tasks with category, pay, level, time, and tag.
2. `submissions` — Contributor answers, statuses (`pending`, `approved`, `rejected`), scores, and admin feedback.
3. `account_controls` — Security country alerts and status gating (`active`, `flagged`, `disabled`).
4. `verified_contributors` — Identity check verification records with document types.

---

## 📁 File Structure

```
givegrid-php/ (linked to C:\laragon\www\givegrid)
├── db.php         # PDO MySQL connection & auto-seeding engine
├── api.php        # JSON REST API controller for all features
├── index.php      # Main responsive GiveGrid frontend
├── styles.css     # Dark futuristic styling & animations
├── app.js         # Client-side API integration & UI state
├── schema.sql     # MySQL database schema definition
└── README.md      # Project documentation
```

---

## 🔌 API Endpoints (`api.php`)

| Endpoint | Method | Description |
|---|---|---|
| `api.php?action=tasks` | GET | Retrieve tasks with sorting & filtering |
| `api.php?action=create_task` | POST | Publish a new task opportunity |
| `api.php?action=submissions` | GET | Retrieve submissions (`email`, `status`) |
| `api.php?action=create_submission` | POST | Submit response for review |
| `api.php?action=grade` | POST | Approve & grade a submission (1-5 score) |
| `api.php?action=account` | GET | Contributor stats, rating & verification |
| `api.php?action=verify` | POST | Simulate identity verification |
| `api.php?action=security` | GET | List security-flagged accounts |
| `api.php?action=security_flag` | POST | Record unfamiliar country alert |
| `api.php?action=security_action` | POST | Disable, restore, or clear account |
