// NexusGrid Admin Workspace Controller (admin.js)
// Admin dashboard actions use protected API routes and Supabase Auth.

let currentAdminUser = null;

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

function clearAdminSession() {
  currentAdminUser = null;
}

async function refreshAdminSession() {
  try {
    const response = await window.fetch('/api?action=admin_refresh', {
      method: 'POST',
      credentials: 'same-origin'
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function adminFetch(url, options = {}) {
  const send = () => window.fetch(url, { ...options, credentials: 'same-origin' });
  let response = await send();
  const isAuthFlow = String(url).includes('admin_login') || String(url).includes('admin_bootstrap') || String(url).includes('admin_refresh');
  if (response.status === 401 && !isAuthFlow) {
    if (await refreshAdminSession()) {
      response = await send();
    } else {
      clearAdminSession();
      updateAdminUI();
    }
  }
  return response;
}

async function updateBootstrapVisibility() {
  const panel = document.querySelector('#adminBootstrapPanel');
  if (!panel) return;
  const status = document.querySelector('#adminSetupStatus');
  const controls = panel.querySelectorAll('input, button');

  try {
    const response = await window.fetch('/api?action=admin_bootstrap_status');
    const data = await response.json();
    if (!response.ok) throw new Error('Setup status unavailable');
    panel.style.display = data.setupAvailable ? 'block' : 'none';
    controls.forEach(control => { control.disabled = false; });
  } catch {
    panel.style.display = 'block';
    if (status) status.textContent = 'Could not reach the Supabase setup status endpoint. The project API and Supabase environment must be available before creating the administrator.';
    controls.forEach(control => { control.disabled = true; });
  }
}

async function restoreAdminSession() {
  try {
    const response = await adminFetch('/api?action=admin_session');
    const data = await response.json();
    if (!response.ok || data.user?.role !== 'admin') throw new Error('Invalid session');
    currentAdminUser = data.user;
  } catch {
    clearAdminSession();
  }

  updateAdminUI();
  await updateBootstrapVisibility();
}

// Score Label Helper
function getScoreLabel(score) {
  if (score >= 4.8) return 'Very Excellent ★';
  if (score >= 4.0) return 'Excellent ';
  if (score >= 3.5) return 'Good ';
  if (score >= 2.5) return 'Fair ';
  if (score >= 1.5) return 'Poor ';
  return 'Very Poor ■';
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
  const isAdmin = currentAdminUser && currentAdminUser.role === 'admin';

  if (isAdmin) {
    if (gate) gate.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    if (userBadge) userBadge.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';
    if (nameDisplay) nameDisplay.textContent = ` ${currentAdminUser.name}`;
    loadAdminData();
  } else {
    if (gate) gate.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-flex';
  }
}

// Admin Login Form (Supabase Auth)
const adminLoginForm = document.querySelector('#adminLoginForm');
if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.querySelector('#adminEmailInput').value.trim();
    const password = document.querySelector('#adminPasswordInput').value;
    const submitBtn = document.querySelector('#adminSubmitAuthBtn');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authorizing…';
    }

    try {
      const res = await window.fetch('/api?action=admin_login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Invalid email or password.');
        return;
      }

      currentAdminUser = data.user;
      updateAdminUI();
      await updateBootstrapVisibility();
      showToast(`Welcome Administrator, ${data.user.name}!`);
      adminLoginForm.reset();
    } catch (err) {
      console.error(err);
      showToast('Could not complete administrator sign-in.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'authorize me <span>→</span>';
      }
    }
  });
}

const adminBootstrapForm = document.querySelector('#adminBootstrapForm');
if (adminBootstrapForm) {
  adminBootstrapForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submitBtn = document.querySelector('#adminBootstrapSubmitBtn');
    const bootstrapSecret = document.querySelector('#adminBootstrapSecret').value;
    const password = document.querySelector('#adminBootstrapPassword').value;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      const response = await window.fetch('/api?action=admin_bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrapSecret, password })
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Initial administrator setup failed.');
        return;
      }

      adminBootstrapForm.reset();
      document.querySelector('#adminSetupStatus').textContent = 'Admin account created. Sign in with the new password above.';
      document.querySelector('#adminEmailInput').value = 'admin@nexusgrid.com';
      document.querySelector('#adminPasswordInput').focus();
      await updateBootstrapVisibility();
      showToast('Administrator account created.');
    } catch (err) {
      console.error(err);
      showToast('Could not complete administrator setup.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create admin account';
    }
  });
}

