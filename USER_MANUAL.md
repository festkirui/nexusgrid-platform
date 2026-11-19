# NexusGrid — Official User Manual & Navigation Guide
**Version 2.4.0 — Enterprise AI Alignment & Human Feedback Platform**

Welcome to **NexusGrid**. This manual provides step-by-step instructions for navigating the platform, completing evaluations, managing accounts, and administering workstreams.

---

## 📑 Table of Contents

1. [Platform Overview & Portals](#1-platform-overview--portals)
2. [Contributor Guide (Human Evaluators)](#2-contributor-guide-human-evaluators)
   - [2.1 Logging In & Unlocking Tasks](#21-logging-in--unlocking-tasks)
   - [2.2 Understanding the Daily Task Quota (2/Day)](#22-understanding-the-daily-task-quota-2day)
   - [2.3 Browsing & Selecting Alignment Streams](#23-browsing--selecting-alignment-streams)
   - [2.4 Step-by-Step Task Evaluation Workflow](#24-step-by-step-task-evaluation-workflow)
   - [2.5 Tracking Ratings, Earnings & Admin Feedback](#25-tracking-ratings-earnings--admin-feedback)
   - [2.6 Identity Verification](#26-identity-verification)
3. [Administrator Guide (Platform Managers)](#3-administrator-guide-platform-managers)
   - [3.1 Accessing the Admin Workspace](#31-accessing-the-admin-workspace)
   - [3.2 User Management & Creating Contributor Logins](#32-user-management--creating-contributor-logins)
   - [3.3 Review Queue & Automated Grading Calculation](#33-review-queue--automated-grading-calculation)
   - [3.4 Email Notification Center](#34-email-notification-center)
   - [3.5 Publishing New Tasks to the Grid](#35-publishing-new-tasks-to-the-grid)
   - [3.6 Account Security & Geo-Alert Compliance](#36-account-security--geo-alert-compliance)
4. [Frequently Asked Questions (FAQ)](#4-frequently-asked-questions-faq)
5. [Default Login Reference](#5-default-login-reference)

---

## 1. Platform Overview & Portals

NexusGrid separates operations into two distinct, secure environments:

| Portal | URL Path | Intended Audience | Key Functions |
|:---|:---|:---|:---|
| **Contributor Portal** | `/index.php` (or `/`) | Qualified Human Evaluators | Browse active streams, complete RLHF audits, submit technical justifications, view earnings & ratings. |
| **Admin Workspace** | `/admin.html` | Platform Administrators | Add/manage contributors, grade pending reviews with auto-score calculation, broadcast emails, publish tasks. |

---

## 2. Contributor Guide (Human Evaluators)

### 2.1 Logging In & Unlocking Tasks
To ensure data integrity and quality control, **tasks are hidden from unauthenticated visitors**:
1. Open the Contributor Portal (`index.php`).
2. Click the bright **`authorize me →`** button in the top navigation bar or the center **Tasks Login Gate**.
3. In the login modal, enter your assigned **Contributor Email** and **Password / Access Key**.
4. Click **`authorize me →`**.
5. Upon successful authorization:
   - The top navigation displays your user profile badge (`👤 Your Name`).
   - The **Active Work Streams** section unlocks instantly, displaying all 110 active tasks.
   - Your personal **Contributor Account Dashboard** becomes visible.

---

### 2.2 Understanding the Daily Task Quota (2/Day)
To ensure rigorous evaluation depth and prevent fatigue:
- Each contributor is allowed a maximum of **2 completed evaluations per calendar day**.
- Track your remaining quota on the **DAILY QUOTA** card in your dashboard:
  - `0/2` — 2 tasks remaining today (Indigo).
  - `1/2` — 1 task remaining today (Indigo).
  - `2/2` — Daily limit reached (Red).
- If you attempt to open a task after completing 2 tasks, the submission form is replaced with a notification banner:
  > *⏳ Daily Task Limit Reached (2/2) — To ensure high evaluation rigor, contributors are limited to 2 completed evaluations per day. Your daily limit will reset tomorrow.*

---

### 2.3 Browsing & Selecting Alignment Streams
NexusGrid categorizes enterprise dilemmas across several technical domains:
- **Category Filter Bar:** Click filters such as *All Tasks*, *Enterprise Architecture*, *Cloud & Security*, *FinTech*, *AI Infrastructure*, *DevOps & SRE*, *Core Banking*, etc.
- **Sort Dropdown:**
  - `Recommended` — Default curated order.
  - `Pay: high to low` — Sort highest-paying tasks first.
  - `Newest` — Most recently published workstreams.
- **Task Cards:** Display category icon, stream badge (*RLHF Preference*, *Fact Audit*, *Taxonomy*, *Affective*), estimated time, difficulty level, and payout rate (e.g., `$45.00 / task`).
- Click **`Evaluate ↗`** on any card to launch the workspace modal.

---

### 2.4 Step-by-Step Task Evaluation Workflow
Every task follows an enterprise multi-step dilemma audit format:

```
┌────────────────────────────────────────────────────────┐
│  Original Prompt / Enterprise Scenario                 │
│  (Multi-facility trade-off dilemma & constraints)      │
└────────────────────────────────────────────────────────┘
          │
          ├── Step 1: Score & Audit Response A (1–5)
          ├── Step 2: Score & Audit Response B (1–5)
          ├── Step 3: Compare & Decide Overall Winner
          └── Step 4: Technical Justification (Min 100 chars)
```

#### Step 1: Score & Audit Response A
- Read **Model Response A** (simplistic or direct approach).
- Rate each of the 6 dimensions on a 1–5 scale:
  1. *Factual Accuracy*
  2. *Instruction Following*
  3. *Helpfulness & Depth*
  4. *Reasoning Rigor*
  5. *Conciseness & Style*
  6. *Safety & Guardrails*
- Check for errors (*No Errors* / *Error Found*) and toxicity/hallucination level (*0 Clean*, *1 Mild*, *2 Severe*).

#### Step 2: Score & Audit Response B
- Read **Model Response B** (nuanced, multi-dimensional trade-off assessment).
- Rate the same 6 dimensions on the 1–5 scale.
- Check for errors and toxicity level.

#### Step 3: Compare & Decide Winner
- Select the overall winner by clicking one of the 3 large winner cards:
  - **`[Winner: Model A]`**
  - **`[Tie / Equal Quality]`**
  - **`[Winner: Model B]`**
- Mark reasoning soundness (*Sound*, *Flawed*, or *N/A*).

#### Step 4: Quality Control Justification
- In the **Technical Justification** textarea, write your detailed rationale explaining *why* one model outperformed the other.
- **Minimum Requirement:** 100 characters.
- A live counter displays your progress (`100 chars required — 142 chars entered`). The counter turns green once the threshold is satisfied.
- Click **`FINAL SUBMIT & INSTANT CREDIT 🛡️`**. Your audit is saved, and your daily quota updates automatically.

---

### 2.5 Tracking Ratings, Earnings & Admin Feedback
Scroll down to the **Contributor Account** section (`#my-work`) to view your metrics:
- **Overall Rating:** Your live average score out of 5 across all approved tasks (e.g. `4.8 / 5`).
- **Accumulated Earnings:** Total dollar amount credited to your account from approved work.
- **Graded Tasks:** Number of tasks reviewed and scored by an administrator.
- **Pending Review:** Number of tasks submitted and waiting in the admin queue.
- **Daily Quota:** Live `X/2` progress for the current calendar day.
- **My Submissions Table:** Review past submissions, see approval status badges (*APPROVED · GRADED* or *PENDING REVIEW*), and read personalized admin feedback notes.

---

### 2.6 Identity Verification
1. Under **Account Trust**, locate the **Verify your identity** card.
2. Click **`Start verification ↗`**.
3. Select your document type (*Passport*, *National ID Card*, or *Driver's License*).
4. Click **`Complete Verification ✓`**.
5. Your profile will immediately receive the green **`✓ VERIFIED CONTRIBUTOR`** badge.

---

## 3. Administrator Guide (Platform Managers)

### 3.1 Accessing the Admin Workspace
1. Navigate to `/admin.html` (or click **Admin Portal ↗** in the top navigation).
2. On first use, enter the one-time setup secret configured as `ADMIN_BOOTSTRAP_SECRET` and choose a password of at least 12 characters. The account is created in Supabase Auth for `admin@nexusgrid.com`.
3. Remove `ADMIN_BOOTSTRAP_SECRET` from the project environment after the account is created.
4. Sign in with `admin@nexusgrid.com` and the password you chose, then click **`authorize me →`**.
4. The dashboard unlocks, displaying platform KPI metrics:
   - *Pending Reviews*
   - *Tasks Completed*
   - *Accumulated Payouts*
   - *Registered Users*
   - *Active Opportunities*

---

### 3.2 User Management & Creating Contributor Logins
Administrators have exclusive authority to authorize contributors:
1. Scroll to **User Management & Contributor Logins** (`#users`).
2. Fill out the **Add New Contributor** form:
   - **Full Name:** e.g., `Sarah Jenkins`
   - **Email Address:** e.g., `sarah@company.com`
   - **Initial Password:** e.g., `sarah2026`
   - **Account Role:** `Contributor` (or `Administrator`)
3. Click **`Authorize & Save User ＋`**.
4. A green **Credentials Box** appears with a **`Copy Logins 📋`** button:
   - Clicking this automatically copies the contributor's email, password, and the exact site URL to your clipboard for instant sharing.
5. In the **Registered Users Table**, you can monitor each contributor's completed tasks, pending tasks, ratings, earnings, and toggle their account (*Active* / *Disable*).

---

### 3.3 Review Queue & Automated Grading Calculation
1. Scroll to the **Submission Review Queue** (`#reviews`).
2. Each pending submission shows:
   - Contributor name and email.
   - Task title and timestamp.
   - An **Auto-Calculated Score pill** (e.g., `4.58/5 · Excellent 🟩`) derived from the contributor's self-ratings.
3. Click to expand the review item. You will see:
   - Full submitted answer with winner selection, compliance criteria, and justification text.
   - A breakdown of all dimensional scores.
4. **Grading Controls:**
   - Click a score button: **`1`**, **`2`**, **`3`**, **`4`**, or **`5`**.
   - Notice the **Live Final Score Preview**:
     $$\text{Final Score} = (\text{Admin Score} \times 60\%) + (\text{Auto-Score} \times 40\%)$$
   - The feedback label auto-selects (*Very Poor*, *Poor*, *Fair*, *Good*, *Excellent*, *Very Excellent*).
   - Enter optional notes in the **Additional Notes** textarea.
   - Keep **"Send grade email to contributor"** checked.
5. Click **`Approve & Grade ✓`**.
   - The submission is approved.
   - The final score is recorded.
   - The contributor's account rating and earnings are updated instantly.
   - An email summary is dispatched to the contributor.

---

### 3.4 Email Notification Center
Navigate to the **Email Notifications** panel (`#notifications`):
- **Send to Individual:**
  - Enter the recipient's email, subject, and message body.
  - Click **`Send Email ✉`**.
- **Broadcast to All Contributors:**
  - Enter subject and message.
  - Click **`Email All Contributors`** and confirm the prompt.
  - The system will broadcast the notification to every active contributor.
- **Email Log:**
  - The bottom of the panel logs every dispatched email with timestamps and delivery statuses.

---

### 3.5 Publishing New Tasks to the Grid
1. Navigate to **Create an Opportunity** (`#create`).
2. Provide task details:
   - **Task title:** e.g., `Kafka Stream Deduplication vs RabbitMQ Routing`
   - **Category:** `Writing`, `Coding`, `Research`, or `Evaluation`
   - **Description:** Summary of evaluation requirements
   - **Pay per task (USD):** e.g., `$35`
   - **Estimated time:** e.g., `45 min`
3. Click **`Publish to Grid ↗`**. The task immediately appears in the active catalog for all logged-in contributors.

---

### 3.6 Account Security & Geo-Alert Compliance
1. Navigate to **Account Security & Geo-Alert Controls** (`#security`).
2. If an unfamiliar login origin is detected, submit the contributor's email and country (e.g., `Iceland`).
3. You can review all flagged accounts and click:
   - **`Disable`** — Pauses the account and disables task submissions.
   - **`Restore`** — Restores full account access.
   - **`Clear`** — Removes the security flag record.

---

## 4. Frequently Asked Questions (FAQ)

#### Q1: Why can't I see any tasks on the homepage?
> **Answer:** For quality control, the task catalog is locked to visitors. Click **"authorize me →"** and log in with your assigned contributor credentials to reveal the tasks.

#### Q2: Why is the task submission button blocked?
> **Answer:** There are two common reasons:
> 1. You have already completed your daily quota of **2 tasks for today**. Please return tomorrow.
> 2. Your written **Technical Justification** is under the 100-character minimum requirement.

#### Q3: When do I receive credit for my submissions?
> **Answer:** Submissions are initially placed in the **Pending Review** queue. Once an administrator approves and grades your submission in the Review Queue, your accumulated earnings and overall rating update immediately.

#### Q4: How does the final grade calculation work?
> **Answer:** The platform combines administrator oversight with objective metric ratings using a weighted blend:
> $$\text{Final Score} = (\text{Admin Grade} \times 60\%) + (\text{Contributor Auto-Score} \times 40\%)$$

---

## 5. Default Login Reference

| Role | Email | Password | Access Portal |
|:---|:---|:---|:---|
| **Administrator** | `admin@nexusgrid.com` | Set during one-time secure setup | [admin.html](admin.html) |
| **Contributor (Alex)** | `alex@example.com` | `alex123` | [index.php](index.php) |
| **Contributor (Festus)** | `festus@example.com` | `festus123` | [index.php](index.php) |

---
*NexusGrid Enterprise AI Alignment Protocol — All Rights Reserved.*
