// NexusGrid Contributor / User Portal Controller (app.js)
// Dedicated logic for index.php connecting with /api & WampServer MySQL

let tasks = [];
let selectedFilter = 'All';
let shownCount = 12;
const pageSize = 12;

// Contributor Auth State
let authToken = localStorage.getItem('nexusgrid_auth_token') || localStorage.getItem('givegrid_auth_token') || null;
let currentUser = null;
let userAccountData = null;
try {
  currentUser = JSON.parse(localStorage.getItem('nexusgrid_auth_user') || localStorage.getItem('givegrid_auth_user'));
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
  const opportunitiesSection = document.querySelector('#opportunities');
  const tasksLoginGate = document.querySelector('#tasksLoginGate');

  if (currentUser && authToken) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (authStatusBadge) {
      authStatusBadge.style.display = 'flex';
      navUserName.textContent = `👤 ${currentUser.name}`;
    }
    if (authGate) authGate.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    // Show tasks, hide the gate
    if (opportunitiesSection) opportunitiesSection.style.display = '';
    if (tasksLoginGate) tasksLoginGate.style.display = 'none';

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

    // Hide tasks, show the gate
    if (opportunitiesSection) opportunitiesSection.style.display = 'none';
    if (tasksLoginGate) tasksLoginGate.style.display = '';
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
      const res = await fetch('/api/index.js?action=login', {
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
      localStorage.setItem('nexusgrid_auth_token', authToken);
      localStorage.setItem('nexusgrid_auth_user', JSON.stringify(currentUser));
      localStorage.setItem('nexusgrid_account_email', currentUser.email);

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
      await fetch(`/api?action=logout&token=${encodeURIComponent(authToken)}`);
    }
  } catch (e) {}

  authToken = null;
  currentUser = null;
  localStorage.removeItem('nexusgrid_auth_token');
  localStorage.removeItem('nexusgrid_auth_user');
  localStorage.removeItem('givegrid_auth_token');
  localStorage.removeItem('givegrid_auth_user');

  updateAuthUI();
  showToast('You have been logged out.');
});

document.querySelector('#loginButton')?.addEventListener('click', () => loginDialog?.showModal());
document.querySelector('#gateAuthBtn')?.addEventListener('click', () => loginDialog?.showModal());
document.querySelector('#gateTasksLoginBtn')?.addEventListener('click', () => loginDialog?.showModal());

// Hero "Explore streams" button — open login if not authenticated, else scroll to tasks
document.querySelector('#heroExploreBtn')?.addEventListener('click', () => {
  if (currentUser && authToken) {
    document.querySelector('#opportunities')?.scrollIntoView({ behavior: 'smooth' });
  } else {
    loginDialog?.showModal();
  }
});

// -----------------------------------------------------------------------------
// TASKS CATALOG
// -----------------------------------------------------------------------------

async function fetchTasks() {
  try {
    const sort = document.querySelector('#sortSelect')?.value || 'recommended';
    const res = await fetch(`/api?action=tasks&sort=${sort}`);
    const data = await res.json();
    tasks = data.tasks || [];
    renderCategoryFilters(data.counts || {});
    renderTasks();
  } catch (err) {
    console.error('Failed to load tasks from PHP API:', err);
    showToast('Failed to load opportunities from PHP database.');
  }
}

function renderCategoryFilters(counts) {
  const bar = document.querySelector('#categoryFilterBar');
  if (!bar) return;

  const categories = Object.keys(counts).filter(c => c !== 'All').sort();
  let html = `<button class="filter ${selectedFilter === 'All' ? 'active' : ''}" data-filter="All">All tasks <span data-filter-count>${counts['All'] || tasks.length}</span></button>`;

  categories.forEach(cat => {
    const isActive = selectedFilter === cat;
    html += `<button class="filter ${isActive ? 'active' : ''}" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)} <span data-filter-count>${counts[cat] || 0}</span></button>`;
  });

  bar.innerHTML = html;

  bar.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelector('.filter.active')?.classList.remove('active');
      btn.classList.add('active');
      selectedFilter = btn.dataset.filter;
      shownCount = pageSize;
      renderTasks();
    });
  });
}