// Admin Logout
document.querySelector('#adminLogoutBtn')?.addEventListener('click', async () => {
  try {
    await adminFetch('/api?action=admin_logout', { method: 'POST' });
  } catch {}

  clearAdminSession();
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
    const [subRes, secRes, userRes, statsRes] = await Promise.all([
      adminFetch('/api?action=submissions&status=pending'),
      adminFetch('/api?action=security'),
      adminFetch('/api?action=admin_list_users'),
      adminFetch('/api?action=admin_stats')
    ]);

    const pending = await subRes.json();
    const securityAccounts = await secRes.json();
    const users = await userRes.json();
    const stats = await statsRes.json();

    // 1. KPI Counters
    document.querySelector('#kpiPendingCount').textContent = stats.pendingCount ?? (pending.length || 0);
    document.querySelector('#kpiApprovedCount').textContent = stats.approvedCount ?? 0;
    document.querySelector('#kpiTotalPayouts').textContent = `$${Number(stats.totalPayouts || 0).toFixed(2)}`;
    document.querySelector('#kpiUserCount').textContent = stats.userCount ?? (Array.isArray(users) ? users.length : 0);
    document.querySelector('#kpiTaskCount').textContent = stats.taskCount ?? 0;

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
        queueEl.innerHTML = pending.map(item => {
          const autoScore = item.autoScore ? parseFloat(item.autoScore) : null;
          const autoLabel = autoScore !== null ? getScoreLabel(autoScore) : null;
          const dimData = item.dimScores ? (typeof item.dimScores === 'string' ? JSON.parse(item.dimScores) : item.dimScores) : null;
          return `
          <details class="review-item">
            <summary>
              <span>
                <b>${escapeHtml(item.taskTitle)}</b>
                <small>${escapeHtml(item.name)} · ${escapeHtml(item.email)}</small>
              </span>
              ${autoScore !== null
                ? `<span class="auto-score-pill" title="Auto-calculated from contributor's dimensional ratings">${autoScore.toFixed(2)}/5 · ${autoLabel}</span>`
                : `<i>REVIEW</i>`
              }
            </summary>
            <div class="review-body">
              <div class="submitted-answer">${escapeHtml(item.response).replace(/\n/g, '<br>')}</div>

              ${autoScore !== null ? `
              <div class="auto-score-breakdown" style="margin: 12px 0; padding: 14px 16px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.18); border-radius:8px;">
                <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#818cf8; margin-bottom:8px;">
                  Auto score: Auto-Calculated Score from Dimensional Ratings
                </div>
                <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                  <strong style="font-size:28px; color:#e2e8f0; font-family:var(--mono);">${autoScore.toFixed(2)}<span style="font-size:14px; color:#64748b;">/5</span></strong>
                  <span class="auto-score-pill">${autoLabel}</span>
                </div>
                ${dimData ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                  ${Object.entries(dimData).map(([k, v]) => `<span style="font-size:10px; padding:3px 8px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.2); border-radius:4px; color:#94a3b8; font-family:var(--mono);">${k}: ${v}/5</span>`).join('')}
                </div>` : ''}
                <small style="display:block; margin-top:8px; color:#64748b; font-size:10px;">Final score = Admin grade (60%) + Auto-score (40%). If no manual grade is selected, the auto-score is used directly.</small>
              </div>
              ` : ''}

              <form class="grade-form" data-submission="${escapeHtml(item.id)}" data-email="${escapeHtml(item.email)}" data-name="${escapeHtml(item.name)}" data-auto-score="${autoScore || ''}">
                <label>Grade (out of 5)
                  <div class="grade-score-row">
                    ${[1,2,3,4,5].map(n => `<button type="button" class="grade-score-btn" data-score="${n}">${n}</button>`).join('')}
                    <input type="hidden" name="score" class="grade-score-hidden" value="">
                    <span class="final-score-preview" style="margin-left:12px; font-family:var(--mono); font-size:12px; color:#64748b;"></span>
                  </div>
                </label>
                <label>Feedback Rating
                  <select name="feedback_label" required>
                    <option value="">Select feedback label</option>
                    <option value="Very Poor">■ Very Poor (1/5) — Needs major revision</option>
                    <option value="Poor"> Poor (2/5) — Below expectations</option>
                    <option value="Fair"> Fair (3/5) — Meets minimum standards</option>
                    <option value="Good"> Good (4/5) — Strong and accurate</option>
                    <option value="Excellent"> Excellent (5/5) — Outstanding quality</option>
                    <option value="Very Excellent">★ Very Excellent (5/5+) — Exceptional, top-tier work</option>
                  </select>
                </label>
                <label>Additional Notes (optional)
                  <textarea name="feedback_note" maxlength="500" rows="2" placeholder="Extra comments for the contributor..."></textarea>
                </label>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                  <button class="button button-bright" type="submit">Approve &amp; Grade <span>✓</span></button>
                  <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8; cursor:pointer;">
                    <input type="checkbox" name="send_email" value="1" checked style="accent-color:#00dfa2;">
                    Send grade email to contributor
                  </label>
                </div>
              </form>
            </div>
          </details>
        `}).join('');

        // Wire up score buttons with live final-score preview
        queueEl.querySelectorAll('.grade-score-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const form = btn.closest('.grade-form');
            form.querySelectorAll('.grade-score-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            form.querySelector('.grade-score-hidden').value = btn.dataset.score;
            // Auto-select matching feedback label
            const scoreMap = { '1': 'Very Poor', '2': 'Poor', '3': 'Fair', '4': 'Good', '5': 'Excellent' };
            const sel = form.querySelector('select[name="feedback_label"]');
            if (sel && scoreMap[btn.dataset.score]) sel.value = scoreMap[btn.dataset.score];

            // Show live final-score preview (60% admin + 40% auto)
            const preview = form.querySelector('.final-score-preview');
            const autoScoreVal = parseFloat(form.dataset.autoScore);
            const adminVal = parseInt(btn.dataset.score, 10);
            if (preview) {
              if (autoScoreVal > 0) {
                const final = Math.round(((adminVal * 0.60) + (autoScoreVal * 0.40)) * 100) / 100;
                preview.innerHTML = `→ Final: <strong style="color:#818cf8;">${final.toFixed(2)}</strong>/5 <span style="font-size:10px; color:#475569;">(Admin ${adminVal} × 60% + Auto ${autoScoreVal.toFixed(2)} × 40%)</span>`;
              } else {
                preview.innerHTML = `→ Final: <strong style="color:#818cf8;">${adminVal}.00</strong>/5`;
              }
            }
          });
        });
      }
    }

    // 3. User Management Table (Displays tasks completed & accumulated money)
    const userTableBody = document.querySelector('#userTableBody');
    if (userTableBody) {
      if (!Array.isArray(users) || users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No users registered yet.</td></tr>';
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
              <strong style="color:var(--text); font-size:12px;">${Number(u.tasks_completed || 0)} done</strong>
              ${Number(u.tasks_pending || 0) > 0 ? `<br><small style="color:#e8c56e; font-family:var(--mono); font-size:9px;">(${u.tasks_pending} pending)</small>` : ''}
              ${u.avg_rating ? `<br><small style="color:var(--mint); font-family:var(--mono); font-size:9px;">★ ${u.avg_rating}/5</small>` : ''}
            </td>
            <td>
              <span style="color:var(--mint); font-weight:800; font-family:var(--mono); font-size:13px;">$${Number(u.accumulated_money || 0).toFixed(2)}</span>
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
      const res = await adminFetch('/api?action=admin_add_user', {
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
        const portalUrl = window.location.href.replace(/admin\.php.*$/, 'index.php');
        navigator.clipboard?.writeText(`NexusGrid Contributor Logins:\nEmail: ${email}\nPassword: ${password}\nURL: ${portalUrl}`);
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
      const res = await adminFetch('/api?action=admin_toggle_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, actionType: 'toggle' })
      });

      if (res.ok) {
        showToast('User status updated successfully.');
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
    const contributorEmail = form.dataset.email;
    const contributorName = form.dataset.name;
    const formData = new FormData(form);
    const score = formData.get('score');
    const feedbackLabel = formData.get('feedback_label');
    const feedbackNote = (formData.get('feedback_note') || '').trim();
    const sendEmail = formData.get('send_email') === '1';

    if (!score) {
      showToast('Please select a grade score (1–5) before approving.');
      return;
    }
    if (!feedbackLabel) {
      showToast('Please select a feedback label before approving.');
      return;
    }

    const fullFeedback = feedbackNote ? `${feedbackLabel}. ${feedbackNote}` : feedbackLabel;

    const payload = {
      id: submissionId,
      score: parseFloat(score),
      feedback: fullFeedback,
      feedback_label: feedbackLabel,
      send_email: sendEmail,
      contributor_email: contributorEmail,
      contributor_name: contributorName
    };

    try {
      const res = await adminFetch('/api?action=grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        const finalScore = data.finalScore ? parseFloat(data.finalScore).toFixed(2) : score;
        const autoNote = data.autoScore > 0 ? ` (Admin ${score} × 60% + Auto ${parseFloat(data.autoScore).toFixed(2)} × 40%)` : '';
        const emailNote = sendEmail ? (data.emailSent ? ' · Email sent ✓' : ' · Email delivery attempted') : '';
        showToast(`✓ Final Score: ${finalScore}/5 — ${data.feedbackLabel || feedbackLabel}${autoNote}${emailNote}`);
        loadAdminData();
      } else {
        showToast(data.error || 'Failed to grade submission.');
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
      const res = await adminFetch('/api?action=create_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        taskForm.reset();
        taskForm.elements.pay.value = 25;
        taskForm.elements.time.value = '30 min';
        showToast('New opportunity published successfully!');
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
      const res = await adminFetch('/api?action=security_flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        secForm.reset();
        showToast('Contributor account flagged for review.');
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
      const res = await adminFetch('/api?action=security_action', {
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

  // Email Notification Form — send to individual or all contributors
  const notifyForm = document.querySelector('#notifyForm');
  notifyForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const toEmail = document.querySelector('#notifyToEmail').value.trim();
    const subject = document.querySelector('#notifySubject').value.trim();
    const message = document.querySelector('#notifyMessage').value.trim();
    const btn = document.querySelector('#notifySubmitBtn');
    const statusEl = document.querySelector('#notifyStatus');

    btn.disabled = true;
    btn.textContent = 'Sending...';
    if (statusEl) statusEl.style.display = 'none';

    try {
      const res = await adminFetch('/api?action=admin_notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_email: toEmail, subject, message, send_all: false })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.emailSent ? `✓ Email sent to ${toEmail}` : `Email attempted to ${toEmail} (check server mail config)`);
        if (statusEl) {
          statusEl.textContent = data.emailSent ? `✓ Delivered to ${toEmail}` : `⚠ Attempted — check server PHP mail() configuration`;
          statusEl.style.display = 'block';
          statusEl.style.color = data.emailSent ? 'var(--mint)' : '#f59e0b';
        }
        renderEmailLog(toEmail, subject, data.emailSent);
        notifyForm.reset();
      } else {
        showToast(data.error || 'Failed to send email.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error communicating with API.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Send Email <span>✉</span>';
    }
  });

  // "Email All Contributors" button
  document.querySelector('#notifyAllBtn')?.addEventListener('click', async () => {
    const subject = document.querySelector('#notifySubject').value.trim();
    const message = document.querySelector('#notifyMessage').value.trim();
    if (!subject || !message) {
      showToast('Please fill in Subject and Message before emailing all contributors.');
      return;
    }
    if (!confirm(`Send this email to ALL contributors?\n\nSubject: ${subject}`)) return;

    const btn = document.querySelector('#notifyAllBtn');
    btn.disabled = true;
    btn.textContent = 'Sending to all...';

    try {
      const res = await adminFetch('/api?action=admin_notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, send_all: true })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Broadcast sent to ${data.sent || 0} contributor(s).`);
        renderEmailLog('ALL CONTRIBUTORS', subject, data.sent > 0);
      } else {
        showToast(data.error || 'Broadcast failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Email All Contributors';
    }
  });
}

// Render a simple in-page email log entry
function renderEmailLog(to, subject, sent) {
  const logEl = document.querySelector('#emailLog');
  if (!logEl) return;
  const existing = logEl.innerHTML === '' ? '' : logEl.innerHTML;
  const time = new Date().toLocaleTimeString();
  logEl.innerHTML = `<div class="email-log-entry ${sent ? 'log-sent' : 'log-failed'}">
    <span class="log-icon">${sent ? '✉' : '⚠'}</span>
    <div>
      <strong>To: ${escapeHtml(to)}</strong>
      <small>${escapeHtml(subject)}</small>
    </div>
    <span class="log-time">${time}</span>
  </div>` + existing;
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminActions();
  restoreAdminSession();
});

