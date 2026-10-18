<?php
/**
 * GiveGrid - Work that moves AI forward
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
  <meta name="description" content="GiveGrid connects skilled people with meaningful, paid AI tasks. Powered by PHP & MySQL.">
  <title>GiveGrid — Work that moves AI forward (PHP & Laragon)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script src="app.js" defer></script>
</head>
<body>
  <!-- Header / Navigation -->
  <header class="topbar">
    <a class="brand" href="#top" aria-label="GiveGrid home">
      <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
      <span>give<span class="brand-light">grid</span></span>
    </a>
    <nav class="main-nav" aria-label="Main navigation">
      <a href="#opportunities">Opportunities</a>
      <a href="#my-work">My work</a>
      <a href="#admin">Admin</a>
      <a href="#how-it-works">How it works</a>
    </nav>
    <div class="nav-actions">
      <button class="text-button" id="loginButton">Log in</button>
      <a class="button button-small button-bright" href="#opportunities">Join the grid <span>↗</span></a>
    </div>
    <button class="menu-toggle" aria-label="Open menu" aria-expanded="false">
      <span></span>
      <span></span>
    </button>
  </header>

  <main id="top">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="pulse"></span> THE HUMAN SIDE OF AI · LARAGON PHP/MYSQL</div>
        <h1>Good work.<br><span>Better intelligence.</span></h1>
        <p class="hero-lead">Put your skills to work on the AI tasks that matter. Find flexible projects, contribute your perspective, and get paid for thoughtful work.</p>
        <div class="hero-actions">
          <a class="button button-bright" href="#opportunities">Explore tasks <span>↗</span></a>
          <a class="button button-quiet" href="#how-it-works"><span class="play">▶</span> See how it works</a>
        </div>
        <div class="hero-note">
          <div class="avatar-stack">
            <span>J</span><span>A</span><span>M</span><span>+</span>
          </div>
          <p><strong>People-powered progress</strong><br>Join a growing community of independent contributors</p>
        </div>
      </div>
      <div class="hero-art" aria-label="Illustration of connected contributor nodes">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="orbit orbit-three"></div>
        <div class="grid-core">
          <span class="core-spark">✳</span>
          <span>HUMAN<br>INSIGHT</span>
          <small id="heroClock">ONLINE · 08:42:16</small>
        </div>
        <div class="node node-a"><span class="node-icon">✦</span><b>REVIEW</b><small>Language</small></div>
        <div class="node node-b"><span class="node-icon">⌘</span><b>BUILD</b><small>Code</small></div>
        <div class="node node-c"><span class="node-icon">◉</span><b>TEACH</b><small>Reasoning</small></div>
        <div class="node node-d"><span class="node-icon">↗</span><b>IMPROVE</b><small>Research</small></div>
        <div class="art-caption"><span class="live-dot"></span> A little human goes a long way.</div>
      </div>
      <div class="hero-bottom">
        <span>INDEPENDENT CONTRIBUTORS</span>
        <div class="hero-line"></div>
        <span>ONE SHARED PURPOSE</span>
        <span class="scroll-hint">SCROLL TO EXPLORE ↓</span>
      </div>
    </section>

    <!-- Platform Stats -->
    <section class="stats" aria-label="Platform statistics">
      <div><strong>12<span>k+</span></strong><small>Contributors</small></div>
      <div><strong>48</strong><small>Countries reached</small></div>
      <div><strong>320<span>k</span></strong><small>Tasks completed</small></div>
      <div><strong>4.9<span>/5</span></strong><small>Contributor rating</small></div>
      <p>Small details.<br><b>Meaningful progress.</b></p>
    </section>

    <!-- 01 / Opportunities Section -->
    <section class="opportunities section-wrap" id="opportunities">
      <div class="section-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-mark">01 /</span> OPEN OPPORTUNITIES</div>
          <h2>Find your kind<br>of challenge.</h2>
        </div>
        <p>Pick up a task that fits your strengths. New projects are added as teams need fresh human insight.</p>
      </div>
      <div class="filters" role="group" aria-label="Filter opportunities">
        <button class="filter active" data-filter="All">All tasks <span data-filter-count>100</span></button>
        <button class="filter" data-filter="Writing">Writing <span data-filter-count></span></button>
        <button class="filter" data-filter="Coding">Coding <span data-filter-count></span></button>
        <button class="filter" data-filter="Research">Research <span data-filter-count></span></button>
        <button class="filter" data-filter="Evaluation">Evaluation <span data-filter-count></span></button>
        <div class="filter-spacer"></div>
        <span class="sort-label">SORT BY</span>
        <select id="sortSelect" aria-label="Sort tasks">
          <option value="recommended">Recommended</option>
          <option value="pay-high">Pay: high to low</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <div class="task-grid" id="taskGrid" aria-live="polite"></div>
      <div class="load-more-wrap">
        <button class="button button-outline" id="loadMore">Load more opportunities</button>
      </div>
      <div class="browse-more">
        <span>Showing <b id="taskCount">12</b> of <b id="totalTaskCount">100</b> opportunities</span>
        <button class="button button-outline" id="clearFilters">Reset filters <span>↻</span></button>
      </div>
    </section>

    <!-- 03 / Contributor Workspace Section -->
    <section class="workspace-section" id="my-work">
      <div class="section-wrap workspace-inner">
        <div class="workspace-heading">
          <div>
            <div class="eyebrow"><span class="eyebrow-mark">03 /</span> CONTRIBUTOR ACCOUNT</div>
            <h2>Your work.<br>Your progress.</h2>
          </div>
          <p>Use the same email you enter with each task submission to see your graded work and account rating.</p>
        </div>
        <div class="account-bar">
          <label for="accountEmail">Contributor email</label>
          <input id="accountEmail" type="email" placeholder="you@example.com">
          <span class="account-hint">Stored securely in MySQL database `givegrid`.</span>
        </div>
        
        <article class="verification-card" aria-labelledby="verificationTitle">
          <div class="verification-copy">
            <div class="verification-icon" aria-hidden="true">✓</div>
            <div>
              <div class="verification-kicker">ACCOUNT TRUST</div>
              <h3 id="verificationTitle">Verify your identity</h3>
              <p>Confirm your account with a national identity card or passport through a secure identity-check service.</p>
            </div>
          </div>
          <div class="verification-action">
            <span class="verification-status" id="verificationBadge"><i></i> NOT VERIFIED</span>
            <button class="button button-outline" id="startVerification" type="button">Start verification <span>↗</span></button>
          </div>
          <p class="verification-note">Secure ID verification simulation mode. All data is saved to your Laragon MySQL database.</p>
        </article>

        <div class="rating-grid">
          <article class="rating-card rating-main">
            <small>OVERALL RATING</small>
            <strong id="accountRating">—<span>/5</span></strong>
            <p id="ratingNote">Your rating appears after an admin grades approved work.</p>
          </article>
          <article class="rating-card">
            <small>GRADED TASKS</small>
            <strong id="gradedCount">0</strong>
            <p>Approved and graded in MySQL</p>
          </article>
          <article class="rating-card">
            <small>PENDING REVIEW</small>
            <strong id="pendingCount">0</strong>
            <p>Waiting for admin review</p>
          </article>
        </div>

        <div id="accountSecurityState" class="account-security-state" hidden></div>

        <div class="submission-list">
          <div class="list-heading">
            <h3>My submissions</h3>
            <span id="submissionLabel">Enter your email to see your work</span>
          </div>
          <div id="mySubmissions" class="submission-rows"></div>
        </div>
      </div>
    </section>

    <!-- 04 / Admin Section -->
    <section class="admin-section" id="admin">
      <div class="section-wrap admin-inner">
        <div class="workspace-heading">
          <div>
            <div class="eyebrow"><span class="eyebrow-mark">04 /</span> ADMIN WORKSPACE</div>
            <h2>Manage tasks<br>and reviews.</h2>
          </div>
          <p>Post new opportunities, review submissions, and approve work with a score from 1 to 5.</p>
        </div>
        <div class="admin-grid">
          <form class="admin-create" id="taskForm">
            <div class="admin-title">
              <span class="admin-icon">＋</span>
              <div>
                <h3>Create an opportunity</h3>
                <small>New tasks are inserted into the MySQL `tasks` table.</small>
              </div>
            </div>
            <label>Task title
              <input name="title" required maxlength="90" placeholder="e.g. Review a short explanation">
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
            <button class="button button-bright" type="submit">Publish task <span>↗</span></button>
          </form>

          <div class="review-panel">
            <div class="admin-title">
              <span class="admin-icon">✓</span>
              <div>
                <h3>Submission review</h3>
                <small id="reviewCount">No submissions waiting</small>
              </div>
            </div>
            <div id="reviewQueue" class="review-queue"></div>
          </div>
        </div>

        <!-- Security Panel -->
        <div class="security-panel">
          <div class="admin-title">
            <span class="admin-icon">⌑</span>
            <div>
              <h3>Account security</h3>
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
          <p class="security-disclaimer">Admin Security Control: Demonstrates account state flags, country alerts, and permission gating for contributor submissions.</p>
        </div>
      </div>
    </section>

    <!-- 02 / How It Works Section -->
    <section class="how-section" id="how-it-works">
      <div class="section-wrap how-inner">
        <div class="how-intro">
          <div class="eyebrow"><span class="eyebrow-mark">02 /</span> SIMPLE BY DESIGN</div>
          <h2>Your expertise<br>has a place here.</h2>
          <p>From your first profile to your first payout, we keep the process clear and contributor-friendly.</p>
          <a class="button button-bright" href="#opportunities">Find your first task <span>↗</span></a>
        </div>
        <div class="steps">
          <article class="step">
            <span class="step-no">01</span>
            <div>
              <h3>Tell us what you know</h3>
              <p>Build a profile around your skills, experience, and the topics you care about.</p>
            </div>
            <span class="step-icon">◎</span>
          </article>
          <article class="step">
            <span class="step-no">02</span>
            <div>
              <h3>Choose a good fit</h3>
              <p>Browse clear project briefs with the time, requirements, and pay shown upfront.</p>
            </div>
            <span class="step-icon">⌕</span>
          </article>
          <article class="step">
            <span class="step-no">03</span>
            <div>
              <h3>Do thoughtful work</h3>
              <p>Complete tasks on your schedule and get useful guidance when you need it.</p>
            </div>
            <span class="step-icon">✳</span>
          </article>
          <article class="step">
            <span class="step-no">04</span>
            <div>
              <h3>Get paid, keep growing</h3>
              <p>Track your work and earnings, then take on projects that build your expertise.</p>
            </div>
            <span class="step-icon">↗</span>
          </article>
        </div>
      </div>
    </section>

    <!-- Community Quote -->
    <section class="quote-section section-wrap" id="community">
      <div class="quote-mark">“</div>
      <blockquote>“The best part is knowing that careful, human work can make a real difference to the tools people use every day.”</blockquote>
      <div class="quote-by">
        <div class="quote-avatar">N</div>
        <div>
          <b>Nia K.</b>
          <small>Writer &amp; contributor since 2024</small>
        </div>
        <span class="quote-stars">★★★★★</span>
      </div>
    </section>

    <!-- Call to Action Banner -->
    <section class="cta-band">
      <div>
        <div class="eyebrow"><span class="pulse"></span> YOUR NEXT STEP STARTS HERE</div>
        <h2>Bring what you know.</h2>
        <p>There’s a place for your perspective on the grid.</p>
      </div>
      <a class="button button-dark" href="#opportunities">Browse open tasks <span>↗</span></a>
      <div class="cta-orb orb-a"></div>
      <div class="cta-orb orb-b"></div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <a class="brand" href="#top">
      <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
      <span>give<span class="brand-light">grid</span></span>
    </a>
    <p>Human insight for a more thoughtful future. Running on PHP &amp; Laragon MySQL.</p>
    <div class="footer-links">
      <a href="#opportunities">Opportunities</a>
      <a href="#how-it-works">How it works</a>
      <a href="#my-work">My work</a>
      <a href="#admin">Admin</a>
      <a href="mailto:hello@givegrid.example">Contact</a>
    </div>
    <small>© 2026 GiveGrid. Built for people who care about good work.</small>
  </footer>

  <!-- Task Detail / Submission Modal Dialog -->
  <dialog id="taskDialog" class="task-dialog">
    <button class="dialog-close" aria-label="Close dialog">×</button>
    <div id="dialogContent"></div>
  </dialog>

  <!-- Identity Verification Dialog -->
  <dialog id="verificationDialog" class="task-dialog verification-dialog">
    <button class="dialog-close" aria-label="Close dialog">×</button>
    <div class="eyebrow"><span class="pulse"></span> IDENTITY CHECK</div>
    <h2>Verify your identity</h2>
    <p>GiveGrid connects with secure identity-verification services to confirm contributor credentials, protect platform trust, and enable payouts.</p>
    <div class="verification-next">
      <b>Verification Flow Steps:</b>
      <span>Upload government ID or passport</span>
      <span>Automated liveness facial biometric verification</span>
      <span>Instant verified badge applied to contributor profile</span>
    </div>
    <form id="verifySimForm" style="display:grid; gap:10px; margin-top:15px;">
      <label style="font-size:10px; color:#aebbb5;">Document Type:
        <select id="docType" style="width:100%; padding:8px; background:#0b1115; color:#fff; border:1px solid #354047; border-radius:3px; margin-top:4px;">
          <option value="passport">Passport</option>
          <option value="national_id">National ID Card</option>
          <option value="drivers_license">Driver's License</option>
        </select>
      </label>
      <button class="button button-bright" id="verificationDone" type="button">Complete Verification <span>✓</span></button>
    </form>
  </dialog>

  <!-- Log In Dialog -->
  <dialog id="loginDialog" class="task-dialog login-dialog">
    <button class="dialog-close" aria-label="Close dialog">×</button>
    <div class="eyebrow"><span class="pulse"></span> WELCOME BACK</div>
    <h2>Good to see you.</h2>
    <p>Sign in to view your contributor workspace and track submissions.</p>
    <form id="loginForm">
      <label>Email address
        <input type="email" id="loginEmailInput" placeholder="you@example.com" required>
      </label>
      <button class="button button-bright" type="submit">Continue <span>→</span></button>
    </form>
  </dialog>

  <!-- Floating Toast Notification -->
  <div class="toast" id="toast" role="status"></div>
</body>
</html>
