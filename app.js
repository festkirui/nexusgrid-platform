// GiveGrid PHP Client Application
// Connects with the PHP backend (api.php) backed by MySQL in Laragon

let tasks = [];
let selectedFilter = 'All';
let shownCount = 12;
const pageSize = 12;

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

// API Helpers
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

// Render Tasks Grid
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

// Open Task Details Modal
function openTask(task) {
  if (!dialogContent || !taskDialog) return;

  dialogContent.innerHTML = `
    <div class="eyebrow"><span class="pulse"></span> ${escapeHtml(task.category.toUpperCase())} · REMOTE</div>
    <h2>${escapeHtml(task.title)}</h2>
    <p>${escapeHtml(task.description)}</p>
    <div class="dialog-meta">
      <span>◷ ${escapeHtml(task.time)}</span>
      <span>◇ ${escapeHtml(task.level || 'All levels')}</span>
      <span>$${task.pay} / task</span>
    </div>
    <form id="submissionForm" class="submission-form">
      <h3>Complete this task</h3>
      <p>Submit your response for an admin to review and grade in the PHP MySQL database.</p>
      <label>Your name
        <input name="name" required maxlength="80" placeholder="Your name">
      </label>
      <label>Email for your contributor account
        <input name="email" type="email" required maxlength="160" placeholder="you@example.com" value="${escapeHtml(localStorage.getItem('givegrid_account_email') || '')}">
      </label>
      <label>Your task response
        <textarea name="response" required minlength="10" maxlength="5000" rows="6" placeholder="Write your answer or findings here…"></textarea>
      </label>
      <button class="button button-bright" type="submit">Submit for review <span>↗</span></button>
    </form>
  `;

  taskDialog.showModal();

  const submissionForm = document.querySelector('#submissionForm');
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

      if (!res.ok) {
        const errorData = await res.json();
        showToast(errorData.error || 'Submission failed.');
        return;
      }

      taskDialog.close();
      const email = payload.email.trim().toLowerCase();
      localStorage.setItem('givegrid_account_email', email);
      document.querySelector('#accountEmail').value = email;

      renderAccount();
      renderAdmin();
      showToast('Submitted! Your work is saved to MySQL and waiting for review.');
    } catch (err) {
      console.error(err);
      showToast('Error communicating with PHP server.');
    }
  });
}