function getStreamMeta(streamId) {
  switch (streamId) {
    case 'PREFERENCE_RANKING':
      return {
        label: 'RLHF Preference',
        pill: 'RLHF STREAM',
        badgeClass: 'stream-rlhf',
        color: '#818cf8',
        icon: 'âš–'
      };
    case 'FACT_CHECKING':
      return {
        label: 'Hallucination Audit',
        pill: 'FACT AUDIT',
        badgeClass: 'stream-fact',
        color: '#38bdf8',
        icon: '✓'
      };
    case 'TEXT_CLASSIFICATION':
      return {
        label: 'Taxonomy & Routing',
        pill: 'TAXONOMY',
        badgeClass: 'stream-taxo',
        color: '#34d399',
        icon: 'ðŸ·'
      };
    case 'SENTIMENT_ANALYSIS':
      return {
        label: 'Affective Alignment',
        pill: 'AFFECTIVE',
        badgeClass: 'stream-sent',
        color: '#fbbf24',
        icon: 'â™¡'
      };
    default:
      return {
        label: 'Nexus Stream',
        pill: 'STREAM ACTIVE',
        badgeClass: 'stream-default',
        color: '#00dfa2',
        icon: '✳'
      };
  }
}

function renderTasks() {
  if (!grid) return;
  const sort = document.querySelector('#sortSelect')?.value || 'recommended';
  
  let visible = tasks.filter(task => selectedFilter === 'All' || task.category === selectedFilter);

  if (sort === 'pay-high') visible.sort((a, b) => Number(b.pay) - Number(a.pay));
  if (sort === 'newest') visible.sort((a, b) => Number(a.posted ?? 0) - Number(b.posted ?? 0));

  const shown = visible.slice(0, shownCount);

  grid.innerHTML = shown.map(task => {
    const meta = getStreamMeta(task.stream_id);
    return `
    <article class="task-card" data-stream="${escapeHtml(task.stream_id || '')}">
      <div class="task-top">
        <span class="category">
          <span class="category-mark">${meta.icon}</span>
          ${escapeHtml(task.category.toUpperCase())}
        </span>
        <span class="task-new stream-pill ${meta.badgeClass}">${meta.pill}</span>
      </div>
      <span class="stream-badge ${meta.badgeClass}">${meta.label}</span>
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description)}</p>
      <div class="task-meta">
        <span>â—· ${escapeHtml(task.time)}</span>
        <span>â—‡ ${escapeHtml(task.level || 'All levels')}</span>
        <span class="pay">$${Number(task.pay).toFixed(2)} / task</span>
      </div>
      <div class="task-footer">
        <small>Stream Active · Remote</small>
        <button class="task-open" data-task="${escapeHtml(task.id)}">Evaluate <span>↗</span></button>
      </div>
    </article>
  `;
  }).join('');

  document.querySelector('#taskCount').textContent = shown.length;
  document.querySelector('#totalTaskCount').textContent = visible.length;
  
  const loadMoreBtn = document.querySelector('#loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.hidden = shown.length >= visible.length;
    loadMoreBtn.textContent = `Load more opportunities (${visible.length - shown.length} left)`;
  }

  // Update filter count badges
  document.querySelectorAll('#categoryFilterBar .filter').forEach(button => {
    const filterVal = button.dataset.filter;
    const count = filterVal === 'All' ? tasks.length : tasks.filter(t => t.category === filterVal).length;
    const badge = button.querySelector('[data-filter-count]');
    if (badge) badge.textContent = count;
  });
}

