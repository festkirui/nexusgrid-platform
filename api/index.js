// api/index.js — NexusGrid REST API (Node.js Serverless — Vercel)
const { query, bcrypt } = require('./_db');
const crypto = require('crypto');

function setCorsHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function getBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

function json(res, status, data) {
  res.status(status).json(data);
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || '';
  const method = req.method;

  try {
    // ── 0. AUTH: LOGIN ────────────────────────────────────────────────────────
    if (action === 'login') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const password = (body.password || '').trim();

      if (!email || !password) return json(res, 400, { error: 'Email and password are required.' });

      const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
      const user = rows[0];

      if (!user) return json(res, 401, { error: 'Account not found. Only administrator-authorized users can log in.' });
      if (user.status === 'disabled') return json(res, 403, { error: 'This account has been disabled by the administrator.' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return json(res, 401, { error: 'Invalid password credentials.' });

      const authToken = crypto.randomBytes(24).toString('hex');
      await query('UPDATE users SET auth_token = $1, last_login = NOW() WHERE id = $2', [authToken, user.id]);

      return json(res, 200, {
        success: true,
        token: authToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
      });
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    if (action === 'logout') {
      const body = method === 'POST' ? await getBody(req) : {};
      const token = body.token || req.query.token || '';
      if (token) await query('UPDATE users SET auth_token = NULL WHERE auth_token = $1', [token]);
      return json(res, 200, { success: true });
    }

    // ── CURRENT USER ──────────────────────────────────────────────────────────
    if (action === 'current_user') {
      let token = req.query.token || '';
      if (!token) {
        const auth = req.headers.authorization || '';
        const m = auth.match(/Bearer\s+(\S+)/);
        if (m) token = m[1];
      }
      if (!token) return json(res, 200, { user: null });
      const { rows } = await query('SELECT id, name, email, role, status FROM users WHERE auth_token = $1 LIMIT 1', [token]);
      return json(res, 200, { user: rows[0] || null });
    }

    // ── ADMIN: ADD USER ───────────────────────────────────────────────────────
    if (action === 'admin_add_user') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const name = (body.name || '').trim();
      const email = (body.email || '').toLowerCase().trim();
      const password = (body.password || '').trim();
      const role = ['admin', 'contributor'].includes(body.role) ? body.role : 'contributor';

      if (!name || !email || !password) return json(res, 400, { error: 'Name, email, and initial password are required.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'Please provide a valid email address.' });

      const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
      if (existing.rows.length) return json(res, 409, { error: 'A user with this email already exists.' });

      const hash = await bcrypt.hash(password, 10);
      const result = await query(
        "INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id",
        [name, email, hash, role]
      );
      return json(res, 200, {
        success: true,
        user: { id: result.rows[0].id, name, email, role, status: 'active', login_password: password }
      });
    }

    // ── ADMIN: LIST USERS ─────────────────────────────────────────────────────
    if (action === 'admin_list_users') {
      const { rows } = await query(`
        SELECT 
          u.id, u.name, u.email, u.role, u.status,
          u.created_at AS "createdAt", u.last_login AS "lastLogin",
          COUNT(CASE WHEN s.status = 'approved' THEN 1 END) AS tasks_completed,
          COUNT(CASE WHEN s.status = 'pending' THEN 1 END) AS tasks_pending,
          COUNT(s.id) AS tasks_total,
          COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.pay ELSE 0 END), 0.00) AS accumulated_money,
          ROUND(CAST(AVG(CASE WHEN s.status = 'approved' AND s.score IS NOT NULL THEN s.score END) AS numeric), 1) AS avg_rating
        FROM users u
        LEFT JOIN submissions s ON LOWER(u.email) = LOWER(s.contributor_email)
        GROUP BY u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_login
        ORDER BY u.id DESC
      `);
      return json(res, 200, rows);
    }

    // ── ADMIN: STATS ──────────────────────────────────────────────────────────
    if (action === 'admin_stats') {
      const [pending, users, tasks, sec, approved] = await Promise.all([
        query("SELECT COUNT(*) FROM submissions WHERE status = 'pending'"),
        query('SELECT COUNT(*) FROM users'),
        query('SELECT COUNT(*) FROM tasks'),
        query('SELECT COUNT(*) FROM account_controls'),
        query("SELECT COUNT(*), COALESCE(SUM(pay), 0) FROM submissions WHERE status = 'approved'"),
      ]);
      return json(res, 200, {
        pendingCount: parseInt(pending.rows[0].count),
        userCount: parseInt(users.rows[0].count),
        taskCount: parseInt(tasks.rows[0].count),
        secCount: parseInt(sec.rows[0].count),
        approvedCount: parseInt(approved.rows[0].count),
        totalPayouts: parseFloat(approved.rows[0].coalesce || 0),
      });
    }

    // ── ADMIN: TOGGLE USER ────────────────────────────────────────────────────
    if (action === 'admin_toggle_user') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const userId = parseInt(body.id || 0);
      const actionType = body.actionType || 'toggle';
      if (!userId) return json(res, 400, { error: 'User ID is required.' });

      if (actionType === 'delete') {
        await query('DELETE FROM users WHERE id = $1', [userId]);
      } else {
        const curr = await query('SELECT status FROM users WHERE id = $1', [userId]);
        let newStatus = curr.rows[0]?.status === 'disabled' ? 'active' : 'disabled';
        if (actionType === 'activate') newStatus = 'active';
        if (actionType === 'disable') newStatus = 'disabled';
        await query('UPDATE users SET status = $1 WHERE id = $2', [newStatus, userId]);
      }
      return json(res, 200, { success: true });
    }

    // ── 1. GET TASKS ──────────────────────────────────────────────────────────
    if (action === 'tasks') {
      const category = req.query.category || 'All';
      const sort = req.query.sort || 'recommended';
      const search = (req.query.search || '').trim();

      let where = [], params = [], idx = 1;
      if (category !== 'All' && category) {
        where.push(`category = $${idx++}`); params.push(category);
      }
      if (search) {
        where.push(`(title ILIKE $${idx} OR description ILIKE $${idx + 1})`);
        params.push(`%${search}%`, `%${search}%`); idx += 2;
      }

      let sql = `SELECT id, task_uid AS uid, category, icon, title, description, 
        how_to_do_it, what_to_submit, time_estimate AS time, difficulty_level AS level,
        no_ai_rule, pay, tag, posted_hours_ago AS posted, stream_id, prompt_text, response_a, response_b
        FROM tasks`;
      if (where.length) sql += ' WHERE ' + where.join(' AND ');
      sql += sort === 'pay-high' ? ' ORDER BY pay DESC' : sort === 'newest' ? ' ORDER BY posted_hours_ago ASC' : ' ORDER BY id ASC';

      const { rows: tasks } = await query(sql, params);
      const countRes = await query('SELECT category, COUNT(*) as cnt FROM tasks GROUP BY category');
      const counts = { All: 0 };
      for (const r of countRes.rows) {
        counts[r.category] = parseInt(r.cnt);
        counts.All += parseInt(r.cnt);
      }
      return json(res, 200, { total: tasks.length, tasks, counts });
    }

    // ── 2. CREATE TASK ────────────────────────────────────────────────────────
    if (action === 'create_task') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const title = (body.title || '').trim();
      const description = (body.description || '').trim();
      const category = body.category || 'Writing';
      const pay = parseFloat(body.pay || 25);
      const time = (body.time || '30 min').trim();
      if (!title || !description) return json(res, 400, { error: 'Title and description are required.' });

      const iconMap = { Writing: '✎', Coding: '⌘', Research: '⌕', Evaluation: '◉', 'Data Entry': '☷', Transcription: '♫' };
      const icon = iconMap[category] || '✳';
      const taskUid = 'T' + Date.now();
      const result = await query(
        "INSERT INTO tasks (task_uid, category, icon, title, description, how_to_do_it, what_to_submit, no_ai_rule, pay, time_estimate, difficulty_level, tag, posted_hours_ago) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'All levels','NEW',0) RETURNING id",
        [taskUid, category, icon, title, description, body.how_to_do_it || '', body.what_to_submit || '', body.no_ai_rule || '', pay, time]
      );
      return json(res, 200, { success: true, task: { id: result.rows[0].id, uid: taskUid, category, icon, title, description, pay, time, level: 'All levels', tag: 'NEW', posted: 0 } });
    }

    // ── 3. GET SUBMISSIONS ────────────────────────────────────────────────────
    if (action === 'submissions') {
      const email = (req.query.email || '').trim();
      const status = (req.query.status || '').trim();
      let where = [], params = [], idx = 1;
      if (email) { where.push(`LOWER(contributor_email) = LOWER($${idx++})`); params.push(email); }
      if (status) { where.push(`status = $${idx++}`); params.push(status); }

      let sql = `SELECT id, sub_uid AS uid, task_id AS "taskId", task_title AS "taskTitle", category,
        contributor_name AS name, contributor_email AS email, response_text AS response,
        status, score, auto_score AS "autoScore", dim_scores AS "dimScores", feedback,
        submitted_at AS "submittedAt", reviewed_at AS "reviewedAt" FROM submissions`;
      if (where.length) sql += ' WHERE ' + where.join(' AND ');
      sql += ' ORDER BY id DESC';

      const { rows } = await query(sql, params);
      return json(res, 200, rows);
    }

    // ── 4. CREATE SUBMISSION ──────────────────────────────────────────────────
    if (action === 'create_submission') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const taskId = (body.taskId || '').trim();
      const name = (body.name || '').trim();
      const email = (body.email || '').toLowerCase().trim();
      let response = (body.response || '').trim();

      if (body.justification) {
        const parts = [];
        if (body.choice) parts.push('WINNER SELECTION: ' + body.choice);
        if (body.verdict) parts.push('TRUTH VERDICT: ' + body.verdict);
        if (body.primaryCategory) parts.push('TAXONOMY CATEGORY: ' + body.primaryCategory);
        if (body.sentiment) parts.push('SENTIMENT GRADE: ' + body.sentiment);
        if (Array.isArray(body.criteria)) parts.push('COMPLIANCE CRITERIA: ' + body.criteria.join(', '));
        parts.push('PROFESSIONAL JUSTIFICATION:\n' + body.justification.trim());
        response = parts.join('\n\n');
      }

      if (!taskId || !name || !email || !response) return json(res, 400, { error: 'All evaluation criteria and justification are required.' });

      const userRes = await query('SELECT id, status FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
      const userRecord = userRes.rows[0];
      if (!userRecord) return json(res, 403, { error: 'Unauthorized account. Only users added by an administrator with valid logins can submit tasks.' });
      if (userRecord.status === 'disabled') return json(res, 403, { error: 'This account has been disabled by the administrator.' });

      const secRes = await query('SELECT status FROM account_controls WHERE LOWER(email) = $1', [email]);
      if (secRes.rows[0]?.status === 'disabled') return json(res, 403, { error: 'This account is paused while the security alert is reviewed.' });

      const dailyRes = await query("SELECT COUNT(*) FROM submissions WHERE LOWER(contributor_email) = $1 AND DATE(submitted_at) = CURRENT_DATE", [email]);
      const dailyCount = parseInt(dailyRes.rows[0].count);
      if (dailyCount >= 2) return json(res, 429, { error: 'Daily limit reached! You can complete a maximum of 2 tasks per day.', dailyLimitReached: true, dailyCount, maxDaily: 2 });

      const taskRes = await query("SELECT title, category, pay FROM tasks WHERE task_uid = $1 OR CAST(id AS VARCHAR) = $2 LIMIT 1", [taskId, String(taskId)]);
      const task = taskRes.rows[0];
      const subUid = 'sub-' + Date.now() + '-' + Math.floor(Math.random() * 900 + 100);
      const autoScore = body.auto_score != null && !isNaN(body.auto_score) ? parseFloat(body.auto_score) : null;
      const dimScores = body.dim_scores && typeof body.dim_scores === 'object' ? JSON.stringify(body.dim_scores) : null;

      const ins = await query(
        "INSERT INTO submissions (sub_uid, task_id, task_title, category, contributor_name, contributor_email, response_text, pay, status, auto_score, dim_scores, submitted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,NOW()) RETURNING id",
        [subUid, taskId, task?.title || 'Task', task?.category || 'General', name, email, response, task?.pay || 25, autoScore, dimScores]
      );
      return json(res, 200, { success: true, id: ins.rows[0].id, uid: subUid, email });
    }

    // ── 5. GRADE SUBMISSION ───────────────────────────────────────────────────
    if (action === 'grade') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const submissionId = body.id || body.submissionId;
      if (!submissionId) return json(res, 400, { error: 'Submission ID is required.' });

      const adminScore = body.score != null && !isNaN(body.score) ? parseFloat(body.score) : null;
      let feedbackLabel = (body.feedback_label || '').trim();
      let feedback = (body.feedback || feedbackLabel).trim();

      const subRes = await query('SELECT contributor_email, contributor_name, auto_score, dim_scores FROM submissions WHERE CAST(id AS VARCHAR) = $1 OR sub_uid = $2 LIMIT 1', [String(submissionId), submissionId]);
      const sub = subRes.rows[0];
      const storedAutoScore = sub?.auto_score ? parseFloat(sub.auto_score) : 0;
      const contributorEmail = (body.contributor_email || sub?.contributor_email || '').toLowerCase();
      const contributorName = body.contributor_name || sub?.contributor_name || 'Contributor';

      let finalScore;
      if (adminScore !== null) {
        const clamped = Math.max(1, Math.min(5, adminScore));
        finalScore = storedAutoScore > 0 ? Math.round((clamped * 0.6 + storedAutoScore * 0.4) * 100) / 100 : clamped;
      } else {
        finalScore = storedAutoScore > 0 ? Math.round(storedAutoScore * 100) / 100 : 3.0;
      }
      finalScore = Math.max(1, Math.min(5, finalScore));

      const label = finalScore >= 4.8 ? 'Very Excellent' : finalScore >= 4 ? 'Excellent' : finalScore >= 3.5 ? 'Good' : finalScore >= 2.5 ? 'Fair' : finalScore >= 1.5 ? 'Poor' : 'Very Poor';
      if (!feedbackLabel) feedbackLabel = label;
      if (!feedback) feedback = feedbackLabel;

      await query("UPDATE submissions SET status = 'approved', score = $1, feedback = $2, reviewed_at = NOW() WHERE CAST(id AS VARCHAR) = $3 OR sub_uid = $4", [finalScore, feedback, String(submissionId), submissionId]);
      return json(res, 200, { success: true, emailSent: false, finalScore, adminScore, autoScore: storedAutoScore, feedbackLabel, feedback });
    }

    // ── 5b. ADMIN NOTIFY ──────────────────────────────────────────────────────
    if (action === 'admin_notify') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      return json(res, 200, { success: true, emailSent: false, note: 'Email delivery requires an SMTP service (e.g. Resend, SendGrid). Configure SMTP_API_KEY to enable.' });
    }

    // ── 6. CONTRIBUTOR ACCOUNT STATS ─────────────────────────────────────────
    if (action === 'account') {
      const email = (req.query.email || '').toLowerCase().trim();
      if (!email) return json(res, 200, { email: '', isAuthorized: false, rating: null, gradedCount: 0, pendingCount: 0, totalCount: 0, isVerified: false, security: null });

      const [userRes, statsRes, verifiedRes, secRes, todayRes] = await Promise.all([
        query('SELECT id, name, status, role FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]),
        query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='approved' AND score IS NOT NULL THEN 1 ELSE 0 END) AS graded, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending, AVG(CASE WHEN status='approved' AND score IS NOT NULL THEN score ELSE NULL END) AS avg_score, COALESCE(SUM(CASE WHEN status='approved' THEN pay ELSE 0 END),0) AS earned FROM submissions WHERE LOWER(contributor_email)=$1`, [email]),
        query('SELECT doc_type, verified_at FROM verified_contributors WHERE LOWER(email) = $1', [email]),
        query('SELECT status, country, flagged_at FROM account_controls WHERE LOWER(email) = $1', [email]),
        query("SELECT COUNT(*) FROM submissions WHERE LOWER(contributor_email)=$1 AND DATE(submitted_at)=CURRENT_DATE", [email]),
      ]);

      const user = userRes.rows[0];
      const stats = statsRes.rows[0];
      const todayCount = parseInt(todayRes.rows[0].count);
      return json(res, 200, {
        email, isAuthorized: user?.status === 'active',
        userName: user?.name || null, userRole: user?.role || null, userStatus: user?.status || 'not_registered',
        rating: stats.avg_score != null ? Math.round(parseFloat(stats.avg_score) * 10) / 10 : null,
        gradedCount: parseInt(stats.graded || 0), pendingCount: parseInt(stats.pending || 0),
        totalCount: parseInt(stats.total || 0),
        accumulatedMoney: Math.round(parseFloat(stats.earned || 0) * 100) / 100,
        todayCount, maxDaily: 2, canSubmitToday: todayCount < 2,
        isVerified: verifiedRes.rows.length > 0,
        security: secRes.rows[0] || null,
      });
    }

    // ── 7. VERIFY ID ──────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const docType = (body.docType || 'passport').trim();
      if (!email) return json(res, 400, { error: 'Email is required.' });

      await query('INSERT INTO verified_contributors (email, doc_type, verified_at) VALUES ($1,$2,NOW()) ON CONFLICT (email) DO UPDATE SET doc_type=EXCLUDED.doc_type, verified_at=NOW()', [email, docType]);
      return json(res, 200, { success: true, verified: true, email });
    }

    // ── 8. SECURITY ───────────────────────────────────────────────────────────
    if (action === 'security') {
      const { rows } = await query('SELECT email, status, country, flagged_at AS "flaggedAt" FROM account_controls ORDER BY id DESC');
      const accounts = {};
      for (const r of rows) accounts[r.email] = r;
      return json(res, 200, accounts);
    }

    if (action === 'security_flag') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const country = (body.country || 'Unknown Country').trim();
      if (!email) return json(res, 400, { error: 'Email is required.' });

      await query("INSERT INTO account_controls (email, status, country, flagged_at) VALUES ($1,'flagged',$2,NOW()) ON CONFLICT (email) DO UPDATE SET status='flagged', country=EXCLUDED.country, flagged_at=NOW()", [email, country]);
      return json(res, 200, { success: true, email, status: 'flagged', country });
    }

    if (action === 'security_action') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const email = (body.email || '').toLowerCase().trim();
      const actionType = (body.actionType || '').trim();

      if (actionType === 'clear') {
        await query('DELETE FROM account_controls WHERE LOWER(email) = $1', [email]);
      } else if (actionType === 'disable' || actionType === 'restore') {
        const newStatus = actionType === 'disable' ? 'disabled' : 'active';
        await query('UPDATE account_controls SET status = $1 WHERE LOWER(email) = $2', [newStatus, email]);
      }
      return json(res, 200, { success: true });
    }

    // ── 9. WORK STREAMS ───────────────────────────────────────────────────────
    if (action === 'work_streams') {
      const { rows: streams } = await query('SELECT * FROM work_streams ORDER BY base_rate DESC');
      for (const s of streams) {
        const c = await query('SELECT COUNT(*) FROM tasks WHERE stream_id = $1', [s.id]);
        s.task_count = parseInt(c.rows[0].count);
      }
      return json(res, 200, { success: true, source: 'https://www.nexusgrid.site/dashboard', protocol: 'United States AI Alignment Protocol', streams });
    }

    // ── 10. ASSESSMENT ────────────────────────────────────────────────────────
    if (action === 'assessment_test') {
      const { rows } = await query('SELECT id, question_text, option_a, option_b, option_c, option_d FROM assessment_questions ORDER BY id ASC');
      const assessmentData = rows.map(r => ({ id: r.id, q: r.question_text, options: [r.option_a, r.option_b, r.option_c, r.option_d] }));
      return json(res, 200, { success: true, threshold: '70%', assessmentData });
    }

    if (action === 'submit_assessment') {
      if (method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
      const body = await getBody(req);
      const answers = body.answers || [];
      const { rows } = await query('SELECT id, correct_index FROM assessment_questions ORDER BY id ASC');
      let correct = 0;
      rows.forEach((r, i) => { if (answers[i] !== undefined && parseInt(answers[i]) === parseInt(r.correct_index)) correct++; });
      const score = rows.length ? Math.round((correct / rows.length) * 100) : 0;
      const passed = score >= 70;
      return json(res, 200, { success: true, score, passed, message: passed ? 'Security clearance granted. Production work streams unlocked.' : 'Accuracy threshold (70%) not reached. Review guidelines and re-attempt.' });
    }

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    return json(res, 200, {
      status: 'NexusGrid API — Node.js / Vercel Serverless',
      version: '2.4.0',
      endpoints: { login: '?action=login', tasks: '?action=tasks', submissions: '?action=submissions', account: '?action=account&email=...' }
    });

  } catch (err) {
    console.error('[NexusGrid API Error]', err);
    return json(res, 500, { error: err.message || 'Internal Server Error' });
  }
};
