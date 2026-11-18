<?php
/**
 * NexusGrid — Human Intelligence & AI Alignment Platform
 * Production Enterprise Edition
 */
require_once __DIR__ . '/db.php';
initAndSeedDatabase();
$appVersion = '2.4.0';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090d12">
  <meta name="description" content="NexusGrid connects qualified contributors with high-impact AI alignment, RLHF preference ranking, and factual evaluation tasks.">
  <title>NexusGrid — AI Alignment &amp; Model Evaluation Platform</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%2300dfa2'/><path d='M30 50 L50 30 L70 50 L50 70 Z' fill='%23090d12'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css?v=<?= $appVersion ?>">
  <script src="app.js?v=<?= $appVersion ?>" defer></script>
</head>
<body>
  <!-- Header / Navigation -->
  <header class="topbar">
    <a class="brand" href="#top" aria-label="NexusGrid home">
      <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
      <span>nexus<span class="brand-light">grid</span></span>
    </a>
    <nav class="main-nav" aria-label="Main navigation">
      <a href="#opportunities">Opportunities</a>
      <a href="#my-work">My work</a>
      <a href="#how-it-works">How it works</a>
      <a href="admin.php" style="color:var(--mint);">Admin Portal ↗</a>
    </nav>
    <div class="nav-actions">
      <div id="authStatusBadge" style="display:none;" class="user-logged-badge">
        <span id="navUserName">👤 Contributor</span>
        <button class="text-button" id="logoutButton" style="color:#ff8787;">Log out</button>
      </div>
      <button class="button button-small button-bright" id="loginButton">authorize me <span>→</span></button>
      <a class="button button-small button-quiet" href="#opportunities">Join the grid <span>↗</span></a>
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
        <div class="eyebrow"><span class="pulse"></span> THE HUMAN SIDE OF ARTIFICIAL INTELLIGENCE</div>
        <h1>Train AI.<br><span>Better intelligence.</span></h1>
        <p class="hero-lead">Put your skills to work on high-impact AI alignment streams. Evaluate model responses, audit factual consistency, and get paid for rigorous feedback.</p>
        <div class="hero-actions">
          <button class="button button-bright" id="heroExploreBtn">Explore streams <span>↗</span></button>
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
        <div class="node node-a"><span class="node-icon">✦</span><b>RLHF</b><small>Preference</small></div>
        <div class="node node-b"><span class="node-icon">⌘</span><b>AUDIT</b><small>Hallucination</small></div>
        <div class="node node-c"><span class="node-icon">◉</span><b>ROUTING</b><small>Taxonomy</small></div>
        <div class="node node-d"><span class="node-icon">↗</span><b>AFFECT</b><small>Sentiment</small></div>
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

    <!-- 01 / Opportunities Section — hidden until logged in -->
    <section class="opportunities section-wrap" id="opportunities" style="display:none;">
      <div class="section-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-mark">01 /</span> ACTIVE WORK STREAMS</div>
          <h2>Select your<br>alignment stream.</h2>
        </div>
        <p>Pick up an alignment task across our active streams. RLHF comparisons, hallucination audits, taxonomy classification, and affective alignment.</p>
      </div>
      <div class="filters-container">
        <div class="filters" id="categoryFilterBar" role="group" aria-label="Filter opportunities">
          <button class="filter active" data-filter="All">All tasks <span data-filter-count>200</span></button>
        </div>
        <div class="sort-wrap">
          <span class="sort-label">SORT BY</span>
          <select id="sortSelect" aria-label="Sort tasks">
            <option value="recommended">Recommended</option>
            <option value="pay-high">Pay: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
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

    <!-- Tasks Login Gate — shown when NOT logged in -->
    <section class="section-wrap" id="tasksLoginGate" style="padding: 80px 0;">
      <div class="tasks-gate-wrap">
        <div class="tasks-gate-icon">🔒</div>
        <div class="eyebrow" style="justify-content:center; margin-bottom:14px;"><span class="pulse"></span> AUTHORIZATION REQUIRED</div>
        <h2 style="text-align:center; margin-bottom:16px;">Tasks are for<br><span>authorized contributors</span> only.</h2>
        <p style="text-align:center; color:#94a3b8; max-width:480px; margin:0 auto 28px; font-size:15px; line-height:1.7;">
          Log in with your contributor credentials to view and complete alignment tasks. Contact your administrator if you do not yet have an account.
        </p>
        <div style="display:flex; justify-content:center; gap:14px; flex-wrap:wrap;">
          <button class="button button-bright" id="gateTasksLoginBtn">authorize me <span>→</span></button>
          <a class="button button-quiet" href="#how-it-works"><span class="play">▶</span> See how it works</a>
        </div>
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
          <p>Only users registered by an administrator can access their contributor account and view ratings.</p>
        </div>

        <!-- Authorization Gate Box (displayed when user is NOT logged in) -->
        <div id="authGateContainer" class="auth-gate-box">
          <div class="eyebrow"><span class="pulse"></span> CONTRIBUTOR LOGIN REQUIRED</div>
          <h3>Authorization Required</h3>
          <p>Your administrator adds contributors and assigns logins. Please authorize your account with the login credentials given to you to access your submissions and track your rating.</p>
          <button class="button button-bright" id="gateAuthBtn">authorize me <span>→</span></button>
        </div>

        <!-- Authenticated Contributor Dashboard -->
        <div id="contributorDashboard" style="display:none;">
          <div class="account-bar">
            <label for="accountEmail">Authorized Contributor</label>
            <input id="accountEmail" type="email" placeholder="you@example.com" readonly style="opacity:0.9;">
            <span class="account-hint" id="authRoleBadge">Authorized Contributor</span>
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
          <p class="verification-note">Secure ID verification simulation mode. All credential records are stored with encryption.</p>
        </article>

        <div class="rating-grid" style="grid-template-columns: repeat(5, 1fr);">
          <article class="rating-card rating-main">
            <small>OVERALL RATING</small>
            <strong id="accountRating">—<span>/5</span></strong>
            <p id="ratingNote">Your rating appears after an admin grades approved work.</p>
          </article>
          <article class="rating-card" style="border-color:#436348;">
            <small>ACCUMULATED EARNINGS</small>
            <strong id="accountEarnings" style="color:var(--mint);">$0.00</strong>
            <p>Total earned from approved tasks</p>
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
          <article class="rating-card" style="border-color:#6366f1;">
            <small>DAILY QUOTA</small>
            <strong id="dailyQuotaCount" style="color:#818cf8;">0<span>/2</span></strong>
            <p id="dailyQuotaNote">Max 2 tasks per day</p>
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
        </div> <!-- End contributorDashboard -->
      </div>
    </section>

    <!-- 02 / How It Works Section -->
    <section class="how-section" id="how-it-works">
      <div class="section-wrap how-inner">
        <div class="how-intro">
          <div class="eyebrow"><span class="eyebrow-mark">02 /</span> SIMPLE BY DESIGN</div>
          <h2>Rigorous AI alignment<br>made streamlined.</h2>
          <p>From your qualification assessment to your first payout, we keep the process clear, fair, and professional.</p>
          <a class="button button-bright" href="#opportunities">Find your first stream <span>↗</span></a>
        </div>
        <div class="steps">
          <article class="step">
            <span class="step-no">01</span>
            <div>
              <h3>Select Active Stream</h3>
              <p>Choose from RLHF Preference, Fact Check Audit, Taxonomy Routing, or Sentiment streams.</p>
            </div>
            <span class="step-icon">◎</span>
          </article>
          <article class="step">
            <span class="step-no">02</span>
            <div>
              <h3>Pass Assessment</h3>
              <p>Complete the compliance test to unlock live production streams with automatic scoring.</p>
            </div>
            <span class="step-icon">⌕</span>
          </article>
          <article class="step">
            <span class="step-no">03</span>
            <div>
              <h3>Evaluate Models</h3>
              <p>Compare outputs, audit citations, and supply 100+ character technical justifications.</p>
            </div>
            <span class="step-icon">✳</span>
          </article>
          <article class="step">
            <span class="step-no">04</span>
            <div>
              <h3>Instant Credit &amp; Growth</h3>
              <p>Track your approved evaluations, accumulated earnings, and quality ratings in real-time.</p>
            </div>
            <span class="step-icon">↗</span>
          </article>
        </div>
      </div>
    </section>

    <!-- Community Quote -->
    <section class="quote-section section-wrap" id="community">
      <div class="quote-mark">“</div>
      <blockquote>“The best part is knowing that careful human alignment directly shapes model safety and reasoning in production.”</blockquote>
      <div class="quote-by">
        <div class="quote-avatar">N</div>
        <div>
          <b>Nia K.</b>
          <small>AI Alignment Specialist &amp; contributor since 2024</small>
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
      <span>nexus<span class="brand-light">grid</span></span>
    </a>
    <p>Guiding intelligence with wisdom. Enterprise AI Alignment Protocol.</p>
    <div class="footer-links">
      <a href="#opportunities">Opportunities</a>
      <a href="#how-it-works">How it works</a>
      <a href="#my-work">My work</a>
      <a href="admin.php">Admin Portal ↗</a>
      <a href="mailto:hello@nexusgrid.site">Contact</a>
    </div>
    <small>© 2026 Nexus Grid AI Security Protocol. All Rights Reserved.</small>
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
    <p>NexusGrid connects with secure identity-verification services to confirm contributor credentials, protect platform trust, and enable payouts.</p>
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

  <!-- Contributor Access Authorization Dialog -->
  <dialog id="loginDialog" class="task-dialog login-dialog">
    <button class="dialog-close" aria-label="Close dialog">×</button>
    <div class="eyebrow"><span class="pulse"></span> CONTRIBUTOR ACCESS</div>
    <h2>Contributor Login</h2>
    <p>Only users who have been given logins by the administrator can access the account. Enter your credentials to authorize access.</p>
    <form id="loginForm">
      <label>Contributor Email
        <input type="email" id="loginEmailInput" placeholder="contributor@example.com" required>
      </label>
      <label>Password / Access Key
        <input type="password" id="loginPasswordInput" placeholder="Password provided by admin" required>
      </label>
      <button class="button button-bright" type="submit" id="authSubmitBtn">authorize me <span>→</span></button>
    </form>
  </dialog>

  <!-- Floating Toast Notification -->
  <div class="toast" id="toast" role="status"></div>
</body>
</html>