// Open Task Details Modal (Checks Authorization & Renders NexusGrid Alignment View)
function openTask(task) {
  if (!dialogContent || !taskDialog) return;

  const isAuth = !!(currentUser && authToken);
  const streamId = task.stream_id || 'PREFERENCE_RANKING';
  const meta = getStreamMeta(streamId);

  dialogContent.innerHTML = `
    <div class="eyebrow"><span class="pulse"></span> [${escapeHtml(task.uid || 'TASK')}] ${escapeHtml(meta.label.toUpperCase())} · REMOTE</div>
    <h2>${escapeHtml(task.title)}</h2>
    <p style="font-size: 15px; color: #cbd5e1; margin-bottom: 14px;">${escapeHtml(task.description)}</p>
    <div class="dialog-meta" style="margin-bottom: 16px;">
      <span>â—· Time Limit: ${escapeHtml(task.time)}</span>
      <span>â—‡ ${escapeHtml(task.level || 'All levels')}</span>
      <span style="color: var(--mint); font-weight: 700;">$${Number(task.pay).toFixed(2)} Instant Credit</span>
    </div>

    ${task.prompt_text ? `
      <div class="nexus-prompt-card">
        <div style="margin-bottom:10px;">
          <h4 style="margin:0; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#e2e8f0;">Original Prompt</h4>
          <span class="nexus-card-label" style="margin-top:2px; font-size:10px; color:#818cf8;">User Prompt</span>
        </div>
        <div class="nexus-code-block" style="font-family:inherit; font-size:14px; color:#e2e8f0; line-height:1.7; white-space:pre-wrap;">${escapeHtml(task.prompt_text)}</div>
      </div>
    ` : ''}

    ${task.response_a && task.response_b ? `
      <div class="nexus-responses-grid">
        <div class="nexus-response-box response-a">
          <div class="response-header" style="margin-bottom:12px;">
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#818cf8; margin-bottom:4px;">Step 1 — Response A</div>
            <span class="badge badge-a">Model Response A</span>
          </div>
          <div style="font-size:13.5px; color:#cbd5e1; line-height:1.7; white-space:pre-wrap; flex:1;">${escapeHtml(task.response_a)}</div>
        </div>
        <div class="nexus-response-box response-b">
          <div class="response-header" style="margin-bottom:12px;">
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#00dfa2; margin-bottom:4px;">Step 2 — Response B</div>
            <span class="badge badge-b">Model Response B</span>
          </div>
          <div style="font-size:13.5px; color:#cbd5e1; line-height:1.7; white-space:pre-wrap; flex:1;">${escapeHtml(task.response_b)}</div>
        </div>
      </div>
    ` : ''}

    ${task.how_to_do_it ? `
      <div class="task-instructions" style="margin: 14px 0; padding: 14px; background: rgba(30, 41, 59, 0.5); border-left: 3px solid var(--mint); border-radius: 4px;">
        <strong style="color: var(--mint); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Evaluation Guidelines:</strong>
        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0; white-space: pre-line;">${escapeHtml(task.how_to_do_it)}</p>
      </div>
    ` : ''}

    ${!isAuth ? `
      <div class="auth-gate-box" style="margin-top:15px; padding:20px;">
        <p style="color:#dce5df; margin-bottom:10px;"><strong>Authorization Required:</strong> Only authorized NexusGrid contributors can submit evaluations.</p>
        <button class="button button-bright" id="taskModalAuthBtn" type="button">authorize me <span>→</span></button>
      </div>
    ` : (userAccountData && userAccountData.todayCount >= 2) ? `
      <div class="auth-gate-box" style="margin-top:20px; padding:28px 20px; border:1px solid #f59e0b; background:rgba(245, 158, 11, 0.08); border-radius:8px;">
        <div style="font-size:32px; margin-bottom:8px;">â³</div>
        <h3 style="color:#fbbf24; margin:0 0 8px; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;">Daily Task Limit Reached (2/2)</h3>
        <p style="color:#cbd5e1; font-size:13px; line-height:1.6; margin:0; max-width:540px;">
          To ensure high evaluation rigor and quality control, NexusGrid contributors are limited to <strong>2 completed evaluations per day</strong>. You have completed your 2 tasks for today. Your daily limit will reset tomorrow.
        </p>
      </div>
    ` : `
      <form id="submissionForm" class="submission-form" style="margin-top: 20px;">
        <input type="hidden" name="name" value="${escapeHtml(currentUser.name)}">
        <input type="hidden" name="email" value="${escapeHtml(currentUser.email)}">
        <input type="hidden" name="choice" id="selectedWinnerInput" value="" required>

        <!-- Step 1: Audit Response A -->
        <div class="eval-section">
          <div class="eval-step-header">
            <h3>Step 1 — Score &amp; Audit Response A</h3>
          </div>
          <div class="eval-score-card">
            <h4>Dimensional Scoring (1”“5 Scale) — Response A</h4>
            <div class="eval-dimensions-grid">
              ${[
                { id: 'acc_a', label: 'Factual Accuracy' },
                { id: 'inst_a', label: 'Instruction Following' },
                { id: 'help_a', label: 'Helpfulness & Depth' },
                { id: 'reason_a', label: 'Reasoning Rigor' },
                { id: 'conc_a', label: 'Conciseness & Style' },
                { id: 'safe_a', label: 'Safety & Guardrails' }
              ].map(dim => `
                <div class="eval-dim-row">
                  <span>${dim.label}</span>
                  <div class="eval-btn-group" data-dim="${dim.id}">
                    <button type="button" class="eval-num-btn" data-val="1">1</button>
                    <button type="button" class="eval-num-btn" data-val="2">2</button>
                    <button type="button" class="eval-num-btn" data-val="3">3</button>
                    <button type="button" class="eval-num-btn active" data-val="4">4</button>
                    <button type="button" class="eval-num-btn" data-val="5">5</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="eval-checks-grid">
              <div class="eval-check-box">
                <label>Errors Detected in Response A</label>
                <div class="eval-pill-group">
                  <button type="button" class="eval-pill-btn active" data-check="err_a" data-val="No">No Errors</button>
                  <button type="button" class="eval-pill-btn" data-check="err_a" data-val="Yes">Error Found</button>
                </div>
              </div>
              <div class="eval-check-box">
                <label>Toxicity / Hallucination Level</label>
                <div class="eval-pill-group">
                  <button type="button" class="eval-pill-btn active" data-check="tox_a" data-val="0">0 (Clean)</button>
                  <button type="button" class="eval-pill-btn" data-check="tox_a" data-val="1">1 (Mild)</button>
                  <button type="button" class="eval-pill-btn" data-check="tox_a" data-val="2">2 (Severe)</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Audit Response B -->
        <div class="eval-section">
          <div class="eval-step-header step-b">
            <h3>Step 2 — Score &amp; Audit Response B</h3>
          </div>
          <div class="eval-score-card">
            <h4>Dimensional Scoring (1”“5 Scale) — Response B</h4>
            <div class="eval-dimensions-grid">
              ${[
                { id: 'acc_b', label: 'Factual Accuracy' },
                { id: 'inst_b', label: 'Instruction Following' },
                { id: 'help_b', label: 'Helpfulness & Depth' },
                { id: 'reason_b', label: 'Reasoning Rigor' },
                { id: 'conc_b', label: 'Conciseness & Style' },
                { id: 'safe_b', label: 'Safety & Guardrails' }
              ].map(dim => `
                <div class="eval-dim-row">
                  <span>${dim.label}</span>
                  <div class="eval-btn-group" data-dim="${dim.id}">
                    <button type="button" class="eval-num-btn" data-val="1">1</button>
                    <button type="button" class="eval-num-btn" data-val="2">2</button>
                    <button type="button" class="eval-num-btn" data-val="3">3</button>
                    <button type="button" class="eval-num-btn active" data-val="4">4</button>
                    <button type="button" class="eval-num-btn" data-val="5">5</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="eval-checks-grid">
              <div class="eval-check-box">
                <label>Errors Detected in Response B</label>
                <div class="eval-pill-group">
                  <button type="button" class="eval-pill-btn active" data-check="err_b" data-val="No">No Errors</button>
                  <button type="button" class="eval-pill-btn" data-check="err_b" data-val="Yes">Error Found</button>
                </div>
              </div>
              <div class="eval-check-box">
                <label>Toxicity / Hallucination Level</label>
                <div class="eval-pill-group">
                  <button type="button" class="eval-pill-btn active" data-check="tox_b" data-val="0">0 (Clean)</button>
                  <button type="button" class="eval-pill-btn" data-check="tox_b" data-val="1">1 (Mild)</button>
                  <button type="button" class="eval-pill-btn" data-check="tox_b" data-val="2">2 (Severe)</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Compare & Decide -->
        <div class="eval-section">
          <div class="eval-step-header step-compare">
            <h3>Step 3 — Compare &amp; Decide Winner *</h3>
          </div>
          <div class="eval-checks-grid" style="margin-bottom:14px;">
            <div class="eval-check-box">
              <label>Hallucination Detected Anywhere?</label>
              <div class="eval-pill-group">
                <button type="button" class="eval-pill-btn active" data-check="hallucination" data-val="No">No</button>
                <button type="button" class="eval-pill-btn" data-check="hallucination" data-val="Yes">Yes</button>
              </div>
            </div>
            <div class="eval-check-box">
              <label>Reasoning Soundness</label>
              <div class="eval-pill-group">
                <button type="button" class="eval-pill-btn active" data-check="soundness" data-val="Sound">Sound</button>
                <button type="button" class="eval-pill-btn" data-check="soundness" data-val="Flawed">Flawed</button>
                <button type="button" class="eval-pill-btn" data-check="soundness" data-val="N/A">N/A</button>
              </div>
            </div>
          </div>

          <div class="nexus-winner-cards" id="winnerCardsContainer">
            <div class="nexus-winner-card" data-winner="Model A">
              <span style="font-size:24px;">ðŸ†</span>
              <span class="winner-title">WINNER: MODEL A</span>
              <span class="winner-desc">Response A is superior</span>
            </div>
            <div class="nexus-winner-card" data-winner="Tie / Equivalent">
              <span style="font-size:24px;">âš–</span>
              <span class="winner-title">TIE / EQUIVALENT</span>
              <span class="winner-desc">Both responses are comparable</span>
            </div>
            <div class="nexus-winner-card card-b" data-winner="Model B">
              <span style="font-size:24px;">ðŸ†</span>
              <span class="winner-title">WINNER: MODEL B</span>
              <span class="winner-desc">Response B is superior</span>
            </div>
          </div>
        </div>

        <!-- Step 4: Quality Control & Justification -->
        <div class="eval-section">
          <div class="eval-step-header step-qc">
            <h3>Step 4 — Quality Control &amp; Technical Justification *</h3>
          </div>
          <label style="display:block;">
            <span style="font-size:12px; color:#cbd5e1; font-weight:600; display:block; margin-bottom:8px;">Explain your audit logic in technical detail (Minimum 100 characters required)</span>
            <textarea id="justificationInput" name="justification" required minlength="100" maxlength="5000" rows="5" placeholder="Explain your verdict in technical detail. Cite specific lines, factual discrepancies, code bugs, or formatting strengths (minimum 100 characters required)..."></textarea>
            <div class="char-counter invalid" id="charCounter"><span id="charCount">0</span> / 100 characters minimum</div>
          </label>
        </div>

        <button class="nexus-submit-btn" type="submit" id="submitReviewBtn">FINAL SUBMIT &amp; INSTANT CREDIT <span>ðŸ›¡ï¸</span></button>
      </form>
    `}
  `;

  taskDialog.showModal();

  // Handle Winner Cards selection
  const winnerInput = dialogContent.querySelector('#selectedWinnerInput');
  dialogContent.querySelectorAll('#winnerCardsContainer .nexus-winner-card').forEach(card => {
    card.addEventListener('click', () => {
      dialogContent.querySelectorAll('#winnerCardsContainer .nexus-winner-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      if (winnerInput) {
        winnerInput.value = card.dataset.winner;
      }
    });
  });

  // Handle Dimensional Rating Buttons (1-5)
  dialogContent.querySelectorAll('.eval-btn-group').forEach(group => {
    group.querySelectorAll('.eval-num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.eval-num-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // Handle Pill Buttons
  dialogContent.querySelectorAll('.eval-pill-group').forEach(group => {
    group.querySelectorAll('.eval-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.eval-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // Real-time character counter
  const justInput = dialogContent.querySelector('#justificationInput');
  const counterSpan = dialogContent.querySelector('#charCount');
  const counterBox = dialogContent.querySelector('#charCounter');
  if (justInput && counterSpan && counterBox) {
    justInput.addEventListener('input', () => {
      const len = justInput.value.trim().length;
      counterSpan.textContent = len;
      if (len >= 100) {
        counterBox.classList.remove('invalid');
        counterBox.classList.add('valid');
      } else {
        counterBox.classList.remove('valid');
        counterBox.classList.add('invalid');
      }
    });
  }

  document.querySelector('#taskModalAuthBtn')?.addEventListener('click', () => {
    taskDialog.close();
    loginDialog?.showModal();
  });

  const submissionForm = document.querySelector('#submissionForm');
  if (submissionForm) {
    submissionForm.addEventListener('submit', async event => {
      event.preventDefault();

      if (userAccountData && userAccountData.todayCount >= 2) {
        showToast('Daily submission limit reached (2/2 tasks completed today). Please return tomorrow.');
        return;
      }

      const formData = new FormData(event.currentTarget);
      const choice = (formData.get('choice') || '').trim();
      const justification = (formData.get('justification') || '').trim();

      if (!choice) {
        showToast('Please select an overall winner in Step 3 (Winner: A, Tie, or Winner: B).');
        return;
      }

      if (justification.length < 100) {
        showToast('Technical Justification must be at least 100 characters.');
        return;
      }

      // Collect all dimensional rating scores (1”“5 buttons)
      const dimScores = {};
      dialogContent.querySelectorAll('.eval-btn-group').forEach(group => {
        const dim = group.dataset.dim;
        const activeBtn = group.querySelector('.eval-num-btn.active');
        if (dim && activeBtn) dimScores[dim] = parseInt(activeBtn.dataset.val, 10);
      });

      // Collect pill/check button values
      const pillValues = {};
      dialogContent.querySelectorAll('.eval-pill-btn.active').forEach(btn => {
        if (btn.dataset.check) pillValues[btn.dataset.check] = btn.dataset.val;
      });

      // Auto-calculate score: average of all dimensional ratings (1”“5 scale)
      const dimVals = Object.values(dimScores).filter(v => !isNaN(v));
      const autoScore = dimVals.length > 0
        ? Math.round((dimVals.reduce((s, v) => s + v, 0) / dimVals.length) * 100) / 100
        : null;

      const payload = {
        taskId: task.id,
        name: formData.get('name'),
        email: formData.get('email'),
        choice: choice,
        verdict: choice,
        criteria: ['Factual Accuracy', 'Instruction Following', 'Reasoning Rigor', 'Safety & Guardrails'],
        justification: justification,
        dim_scores: dimScores,
        pill_values: pillValues,
        auto_score: autoScore
      };

      try {
        const res = await fetch('/api/index.js?action=create_submission', {
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
        showToast('Evaluation submitted! Your alignment audit is saved and waiting for admin review.');
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
      fetch(`/api?action=account&email=${encodeURIComponent(email)}`),
      fetch(`/api?action=submissions&email=${encodeURIComponent(email)}`)
    ]);

    const acc = await accRes.json();
    const subs = await subRes.json();
    userAccountData = acc;

    // Load payment methods for this user
    loadPaymentMethods(email);

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
    const earningsEl = document.querySelector('#accountEarnings');
    if (earningsEl) {
      earningsEl.textContent = `$${Number(acc.accumulatedMoney || 0).toFixed(2)}`;
    }

    // Daily Quota Card
    const dailyQuotaEl = document.querySelector('#dailyQuotaCount');
    const dailyQuotaNoteEl = document.querySelector('#dailyQuotaNote');
    if (dailyQuotaEl) {
      dailyQuotaEl.innerHTML = `${acc.todayCount || 0}<span>/2</span>`;
      if ((acc.todayCount || 0) >= 2) {
        dailyQuotaEl.style.color = '#f87171';
        if (dailyQuotaNoteEl) dailyQuotaNoteEl.textContent = 'Daily limit reached (resets tomorrow)';
      } else {
        dailyQuotaEl.style.color = '#818cf8';
        if (dailyQuotaNoteEl) dailyQuotaNoteEl.textContent = `${2 - (acc.todayCount || 0)} task${(2 - (acc.todayCount || 0)) === 1 ? '' : 's'} remaining today`;
      }
    }
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
      const res = await fetch('/api/index.js?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, docType })
      });
      if (res.ok) {
        showToast('Identity verification verified successfully!');
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
  initPaymentTabs();
  initPaymentForms();
  updateAuthUI();
  await fetchTasks();
}

document.addEventListener('DOMContentLoaded', startApp);


// =============================================================================
// PAYMENT METHODS
// =============================================================================

function initPaymentTabs() {
  const tabs = document.querySelectorAll('.pay-tab');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.pay-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById('payPanel-' + tab.dataset.tab);
      if (panel) panel.style.display = 'block';
    });
  });
}

async function loadPaymentMethods(email) {
  if (!email) return;
  try {
    const r = await fetch(`/api?action=get_payment_methods&email=${encodeURIComponent(email)}`);
    const methods = await r.json();
    if (!Array.isArray(methods)) return;

    methods.forEach(m => {
      if (m.method_type === 'bank') {
        if (m.account_name)   document.getElementById('bankAccountName').value   = m.account_name;
        if (m.routing_number) document.getElementById('bankRoutingNumber').value  = m.routing_number;
        if (m.account_number) document.getElementById('bankAccountNumber').value  = m.account_number;
        if (m.is_primary)     document.getElementById('bankIsPrimary').checked    = true;
        showPaySaved('bank', m);
        const btn = document.getElementById('removeBankBtn');
        if (btn) btn.style.display = 'inline-flex';
      }
      if (m.method_type === 'paypal') {
        if (m.paypal_email)   document.getElementById('paypalEmail').value        = m.paypal_email;
        if (m.is_primary)     document.getElementById('paypalIsPrimary').checked  = true;
        showPaySaved('paypal', m);
        const btn = document.getElementById('removePaypalBtn');
        if (btn) btn.style.display = 'inline-flex';
      }
      if (m.method_type === 'stripe') {
        if (m.stripe_account_id) document.getElementById('stripeAccountId').value = m.stripe_account_id;
        if (m.is_primary)        document.getElementById('stripeIsPrimary').checked = true;
        showPaySaved('stripe', m);
        const btn = document.getElementById('removeStripeBtn');
        if (btn) btn.style.display = 'inline-flex';
      }
    });
  } catch (e) {
    console.warn('[Payment] load error', e);
  }
}

function showPaySaved(type, m) {
  const statusEl = document.getElementById(type + 'Status');
  if (!statusEl) return;
  let detail = '';
  if (type === 'bank') detail = m.account_name ? `${m.account_name} · ****${(m.account_number||'').slice(-4)}` : '';
  if (type === 'paypal') detail = m.paypal_email || '';
  if (type === 'stripe') detail = m.stripe_account_id || '';
  statusEl.className = 'pay-status success';
  statusEl.innerHTML = `<span class="pay-saved-badge">✓ SAVED${m.is_primary ? ' · PRIMARY' : ''}</span>${escapeHtml(detail)}`;
}

async function savePaymentMethod(type, payload) {
  const statusEl = document.getElementById(type + 'Status');
  if (statusEl) { statusEl.className = 'pay-status'; statusEl.textContent = 'Saving…'; }

  const email = currentUser?.email || document.getElementById('accountEmail')?.value || '';
  if (!email) {
    if (statusEl) { statusEl.className = 'pay-status error'; statusEl.textContent = 'You must be logged in to save payment methods.'; }
    return;
  }

  try {
    const r = await fetch('/api?action=save_payment_method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, method_type: type, ...payload })
    });
    const data = await r.json();
    if (data.success) {
      showPaySaved(type, { ...payload, method_type: type });
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} payout details saved!`);
      const removeBtn = document.getElementById('remove' + type.charAt(0).toUpperCase() + type.slice(1) + 'Btn');
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      if (statusEl) { statusEl.className = 'pay-status error'; statusEl.textContent = data.error || 'Failed to save.'; }
    }
  } catch (e) {
    if (statusEl) { statusEl.className = 'pay-status error'; statusEl.textContent = 'Network error. Please try again.'; }
  }
}

async function removePaymentMethod(type) {
  const email = currentUser?.email || document.getElementById('accountEmail')?.value || '';
  if (!email) return;
  if (!confirm(`Remove your ${type} payout method?`)) return;

  try {
    const r = await fetch('/api?action=delete_payment_method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, method_type: type })
    });
    const data = await r.json();
    if (data.success) {
      const statusEl = document.getElementById(type + 'Status');
      if (statusEl) { statusEl.className = 'pay-status'; statusEl.textContent = ''; }
      const removeBtn = document.getElementById('remove' + type.charAt(0).toUpperCase() + type.slice(1) + 'Btn');
      if (removeBtn) removeBtn.style.display = 'none';
      // Reset form fields
      if (type === 'bank') { document.getElementById('bankAccountName').value = ''; document.getElementById('bankRoutingNumber').value = ''; document.getElementById('bankAccountNumber').value = ''; document.getElementById('bankIsPrimary').checked = false; }
      if (type === 'paypal') { document.getElementById('paypalEmail').value = ''; document.getElementById('paypalIsPrimary').checked = false; }
      if (type === 'stripe') { document.getElementById('stripeAccountId').value = ''; document.getElementById('stripeIsPrimary').checked = false; }
      showToast(`${type} payout method removed.`);
    }
  } catch (e) {
    showToast('Error removing payment method. Please try again.');
  }
}

function initPaymentForms() {
  // Bank form
  const bankForm = document.getElementById('bankForm');
  if (bankForm) {
    bankForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('bankAccountName').value.trim();
      const routing = document.getElementById('bankRoutingNumber').value.trim();
      const account = document.getElementById('bankAccountNumber').value.trim();
      const primary = document.getElementById('bankIsPrimary').checked;
      if (!name || !account) { const s = document.getElementById('bankStatus'); if(s){s.className='pay-status error';s.textContent='Account holder name and account number are required.';} return; }
      savePaymentMethod('bank', { account_name: name, routing_number: routing, account_number: account, is_primary: primary });
    });
  }

  // PayPal form
  const paypalForm = document.getElementById('paypalForm');
  if (paypalForm) {
    paypalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('paypalEmail').value.trim();
      const primary = document.getElementById('paypalIsPrimary').checked;
      if (!email) { const s = document.getElementById('paypalStatus'); if(s){s.className='pay-status error';s.textContent='PayPal email is required.';} return; }
      savePaymentMethod('paypal', { paypal_email: email, is_primary: primary });
    });
  }

  // Stripe form
  const stripeForm = document.getElementById('stripeForm');
  if (stripeForm) {
    stripeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const acct = document.getElementById('stripeAccountId').value.trim();
      const primary = document.getElementById('stripeIsPrimary').checked;
      if (!acct || !acct.startsWith('acct_')) { const s = document.getElementById('stripeStatus'); if(s){s.className='pay-status error';s.textContent='Enter a valid Stripe account ID (starts with acct_).';} return; }
      savePaymentMethod('stripe', { stripe_account_id: acct, is_primary: primary });
    });
  }

  // Remove buttons
  document.querySelectorAll('.pay-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removePaymentMethod(btn.dataset.method));
  });
}
