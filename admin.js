// GiveGrid Admin Workspace Controller (admin.js)
// Dedicated logic for admin.php connecting with api.php & Laragon MySQL

let adminAuthToken = localStorage.getItem('givegrid_auth_token') || null;
let currentAdminUser = null;
try {
  currentAdminUser = JSON.parse(localStorage.getItem('givegrid_auth_user'));
} catch (e) {
  currentAdminUser = null;
}

const toast = document.querySelector('#toast');
let toastTimer;

// Escape HTML helper
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// Toast Notification
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// -----------------------------------------------------------------------------
// ADMIN AUTHENTICATION
// -----------------------------------------------------------------------------

function updateAdminUI() {
  const gate = document.querySelector('#adminAuthGate');
  const dashboard = document.querySelector('#adminDashboardContent');
  const userBadge = document.querySelector('#adminUserBadge');
  const loginBtn = document.querySelector('#adminLoginBtn');
  const nameDisplay = document.querySelector('#adminNameDisplay');

  // Verify that user is an admin
  const isAdmin = currentAdminUser && adminAuthToken && currentAdminUser.role === 'admin';

  if (isAdmin) {
    if (gate) gate.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    if (userBadge) userBadge.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';
    if (nameDisplay) nameDisplay.textContent = `👤 ${currentAdminUser.name}`;
    loadAdminData();
  } else {
    if (gate) gate.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-flex';
  }
}

// Admin Login Form ("authorize me" button)
const adminLoginForm = document.querySelector('#adminLoginForm');
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.querySelector('#adminEmailInput').value.trim();
    const password = document.querySelector('#adminPasswordInput').value;
    const submitBtn = document.querySelector('#adminSubmitAuthBtn');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'authorizing...';
    }

    try {
      const res = await fetch('api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Authorization failed.');
        return;
      }

      if (data.user.role !== 'admin') {
        showToast('Access denied: this account does not have administrator privileges.');
        return;
      }

      adminAuthToken = data.token;
      currentAdminUser = data.user;
      localStorage.setItem('givegrid_auth_token', adminAuthToken);
      localStorage.setItem('givegrid_auth_user', JSON.stringify(currentAdminUser));

      updateAdminUI();
      showToast(`Welcome Administrator, ${data.user.name}!`);
    } catch (err) {
      console.error(err);
      showToast('Error communicating with database.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'authorize me <span>→</span>';
      }
    }
  });
}

// Admin Logout
document.querySelector('#adminLogoutBtn')?.addEventListener('click', async () => {
  try {
    if (adminAuthToken) {
      await fetch(`api.php?action=logout&token=${encodeURIComponent(adminAuthToken)}`);
    }
  } catch (e) {}

  adminAuthToken = null;
  currentAdminUser = null;
  localStorage.removeItem('givegrid_auth_token');
  localStorage.removeItem('givegrid_auth_user');

  updateAdminUI();
  showToast('Admin logged out.');
});

document.querySelector('#adminLoginBtn')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelector('#adminEmailInput')?.focus();
});

// -----------------------------------------------------------------------------
// LOAD ALL ADMIN DATA
// -----------------------------------------------------------------------------

