// GiveGrid Contributor / User Portal Controller (app.js)
// Dedicated logic for index.php connecting with api.php & Laragon MySQL

let tasks = [];
let selectedFilter = 'All';
let shownCount = 12;
const pageSize = 12;

// Contributor Auth State
let authToken = localStorage.getItem('givegrid_auth_token') || null;
let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem('givegrid_auth_user'));
} catch (e) {
  currentUser = null;
}

const grid = document.querySelector('#taskGrid');
const taskDialog = document.querySelector('#taskDialog');
const dialogContent = document.querySelector('#dialogContent');
const toast = document.querySelector('#toast');
const verificationDialog = document.querySelector('#verificationDialog');
const loginDialog = document.querySelector('#loginDialog');
let toastTimer;

// Live Hero Clock
function updateHeroClock() {
  const clockEl = document.querySelector('#heroClock');
  if (clockEl) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    clockEl.textContent = `ONLINE · ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
}
setInterval(updateHeroClock, 1000);
updateHeroClock();

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
// CONTRIBUTOR AUTHENTICATION & SESSION
// -----------------------------------------------------------------------------

function updateAuthUI() {
  const loginBtn = document.querySelector('#loginButton');
  const authStatusBadge = document.querySelector('#authStatusBadge');
  const navUserName = document.querySelector('#navUserName');
  const authGate = document.querySelector('#authGateContainer');
  const dashboard = document.querySelector('#contributorDashboard');

  if (currentUser && authToken) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (authStatusBadge) {
      authStatusBadge.style.display = 'flex';
      navUserName.textContent = `👤 ${currentUser.name}`;
    }
    if (authGate) authGate.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    const accountEmailInput = document.querySelector('#accountEmail');
    if (accountEmailInput) {
      accountEmailInput.value = currentUser.email;
    }
    const roleBadge = document.querySelector('#authRoleBadge');
    if (roleBadge) {
      roleBadge.textContent = currentUser.role === 'admin' ? 'Administrator' : 'Authorized Contributor';
    }
    renderAccount();
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (authStatusBadge) authStatusBadge.style.display = 'none';
    if (authGate) authGate.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
  }
}

// Contributor Login Form ("authorize me" button)
const loginForm = document.querySelector('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.querySelector('#loginEmailInput').value.trim();
    const password = document.querySelector('#loginPasswordInput').value;
    const submitBtn = document.querySelector('#authSubmitBtn');

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

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('givegrid_auth_token', authToken);
      localStorage.setItem('givegrid_auth_user', JSON.stringify(currentUser));
      localStorage.setItem('givegrid_account_email', currentUser.email);

      updateAuthUI();
      loginDialog?.close();
      loginForm.reset();
      showToast(`Welcome, ${currentUser.name}! You are authorized.`);
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

// Contributor Logout
document.querySelector('#logoutButton')?.addEventListener('click', async () => {
  try {
    if (authToken) {
      await fetch(`api.php?action=logout&token=${encodeURIComponent(authToken)}`);
    }
  } catch (e) {}

  authToken = null;
  currentUser = null;
  localStorage.removeItem('givegrid_auth_token');
  localStorage.removeItem('givegrid_auth_user');

  updateAuthUI();
  showToast('You have been logged out.');
});

document.querySelector('#loginButton')?.addEventListener('click', () => loginDialog?.showModal());
document.querySelector('#gateAuthBtn')?.addEventListener('click', () => loginDialog?.showModal());

// -----------------------------------------------------------------------------
// TASKS CATALOG
// -----------------------------------------------------------------------------

async function fetchTasks() {
  try {
    const sort = document.querySelector('#sortSelect')?.value || 'recommended';
    const res = await fetch(`api.php?action=tasks&sort=${sort}`);
    const data = await res.json();
    tasks = data.tasks || [];
    renderTasks();
  } catch (err) {
    console.error('Failed to load tasks from PHP API:', err);
    showToast('Failed to load opportunities from PHP database.');
  }
}

function renderTasks() {
  if (!grid) return;
  const sort = document.querySelector('#sortSelect')?.value || 'recommended';
  
  let visible = tasks.filter(task => selectedFilter === 'All' || task.category === selectedFilter);

  if (sort === 'pay-high') visible.sort((a, b) => Number(b.pay) - Number(a.pay));
  if (sort === 'newest') visible.sort((a, b) => Number(a.posted ?? 0) - Number(b.posted ?? 0));

  const shown = visible.slice(0, shownCount);

  grid.innerHTML = shown.map(task => `
    <article class="task-card">
      <div class="task-top">
        <span class="category">
          <span class="category-mark">${escapeHtml(task.icon || '✳')}</span>
          ${escapeHtml(task.category.toUpperCase())}
        </span>
        <span class="task-new">${escapeHtml(task.tag || 'OPEN')}</span>
      </div>
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description)}</p>
      <div class="task-meta">
        <span>◷ ${escapeHtml(task.time)}</span>
        <span>◇ ${escapeHtml(task.level || 'All levels')}</span>
        <span class="pay">$${Number(task.pay)} / task</span>
      </div>
      <div class="task-footer">
        <small>Posted ${Number(task.posted) === 0 ? 'just now' : `${task.posted}h ago`} · Remote</small>
        <button class="task-open" data-task="${escapeHtml(task.id)}">View task <span>↗</span></button>
      </div>
    </article>
  `).join('');

  document.querySelector('#taskCount').textContent = shown.length;
  document.querySelector('#totalTaskCount').textContent = visible.length;
  
  const loadMoreBtn = document.querySelector('#loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.hidden = shown.length >= visible.length;
    loadMoreBtn.textContent = `Load more opportunities (${visible.length - shown.length} left)`;
  }

  // Update filter count badges
  document.querySelectorAll('.filter').forEach(button => {
    const filterVal = button.dataset.filter;
    const count = filterVal === 'All' ? tasks.length : tasks.filter(t => t.category === filterVal).length;
    const badge = button.querySelector('[data-filter-count]');
    if (badge) badge.textContent = count;
  });
}

// Open Task Details Modal (Checks Authorization)
function openTask(task) {
  if (!dialogContent || !taskDialog) return;

  const isAuth = !!(currentUser && authToken);

  dialogContent.innerHTML = `
    <div class="eyebrow"><span class="pulse"></span> ${escapeHtml(task.category.toUpperCase())} · REMOTE</div>
    <h2>${escapeHtml(task.title)}</h2>
    <p>${escapeHtml(task.description)}</p>
    <div class="dialog-meta">
      <span>◷ ${escapeHtml(task.time)}</span>
      <span>◇ ${escapeHtml(task.level || 'All levels')}</span>
      <span>$${task.pay} / task</span>
    </div>
    
    ${!isAuth ? `
      <div class="auth-gate-box" style="margin-top:15px; padding:20px;">
        <p style="color:#dce5df; margin-bottom:10px;"><strong>Authorization Required:</strong> Only contributors authorized by the administrator can submit responses.</p>
        <button class="button button-bright" id="taskModalAuthBtn" type="button">authorize me <span>→</span></button>
      </div>
    ` : `
      <form id="submissionForm" class="submission-form">
        <h3>Submit Your Response</h3>
        <p>Logged in as: <strong style="color:var(--mint);">${escapeHtml(currentUser.name)}</strong> (${escapeHtml(currentUser.email)})</p>
        <input type="hidden" name="name" value="${escapeHtml(currentUser.name)}">
        <input type="hidden" name="email" value="${escapeHtml(currentUser.email)}">
        <label>Your Task Response / Findings
          <textarea name="response" required minlength="10" maxlength="5000" rows="6" placeholder="Write your thoughtful answer here…"></textarea>
        </label>
        <button class="button button-bright" type="submit">Submit for review <span>↗</span></button>
      </form>
    `}
  `;

  taskDialog.showModal();

  document.querySelector('#taskModalAuthBtn')?.addEventListener('click', () => {
    taskDialog.close();
    loginDialog?.showModal();
  });

  const submissionForm = document.querySelector('#submissionForm');
  if (submissionForm) {
    submissionForm.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = {
        taskId: task.id,
        name: formData.get('name'),
        email: formData.get('email'),
        response: formData.get('response')
      };

      try {
        const res = await fetch('api.php?action=create_submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const resData = await res.json();
        if (!res.ok) {
          showToast(resData.error || 'Submission failed.');
          return;
        }

        taskDialog.close();
        renderAccount();
        showToast('Submitted! Your work is saved to MySQL and waiting for admin review.');
      } catch (err) {
        console.error(err);
        showToast('Error communicating with PHP server.');
      }
    });
  }
}

// -----------------------------------------------------------------------------
// CONTRIBUTOR ACCOUNT
// -----------------------------------------------------------------------------

async function renderAccount() {
  if (!currentUser) return;
  const email = currentUser.email;

  try {
    const [accRes, subRes] = await Promise.all([
      fetch(`api.php?action=account&email=${encodeURIComponent(email)}`),
      fetch(`api.php?action=submissions&email=${encodeURIComponent(email)}`)
    ]);

    const acc = await accRes.json();
    const subs = await subRes.json();

    // Verification Badge
    const badge = document.querySelector('#verificationBadge');
    if (badge) {
      if (acc.isVerified) {
        badge.innerHTML = '<i></i> VERIFIED CONTRIBUTOR';
        badge.className = 'verification-status is-verified';
      } else {
        badge.innerHTML = '<i></i> NOT VERIFIED';
        badge.className = 'verification-status';
      }
    }

    // Security Notice
    const securityNotice = document.querySelector('#accountSecurityState');
    if (securityNotice) {
      if (acc.security && acc.security.status === 'disabled') {
        securityNotice.hidden = false;
        securityNotice.textContent = `Account paused: a security alert from ${acc.security.country || 'an unfamiliar country'} is under review. Submissions are temporarily disabled.`;
      } else if (acc.security && acc.security.status === 'flagged') {
        securityNotice.hidden = false;
        securityNotice.textContent = `Security review pending: an unfamiliar-country alert was recorded for ${acc.security.country || 'this account'}.`;
      } else {
        securityNotice.hidden = true;
      }
    }

    // Rating & Counts
    const accountRatingEl = document.querySelector('#accountRating');
    const ratingNoteEl = document.querySelector('#ratingNote');
    if (accountRatingEl) {
      accountRatingEl.innerHTML = acc.rating !== null ? `${Number(acc.rating).toFixed(1)}<span>/5</span>` : '—<span>/5</span>';
    }
    if (ratingNoteEl) {
      ratingNoteEl.textContent = acc.rating !== null ? 'Average rating across your approved and graded tasks.' : 'Your rating appears after an admin grades approved work.';
    }
    document.querySelector('#gradedCount').textContent = acc.gradedCount;
    document.querySelector('#pendingCount').textContent = acc.pendingCount;
    document.querySelector('#submissionLabel').textContent = `${subs.length} submission${subs.length === 1 ? '' : 's'} for ${email}`;

    // Submissions List
    const submissionsContainer = document.querySelector('#mySubmissions');
    if (submissionsContainer) {
      if (subs.length === 0) {
        submissionsContainer.innerHTML = '<p class="empty-state">No submissions found for your account yet.</p>';
      } else {
        submissionsContainer.innerHTML = subs.map(item => `
          <article class="submission-row">
            <div class="submission-main">
              <span class="submission-status status-${item.status}">
                ${item.status === 'approved' ? 'APPROVED · GRADED' : item.status === 'pending' ? 'PENDING REVIEW' : 'REVISION REQUESTED'}
              </span>
              <h4>${escapeHtml(item.taskTitle)}</h4>
              <p>${escapeHtml(item.response)}</p>
              ${item.feedback ? `<small class="feedback-note">Admin feedback: ${escapeHtml(item.feedback)}</small>` : ''}
            </div>
            <div class="submission-score">
              ${item.status === 'approved' ? `<strong>${Number(item.score).toFixed(1)}<small>/5</small></strong>` : '<span>—</span>'}
              <small>${new Date(item.submittedAt).toLocaleDateString()}</small>
            </div>
          </article>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error rendering account:', err);
  }
}

