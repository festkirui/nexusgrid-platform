<?php
/**
 * GiveGrid - Dedicated Administrator Dashboard & Portal
 * Powered by PHP 8.3 & Laragon MySQL
 */
require_once __DIR__ . '/db.php';
initAndSeedDatabase();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090d12">
  <title>Admin Workspace — GiveGrid</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script src="admin.js" defer></script>
</head>
<body class="admin-page">
  <!-- Admin Navigation Topbar -->
  <header class="topbar">
    <a class="brand" href="admin.php" aria-label="GiveGrid Admin">
      <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
      <span>give<span class="brand-light">grid</span> <small style="font-size:11px; font-weight:600; color:var(--mint); margin-left:6px; letter-spacing:1px; font-family:var(--mono);">[ADMIN]</small></span>
    </a>
    <nav class="main-nav" aria-label="Admin navigation">
      <a href="#users">Users &amp; Logins</a>
      <a href="#reviews">Submission Review</a>
      <a href="#create">Create Task</a>
      <a href="#security">Account Security</a>
      <a href="index.php" style="color:var(--mint);">Contributor Portal ↗</a>
    </nav>
    <div class="nav-actions">
      <div id="adminUserBadge" class="user-logged-badge" style="display:none;">
        <span id="adminNameDisplay">👤 Admin</span>
        <button class="text-button" id="adminLogoutBtn" style="color:#ff8787;">Log out</button>
      </div>
      <button class="button button-small button-bright" id="adminLoginBtn">authorize me <span>→</span></button>
    </div>
  </header>

  <main style="max-width:1240px; margin:0 auto; padding:40px 6% 80px;">
    <!-- Admin Authentication Gate (Visible when not logged in as Admin) -->
    <div id="adminAuthGate" class="auth-gate-box" style="margin-top:40px; padding:45px 30px;">
      <div class="eyebrow"><span class="pulse"></span> RESTRICTED ACCESS</div>
      <h2>Administrator Authorization Required</h2>
      <p>This portal is reserved for GiveGrid platform administrators to manage users, review contributor submissions, and publish opportunities.</p>
      
      <form id="adminLoginForm" style="width:min(420px, 100%); margin-top:20px; display:grid; gap:14px; text-align:left;">
        <label style="font-size:10px; color:#aebbb5; display:grid; gap:6px;">Administrator Email
          <input type="email" id="adminEmailInput" required placeholder="admin@givegrid.com" style="width:100%; padding:10px 12px; background:#0b1115; border:1px solid #354047; color:#fff; border-radius:3px;">
        </label>
        <label style="font-size:10px; color:#aebbb5; display:grid; gap:6px;">Password
          <input type="password" id="adminPasswordInput" required placeholder="Administrator password" style="width:100%; padding:10px 12px; background:#0b1115; border:1px solid #354047; color:#fff; border-radius:3px;">
        </label>
        <button class="button button-bright" type="submit" id="adminSubmitAuthBtn" style="margin-top:6px;">authorize me <span>→</span></button>
      </form>
      <div style="font-size:10px; color:#7d9188; margin-top:16px; border-top:1px solid #283731; padding-top:12px;">
        <b>Default Admin Login (Laragon MySQL):</b> <code>admin@givegrid.com</code> / <code>admin123</code>
      </div>
    </div>

    <!-- Protected Admin Dashboard (Visible only to authorized Admins) -->
    <div id="adminDashboardContent" style="display:none;">
      <!-- Dashboard Heading & Stats Overview -->
      <div class="workspace-heading" style="margin-top:20px;">
        <div>
          <div class="eyebrow"><span class="eyebrow-mark">01 /</span> CONTROL CENTER</div>
          <h2>Admin Workspace</h2>
        </div>
        <p>Manage contributor logins, grade pending responses, publish tasks, and monitor platform security in Laragon MySQL.</p>
      </div>

      <!-- KPI Summary Cards -->
      <div class="rating-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom:30px;">
        <article class="rating-card rating-main">
          <small>PENDING REVIEWS</small>
          <strong id="kpiPendingCount">0</strong>
          <p>Awaiting admin grading</p>
        </article>
        <article class="rating-card">
          <small>REGISTERED USERS</small>
          <strong id="kpiUserCount">0</strong>
          <p>Contributors &amp; Admins</p>
        </article>
        <article class="rating-card">
          <small>ACTIVE OPPORTUNITIES</small>
          <strong id="kpiTaskCount">0</strong>
          <p>Published on grid</p>
        </article>
        <article class="rating-card">
          <small>SECURITY ALERTS</small>
          <strong id="kpiSecurityCount">0</strong>
          <p>Flagged / Paused</p>
        </article>
      </div>

      <!-- Section: User Management & Contributor Logins -->
      <div class="user-management-panel" id="users">
        <div class="admin-title">
          <span class="admin-icon">👥</span>
          <div>
            <h3>User Management &amp; Contributor Logins</h3>
            <small>Add new users to the database and assign login credentials to give them account access.</small>
          </div>
        </div>
        
        <div class="user-admin-grid">
          <!-- Add User Form -->
          <form id="addUserForm" class="admin-create">
            <div class="admin-title" style="margin-bottom:12px;">
              <span class="admin-icon" style="width:24px; height:24px; font-size:14px;">＋</span>
              <div>
                <h4 style="margin:0; font-size:13px;">Add New Contributor</h4>
                <small>Create user credentials</small>
              </div>
            </div>
            <label>Full Name
              <input name="name" id="newUserName" required maxlength="100" placeholder="e.g. Maya Chen">
            </label>
            <label>Email Address (Login Username)
              <input name="email" id="newUserEmail" type="email" required maxlength="160" placeholder="contributor@example.com">
            </label>
            <label>Initial Password / Access Key
              <input name="password" id="newUserPassword" required minlength="4" maxlength="80" placeholder="e.g. contributor123">
            </label>
            <label>Account Role
              <select name="role" id="newUserRole">
                <option value="contributor">Contributor (Access tasks, account &amp; rating)</option>
                <option value="admin">Administrator (Full administrative access)</option>
              </select>
            </label>
            <button class="button button-bright" type="submit">Authorize &amp; Save User <span>＋</span></button>
          </form>

          <!-- Users List & Credentials Display -->
          <div>
            <!-- Credentials Sharing Callout -->
            <div id="newCredentialsBox" class="credentials-box">
              <h4>✓ Contributor Account Authorized</h4>
              <p>Give these logins to the contributor to access their account:</p>
              <p><strong>Email:</strong> <span id="credEmail" style="color:var(--mint);"></span></p>
              <p><strong>Password:</strong> <span id="credPass" style="color:var(--mint);"></span></p>
              <p><strong>Role:</strong> <span id="credRole" style="color:#dbe4df;"></span></p>
              <button type="button" id="copyCredBtn">Copy Logins 📋</button>
            </div>

            <div class="user-table-wrap">
              <table class="user-table">
                <thead>
                  <tr>
                    <th>NAME &amp; EMAIL</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody id="userTableBody">
                  <!-- Loaded dynamically via admin.js -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Submissions Review & Opportunity Creation -->
      <div class="admin-grid" style="margin-top:25px;" id="reviews">
        <!-- Review Panel -->
        <div class="review-panel">
          <div class="admin-title">
            <span class="admin-icon">✓</span>
            <div>
              <h3>Submission Review Queue</h3>
              <small id="reviewCount">No submissions waiting</small>
            </div>
          </div>
          <div id="reviewQueue" class="review-queue"></div>
        </div>

        <!-- Create Task Form -->
        <form class="admin-create" id="taskForm" style="align-self:start;">
          <div class="admin-title">
            <span class="admin-icon">＋</span>
            <div>
              <h3 id="create">Create an Opportunity</h3>
              <small>New tasks appear in the public catalog instantly.</small>
            </div>
          </div>
          <label>Task title
            <input name="title" required maxlength="90" placeholder="e.g. Review an AI model explanation">
          </label>
          <label>Category
            <select name="category">
              <option value="Writing">Writing</option>
              <option value="Coding">Coding</option>
              <option value="Research">Research</option>
              <option value="Evaluation">Evaluation</option>
            </select>
          </label>
          <label>Task description
            <textarea name="description" required maxlength="400" rows="3" placeholder="What will the contributor do?"></textarea>
          </label>
          <div class="form-row">
            <label>Pay per task (USD)
              <input name="pay" type="number" min="1" max="1000" value="25" required>
            </label>
            <label>Estimated time
              <input name="time" maxlength="20" value="30 min" required>
            </label>
          </div>
          <button class="button button-bright" type="submit">Publish to Grid <span>↗</span></button>
        </form>
      </div>

      <!-- Section: Account Security & Geo-Alerts -->
      <div class="security-panel" id="security" style="margin-top:25px;">
        <div class="admin-title">
          <span class="admin-icon">⌑</span>
          <div>
            <h3>Account Security &amp; Geo-Alert Controls</h3>
            <small>Record an unfamiliar-country alert and manage contributor access in MySQL.</small>
          </div>
        </div>
        <form id="securityFlagForm" class="security-flag-form">
          <label>Contributor email
            <input name="email" type="email" required maxlength="160" placeholder="person@example.com">
          </label>
          <label>Country in security alert
            <input name="country" required maxlength="80" placeholder="e.g. Switzerland">
          </label>
          <button class="button button-outline" type="submit">Flag for review <span>⚑</span></button>
        </form>
        <div id="securityAccounts" class="security-accounts"></div>
      </div>
    </div>
  </main>

  <footer class="footer">
    <a class="brand" href="admin.php">
      <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
      <span>give<span class="brand-light">grid</span></span>
    </a>
    <p>Administrative Control Panel · Powered by PHP &amp; Laragon MySQL.</p>
    <div class="footer-links">
      <a href="index.php">View Public Contributor Grid ↗</a>
      <a href="#users">Users</a>
      <a href="#reviews">Reviews</a>
      <a href="#create">Create Task</a>
    </div>
    <small>© 2026 GiveGrid Admin Workspace.</small>
  </footer>

  <!-- Floating Toast Notification -->
  <div class="toast" id="toast" role="status"></div>
</body>
</html>