async function loadAdminData() {
  try {
    const [subRes, secRes, userRes, taskRes] = await Promise.all([
      fetch('api.php?action=submissions&status=pending'),
      fetch('api.php?action=security'),
      fetch('api.php?action=admin_list_users'),
      fetch('api.php?action=tasks')
    ]);

    const pending = await subRes.json();
    const securityAccounts = await secRes.json();
    const users = await userRes.json();
    const taskData = await taskRes.json();

    // 1. KPI Counters
    document.querySelector('#kpiPendingCount').textContent = pending.length || 0;
    document.querySelector('#kpiUserCount').textContent = Array.isArray(users) ? users.length : 0;
    document.querySelector('#kpiTaskCount').textContent = taskData.total || 0;
    document.querySelector('#kpiSecurityCount').textContent = Object.keys(securityAccounts || {}).length;

    // 2. Review Queue
    const reviewCountEl = document.querySelector('#reviewCount');
    if (reviewCountEl) {
      reviewCountEl.textContent = pending.length ? `${pending.length} submission${pending.length === 1 ? '' : 's'} waiting for review` : 'No submissions waiting';
    }

    const queueEl = document.querySelector('#reviewQueue');
    if (queueEl) {
      if (pending.length === 0) {
        queueEl.innerHTML = '<p class="empty-state">New task submissions will appear here for review.</p>';
      } else {
        queueEl.innerHTML = pending.map(item => `
          <details class="review-item">
            <summary>
              <span>
                <b>${escapeHtml(item.taskTitle)}</b>
                <small>${escapeHtml(item.name)} · ${escapeHtml(item.email)}</small>
              </span>
              <i>REVIEW</i>
            </summary>
            <div class="review-body">
              <div class="submitted-answer">${escapeHtml(item.response).replace(/\n/g, '<br>')}</div>
              <form class="grade-form" data-submission="${escapeHtml(item.id)}">
                <label>Grade
                  <select name="score" required>
                    <option value="">Choose score</option>
                    <option value="5">5 — Excellent</option>
                    <option value="4">4 — Strong</option>
                    <option value="3">3 — Meets expectations</option>
                    <option value="2">2 — Needs improvement</option>
                    <option value="1">1 — Inadequate</option>
                  </select>
                </label>
                <label>Feedback
                  <textarea name="feedback" maxlength="500" rows="2" placeholder="Optional notes for contributor"></textarea>
                </label>
                <button class="button button-bright" type="submit">Approve &amp; grade <span>✓</span></button>
              </form>
            </div>
          </details>
        `).join('');
      }
    }

    // 3. User Management Table
    const userTableBody = document.querySelector('#userTableBody');
    if (userTableBody) {
      if (!Array.isArray(users) || users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No users registered yet.</td></tr>';
      } else {
        userTableBody.innerHTML = users.map(u => `
          <tr>
            <td>
              <strong>${escapeHtml(u.name)}</strong><br>
              <small style="color:#8da098; font-family:var(--mono);">${escapeHtml(u.email)}</small>
            </td>
            <td>
              <span class="badge-status ${u.role === 'admin' ? 'badge-active' : ''}">${escapeHtml(u.role.toUpperCase())}</span>
            </td>
            <td>
              <span class="badge-status ${u.status === 'active' ? 'badge-active' : 'badge-disabled'}">${escapeHtml(u.status.toUpperCase())}</span>
            </td>
            <td>
              <button type="button" class="security-control" data-user-action="toggle" data-user-id="${escapeHtml(u.id)}">
                ${u.status === 'active' ? 'Disable' : 'Activate'}
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // 4. Security Controls
    const secContainer = document.querySelector('#securityAccounts');
    if (secContainer) {
      const entries = Object.entries(securityAccounts || {});
      if (entries.length === 0) {
        secContainer.innerHTML = '<p class="empty-state">No flagged accounts.</p>';
      } else {
        secContainer.innerHTML = entries.map(([email, item]) => `
          <article class="security-account">
            <div>
              <b>${escapeHtml(email)}</b>
              <small>${item.status === 'disabled' ? 'ACCOUNT PAUSED' : item.status === 'flagged' ? 'FLAGGED · REVIEW NEEDED' : 'ACCESS RESTORED'} · ${escapeHtml(item.country || 'Country unavailable')}</small>
            </div>
            <div class="security-account-actions">
              ${item.status !== 'disabled' ? `<button type="button" class="security-control" data-security-action="disable" data-email="${escapeHtml(email)}">Disable</button>` : ''}
              <button type="button" class="security-control" data-security-action="restore" data-email="${escapeHtml(email)}">Restore</button>
              <button type="button" class="security-control" data-security-action="clear" data-email="${escapeHtml(email)}">Clear</button>
            </div>
          </article>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

// -----------------------------------------------------------------------------
// ADMIN ACTION LISTENERS
// -----------------------------------------------------------------------------

function initAdminActions() {
  // Add User Form
  const addUserForm = document.querySelector('#addUserForm');
  addUserForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const name = document.querySelector('#newUserName').value.trim();
    const email = document.querySelector('#newUserEmail').value.trim();
    const password = document.querySelector('#newUserPassword').value;
    const role = document.querySelector('#newUserRole').value;

    try {
      const res = await fetch('api.php?action=admin_add_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to create user.');
        return;
      }

      // Display newly generated credentials box
      const credBox = document.querySelector('#newCredentialsBox');
      document.querySelector('#credEmail').textContent = email;
      document.querySelector('#credPass').textContent = password;
      document.querySelector('#credRole').textContent = role.toUpperCase();
      credBox.style.display = 'block';

      // Setup Copy button
      document.querySelector('#copyCredBtn').onclick = () => {
        navigator.clipboard?.writeText(`GiveGrid Contributor Logins:\nEmail: ${email}\nPassword: ${password}\nURL: http://localhost/givegrid/`);
        showToast('Logins copied! Give them to the user.');
      };

      addUserForm.reset();
      showToast(`User ${name} authorized! Logins ready to share.`);
      loadAdminData();
    } catch (err) {
      console.error(err);
      showToast('Error creating user in database.');
    }
  });

  // Toggle User Status
  document.querySelector('#userTableBody')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-user-action="toggle"]');
    if (!button) return;

    const userId = button.dataset.userId;
    try {
      const res = await fetch('api.php?action=admin_toggle_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, actionType: 'toggle' })
      });

      if (res.ok) {
        showToast('User status updated in MySQL.');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Grade Submission Queue
  document.querySelector('#reviewQueue')?.addEventListener('submit', async event => {
    const form = event.target.closest('.grade-form');
    if (!form) return;
    event.preventDefault();

    const submissionId = form.dataset.submission;
    const formData = new FormData(form);
    const payload = {
      id: submissionId,
      score: formData.get('score'),
      feedback: formData.get('feedback')
    };

    try {
      const res = await fetch('api.php?action=grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Submission approved and graded in MySQL!');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to grade submission.');
    }
  });

  // Create Opportunity Task
  const taskForm = document.querySelector('#taskForm');
  taskForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: formData.get('title'),
      category: formData.get('category'),
      description: formData.get('description'),
      pay: formData.get('pay'),
      time: formData.get('time')
    };

    try {
      const res = await fetch('api.php?action=create_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        taskForm.reset();
        taskForm.elements.pay.value = 25;
        taskForm.elements.time.value = '30 min';
        showToast('New opportunity published to MySQL!');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to create task in PHP database.');
    }
  });

  // Security Flag Form
  const secForm = document.querySelector('#securityFlagForm');
  secForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get('email'),
      country: formData.get('country')
    };

    try {
      const res = await fetch('api.php?action=security_flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        secForm.reset();
        showToast('Contributor account flagged in MySQL.');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Security Action Buttons
  document.querySelector('#securityAccounts')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-security-action]');
    if (!button) return;

    const actionType = button.dataset.securityAction;
    const email = button.dataset.email;

    try {
      const res = await fetch('api.php?action=security_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, actionType })
      });

      if (res.ok) {
        showToast(`Account status updated: ${actionType}`);
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminActions();
  updateAdminUI();
});