// -----------------------------------------------------------------------------
// EVENT LISTENERS INITIALIZATION
// -----------------------------------------------------------------------------

function initEventListeners() {
  // Category Filters
  document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.filter.active')?.classList.remove('active');
      button.classList.add('active');
      selectedFilter = button.dataset.filter;
      shownCount = pageSize;
      renderTasks();
    });
  });

  // Sort Dropdown
  document.querySelector('#sortSelect')?.addEventListener('change', () => {
    shownCount = pageSize;
    renderTasks();
  });

  // Load More Button
  document.querySelector('#loadMore')?.addEventListener('click', () => {
    shownCount += pageSize;
    renderTasks();
  });

  // Reset Filters
  document.querySelector('#clearFilters')?.addEventListener('click', () => {
    selectedFilter = 'All';
    shownCount = pageSize;
    document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === 'All'));
    const sortSel = document.querySelector('#sortSelect');
    if (sortSel) sortSel.value = 'recommended';
    renderTasks();
  });

  // Open Task Event Delegation
  grid?.addEventListener('click', event => {
    const button = event.target.closest('[data-task]');
    if (button) {
      const task = tasks.find(t => String(t.id) === button.dataset.task);
      if (task) openTask(task);
    }
  });

  // Dialog Close buttons
  document.querySelectorAll('.dialog-close').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });

  // Identity Verification
  document.querySelector('#startVerification')?.addEventListener('click', () => verificationDialog?.showModal());
  document.querySelector('#verificationDone')?.addEventListener('click', async () => {
    if (!currentUser) {
      showToast('Please authorize your contributor account first.');
      verificationDialog?.close();
      return;
    }

    const email = currentUser.email;
    const docType = document.querySelector('#docType')?.value || 'passport';

    try {
      const res = await fetch('api.php?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, docType })
      });
      if (res.ok) {
        showToast('Identity verification verified successfully in MySQL!');
        renderAccount();
      }
    } catch (err) {
      console.error(err);
    }
    verificationDialog?.close();
  });

  // Mobile Menu Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    mainNav?.classList.toggle('open', !isOpen);
  });

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav?.classList.remove('open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    });
  });
}

// Initial Boot
async function startApp() {
  initEventListeners();
  updateAuthUI();
  await fetchTasks();
}

document.addEventListener('DOMContentLoaded', startApp);