// Contributor Account
async function renderAccount() {
  const emailInput = document.querySelector('#accountEmail');
  const email = emailInput?.value.trim().toLowerCase() || '';

  if (!email) {
    document.querySelector('#accountRating').innerHTML = '—<span>/5</span>';
    document.querySelector('#ratingNote').textContent = 'Your rating appears after an admin grades approved work.';
    document.querySelector('#gradedCount').textContent = '0';
    document.querySelector('#pendingCount').textContent = '0';
    document.querySelector('#submissionLabel').textContent = 'Enter your email to see your work';
    document.querySelector('#mySubmissions').innerHTML = '<p class="empty-state">Enter your email above to look up submitted work.</p>';
    document.querySelector('#accountSecurityState').hidden = true;
    document.querySelector('#verificationBadge').innerHTML = '<i></i> NOT VERIFIED';
    document.querySelector('#verificationBadge').className = 'verification-status';
    return;
  }

  try {
    const [accRes, subRes] = await Promise.all([
      fetch(`api.php?action=account&email=${encodeURIComponent(email)}`),
      fetch(`api.php?action=submissions&email=${encodeURIComponent(email)}`)
    ]);

    const acc = await accRes.json();
    const subs = await subRes.json();

    // Verification Badge
    const badge = document.querySelector('#verificationBadge');
    if (acc.isVerified) {
      badge.innerHTML = '<i></i> VERIFIED CONTRIBUTOR';
      badge.className = 'verification-status is-verified';
    } else {
      badge.innerHTML = '<i></i> NOT VERIFIED';
      badge.className = 'verification-status';
    }

    // Security Notice
    const securityNotice = document.querySelector('#accountSecurityState');
    if (acc.security && acc.security.status === 'disabled') {
      securityNotice.hidden = false;
      securityNotice.textContent = `Account paused: a security alert from ${acc.security.country || 'an unfamiliar country'} is under review. Submissions are temporarily disabled.`;
    } else if (acc.security && acc.security.status === 'flagged') {
      securityNotice.hidden = false;
      securityNotice.textContent = `Security review pending: an unfamiliar-country alert was recorded for ${acc.security.country || 'this account'}.`;
    } else {
      securityNotice.hidden = true;
    }

    // Stats
    document.querySelector('#accountRating').innerHTML = acc.rating !== null ? `${Number(acc.rating).toFixed(1)}<span>/5</span>` : '—<span>/5</span>';
    document.querySelector('#ratingNote').textContent = acc.rating !== null ? 'Average rating across your approved and graded tasks.' : 'Your rating appears after an admin grades approved work.';
    document.querySelector('#gradedCount').textContent = acc.gradedCount;
    document.querySelector('#pendingCount').textContent = acc.pendingCount;
    document.querySelector('#submissionLabel').textContent = `${subs.length} submission${subs.length === 1 ? '' : 's'} for ${email}`;

    // Submissions List
    const submissionsContainer = document.querySelector('#mySubmissions');
    if (subs.length === 0) {
      submissionsContainer.innerHTML = '<p class="empty-state">No submissions found for this email yet.</p>';
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
  } catch (err) {
    console.error('Error rendering account:', err);
  }
}

// Admin Workspace
async function renderAdmin() {
  try {
    const [subRes, secRes] = await Promise.all([
      fetch('api.php?action=submissions&status=pending'),
      fetch('api.php?action=security')
    ]);

    const pending = await subRes.json();
    const securityAccounts = await secRes.json();

    // Review Queue
    const reviewCountEl = document.querySelector('#reviewCount');
    reviewCountEl.textContent = pending.length ? `${pending.length} submission${pending.length === 1 ? '' : 's'} waiting for review` : 'No submissions waiting';

    const queueEl = document.querySelector('#reviewQueue');
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

    // Security Accounts
    const secContainer = document.querySelector('#securityAccounts');
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
  } catch (err) {
    console.error('Error rendering admin:', err);
  }
}

// Event Listeners Initialization
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

  // Login Modal
  document.querySelector('#loginButton')?.addEventListener('click', () => loginDialog?.showModal());
  document.querySelector('#loginForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const email = document.querySelector('#loginEmailInput').value.trim();
    if (email) {
      localStorage.setItem('givegrid_account_email', email);
      document.querySelector('#accountEmail').value = email;
      renderAccount();
    }
    loginDialog?.close();
    showToast(`Signed in as ${email}`);
  });

  // Identity Verification
  document.querySelector('#startVerification')?.addEventListener('click', () => verificationDialog?.showModal());
  document.querySelector('#verificationDone')?.addEventListener('click', async () => {
    const email = document.querySelector('#accountEmail')?.value.trim();
    const docType = document.querySelector('#docType')?.value || 'passport';
    if (!email) {
      showToast('Please enter your contributor email in Account first.');
      verificationDialog?.close();
      return;
    }

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

  // Contributor Email Input
  const emailInput = document.querySelector('#accountEmail');
  if (emailInput) {
    emailInput.value = localStorage.getItem('givegrid_account_email') || 'alex@example.com';
    emailInput.addEventListener('input', () => {
      localStorage.setItem('givegrid_account_email', emailInput.value);
      renderAccount();
    });
  }

  // Admin Create Task Form
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
        await fetchTasks();
        showToast('New opportunity published to Laragon MySQL database!');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to create task in PHP database.');
    }
  });

  // Admin Grade Submission Delegation
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
        renderAdmin();
        renderAccount();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to grade submission in PHP database.');
    }
  });

  // Admin Security Flag Form
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
        showToast('Contributor account flagged in Laragon MySQL database.');
        renderAdmin();
        renderAccount();
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Admin Security Account Action Delegation
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
        showToast(`Account security status updated in MySQL: ${actionType}`);
        renderAdmin();
        renderAccount();
      }
    } catch (err) {
      console.error(err);
    }
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
  await fetchTasks();
  await renderAccount();
  await renderAdmin();
}

document.addEventListener('DOMContentLoaded', startApp);
