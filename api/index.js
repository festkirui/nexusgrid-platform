// api/index.js — NexusGrid REST API
// Node.js Serverless Function — Vercel + Supabase PostgreSQL
// ─────────────────────────────────────────────────────────────

const { query, bcrypt } = require('./_db');
const crypto = require('crypto');

// ── Helpers ───────────────────────────────────────────────────────────────────

function setHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function send(res, status, data) {
  res.status(status).json(data);
}

function ok(res, data) { send(res, 200, data); }
function err(res, status, msg) { send(res, status, { error: msg }); }

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body; // already parsed by Vercel
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

async function findActiveAdmin(req) {
  const match = (req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const { rows } = await query(
    "SELECT id FROM users WHERE auth_token=$1 AND role='admin' AND status='active' LIMIT 1",
    [match[1]]
  );
  return rows[0] || null;
}

function escapeEmailHtml(value) {
  return String(value).replace(/[&<>\"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendAccountEmail(email, subject, message) {
  const apiKey = process.env.RESEND_API_KEY;
  const domain = (process.env.RESEND_EMAIL_DOMAIN || '').trim().toLowerCase();
  if (!apiKey || !isValidEmail(email) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    console.warn('[Resend] Account notification skipped: email configuration or recipient is invalid.');
    return false;
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(apiKey);
    const escapedMessage = escapeEmailHtml(message).replace(/\n/g, '<br>');
    const { error } = await resend.emails.send({
      from: `NexusGrid Security <notifications@${domain}>`,
      to: [email],
      subject,
      text: message,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapedMessage}</div>`
    });
    if (error) {
      console.error('[Resend] Account notification failed:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Resend] Account notification failed:', error.message);
    return false;
  }
}

async function findAuthenticatedUser(req, suppliedToken = '') {
  const headerToken = (req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i)?.[1] || '';
  const token = suppliedToken || headerToken;
  if (!token) return null;
  const { rows } = await query(
    "SELECT id, name, email, role, status FROM users WHERE auth_token=$1 AND status='active' LIMIT 1",
    [token]
  );
  return rows[0] || null;
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  setHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action || '';
  const method = req.method;

  try {
    switch (action) {

      // ── AUTH ───────────────────────────────────────────────────────────────

      case 'login': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const email = (b.email || '').toLowerCase().trim();
        const password = (b.password || '').trim();
        if (!email || !password) return err(res, 400, 'Email and password are required.');

        const { rows } = await query('SELECT * FROM users WHERE LOWER(email)=$1 LIMIT 1', [email]);
        const user = rows[0];
        if (!user) return err(res, 401, 'Account not found. Only administrator-authorized users can log in.');
        if (user.status === 'disabled') return err(res, 403, 'This account has been disabled by the administrator.');
        if (!await bcrypt.compare(password, user.password_hash)) return err(res, 401, 'Invalid password credentials.');

        const token = crypto.randomBytes(24).toString('hex');
        await query('UPDATE users SET auth_token=$1, last_login=NOW() WHERE id=$2', [token, user.id]);
        const loginTime = new Date().toISOString();
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown').toString().split(',')[0].trim();
        const securityEmailAccepted = await sendAccountEmail(user.email, 'New sign-in to your NexusGrid account', `A successful sign-in was detected for your NexusGrid account.\nTime: ${loginTime} (UTC)\nIP address: ${ipAddress}\n\nIf this was not you, change your password immediately and contact support.`);
        return ok(res, { success: true, token, securityEmailAccepted, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
      }

      case 'change_password': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const user = await findAuthenticatedUser(req, b.token || '');
        if (!user) return err(res, 401, 'Your session has expired. Please sign in again.');
        const currentPassword = typeof b.currentPassword === 'string' ? b.currentPassword : '';
        const newPassword = typeof b.newPassword === 'string' ? b.newPassword : '';
        if (!currentPassword || !newPassword) return err(res, 400, 'Current and new passwords are required.');
        if (newPassword.length < 12 || newPassword.length > 128 || Buffer.byteLength(newPassword, 'utf8') > 72) return err(res, 400, 'Choose a password of at least 12 characters and no more than 72 UTF-8 bytes.');
        const { rows } = await query('SELECT password_hash FROM users WHERE id=$1 LIMIT 1', [user.id]);
        if (!rows[0] || !await bcrypt.compare(currentPassword, rows[0].password_hash)) {
          return err(res, 403, 'The current password is incorrect.');
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        const token = crypto.randomBytes(24).toString('hex');
        await query('UPDATE users SET password_hash=$1, auth_token=$2 WHERE id=$3', [passwordHash, token, user.id]);
        const emailSent = await sendAccountEmail(user.email, 'Your NexusGrid password was changed', `The password for your NexusGrid account was changed successfully.\n\nIf you did not make this change, contact support immediately and secure your email account.`);
        return ok(res, { success: true, token, emailSent });
      }

      case 'logout': {
        const b = method === 'POST' ? await body(req) : {};
        const token = b.token || req.query.token || '';
        if (token) await query('UPDATE users SET auth_token=NULL WHERE auth_token=$1', [token]);
        return ok(res, { success: true });
      }

      case 'current_user': {
        let token = req.query.token || '';
        if (!token) {
          const m = (req.headers.authorization || '').match(/Bearer\s+(\S+)/);
          if (m) token = m[1];
        }
        if (!token) return ok(res, { user: null });
        const { rows } = await query('SELECT id, name, email, role, status FROM users WHERE auth_token=$1 LIMIT 1', [token]);
        return ok(res, { user: rows[0] || null });
      }

      // ── ADMIN: USER MANAGEMENT ─────────────────────────────────────────────

      case 'admin_add_user': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const name = (b.name || '').trim();
        const email = (b.email || '').toLowerCase().trim();
        const password = (b.password || '').trim();
        const role = ['admin', 'contributor'].includes(b.role) ? b.role : 'contributor';
        if (!name || !email || !password) return err(res, 400, 'Name, email, and password are required.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(res, 400, 'Invalid email address.');

        const exists = await query('SELECT id FROM users WHERE LOWER(email)=$1', [email]);
        if (exists.rows.length) return err(res, 409, 'A user with this email already exists.');

        const hash = await bcrypt.hash(password, 10);
        const { rows } = await query(
          "INSERT INTO users (name,email,password_hash,role,status) VALUES ($1,$2,$3,$4,'active') RETURNING id",
          [name, email, hash, role]
        );
        return ok(res, { success: true, user: { id: rows[0].id, name, email, role, status: 'active', login_password: password } });
      }

      case 'admin_list_users': {
        const { rows } = await query(`
          SELECT u.id, u.name, u.email, u.role, u.status,
            u.created_at AS "createdAt", u.last_login AS "lastLogin",
            COUNT(CASE WHEN s.status='approved' THEN 1 END) AS tasks_completed,
            COUNT(CASE WHEN s.status='pending'  THEN 1 END) AS tasks_pending,
            COUNT(s.id) AS tasks_total,
            COALESCE(SUM(CASE WHEN s.status='approved' THEN s.pay ELSE 0 END),0) AS accumulated_money,
            ROUND(CAST(AVG(CASE WHEN s.status='approved' AND s.score IS NOT NULL THEN s.score END) AS numeric),1) AS avg_rating
          FROM users u
          LEFT JOIN submissions s ON LOWER(u.email)=LOWER(s.contributor_email)
          GROUP BY u.id,u.name,u.email,u.role,u.status,u.created_at,u.last_login
          ORDER BY u.id DESC
        `);
        return ok(res, rows);
      }

      case 'admin_stats': {
        const [p, u, t, s, a] = await Promise.all([
          query("SELECT COUNT(*) FROM submissions WHERE status='pending'"),
          query('SELECT COUNT(*) FROM users'),
          query('SELECT COUNT(*) FROM tasks'),
          query('SELECT COUNT(*) FROM account_controls'),
          query("SELECT COUNT(*), COALESCE(SUM(pay),0) FROM submissions WHERE status='approved'"),
        ]);
        return ok(res, {
          pendingCount:  parseInt(p.rows[0].count),
          userCount:     parseInt(u.rows[0].count),
          taskCount:     parseInt(t.rows[0].count),
          secCount:      parseInt(s.rows[0].count),
          approvedCount: parseInt(a.rows[0].count),
          totalPayouts:  parseFloat(a.rows[0].coalesce || 0),
        });
      }

      case 'admin_toggle_user': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const uid = parseInt(b.id || 0);
        const type = b.actionType || 'toggle';
        if (!uid) return err(res, 400, 'User ID is required.');
        if (type === 'delete') {
          await query('DELETE FROM users WHERE id=$1', [uid]);
        } else {
          const curr = await query('SELECT status FROM users WHERE id=$1', [uid]);
          let ns = curr.rows[0]?.status === 'disabled' ? 'active' : 'disabled';
          if (type === 'activate') ns = 'active';
          if (type === 'disable')  ns = 'disabled';
          await query('UPDATE users SET status=$1 WHERE id=$2', [ns, uid]);
        }
        return ok(res, { success: true });
      }

      // ── TASKS ──────────────────────────────────────────────────────────────

      case 'task_access': {
        if (method !== 'GET') return err(res, 405, 'Method Not Allowed');
        const user = await findAuthenticatedUser(req);
        if (!user || user.role !== 'contributor') return err(res, 401, 'Please sign in with an authorized contributor account.');
        const control = await query('SELECT status, country FROM account_controls WHERE LOWER(email)=$1', [user.email.toLowerCase()]);
        const status = control.rows[0]?.status || 'active';
        if (['flagged', 'disabled'].includes(status)) {
          return send(res, 403, { error: 'Task access is unavailable while your account is under security review.', status, country: control.rows[0]?.country || null });
        }
        return ok(res, { allowed: true });
      }

      case 'tasks': {
        const suppliedToken = (req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i)?.[1] || '';
        if (suppliedToken) {
          const user = await findAuthenticatedUser(req, suppliedToken);
          if (!user || user.role !== 'contributor') return err(res, 401, 'Please sign in with an authorized contributor account.');
          const control = await query('SELECT status FROM account_controls WHERE LOWER(email)=$1', [user.email.toLowerCase()]);
          if (['flagged', 'disabled'].includes(control.rows[0]?.status)) {
            return err(res, 403, 'Task access is unavailable while your account is under security review.');
          }
        }
        const category = req.query.category || 'All';
        const sort     = req.query.sort || 'recommended';
        const search   = (req.query.search || '').trim();
        const where = [], params = [];
        let i = 1;
        if (category !== 'All' && category) { where.push(`category=$${i++}`); params.push(category); }
        if (search) { where.push(`(title ILIKE $${i} OR description ILIKE $${i+1})`); params.push(`%${search}%`, `%${search}%`); i+=2; }

        const orderBy = sort === 'pay-high' ? 'pay DESC' : sort === 'newest' ? 'posted_hours_ago ASC' : 'id ASC';
        const sql = `SELECT id, task_uid AS uid, category, icon, title, description,
          how_to_do_it, what_to_submit, time_estimate AS time, difficulty_level AS level,
          no_ai_rule, pay, tag, posted_hours_ago AS posted, stream_id, prompt_text, response_a, response_b
          FROM tasks${where.length ? ' WHERE '+where.join(' AND ') : ''} ORDER BY ${orderBy}`;

        const { rows: tasks } = await query(sql, params);
        const counts = { All: 0 };
        const cr = await query('SELECT category, COUNT(*) cnt FROM tasks GROUP BY category');
        for (const r of cr.rows) { counts[r.category] = parseInt(r.cnt); counts.All += parseInt(r.cnt); }
        return ok(res, { total: tasks.length, tasks, counts });
      }

      case 'create_task': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const title = (b.title || '').trim();
        const desc  = (b.description || '').trim();
        if (!title || !desc) return err(res, 400, 'Title and description are required.');
        const cat  = b.category || 'Writing';
        const pay  = parseFloat(b.pay || 25);
        const time = (b.time || '30 min').trim();
        const icons = { Writing:'✎', Coding:'⌘', Research:'⌕', Evaluation:'◉', 'Data Entry':'☷', Transcription:'♫', QA:'⚙', Annotation:'🏷' };
        const icon = icons[cat] || '✳';
        const uid  = 'T' + Date.now();
        const { rows } = await query(
          "INSERT INTO tasks (task_uid,category,icon,title,description,how_to_do_it,what_to_submit,no_ai_rule,pay,time_estimate,difficulty_level,tag,posted_hours_ago) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'All levels','NEW',0) RETURNING id",
          [uid,cat,icon,title,desc,b.how_to_do_it||'',b.what_to_submit||'',b.no_ai_rule||'',pay,time]
        );
        return ok(res, { success:true, task:{ id:rows[0].id, uid, category:cat, icon, title, description:desc, pay, time, level:'All levels', tag:'NEW', posted:0 } });
      }

      case 'delete_task': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const tid = parseInt(b.id || 0);
        if (!tid) return err(res, 400, 'Task ID is required.');
        await query('DELETE FROM tasks WHERE id=$1', [tid]);
        return ok(res, { success: true });
      }

      // ── SUBMISSIONS ────────────────────────────────────────────────────────

      case 'submissions': {
        const requestedEmail = (req.query.email || '').trim().toLowerCase();
        let email = '';
        if (requestedEmail) {
          const user = await findAuthenticatedUser(req);
          if (!user || user.email.toLowerCase() !== requestedEmail) return err(res, 401, 'You can only view submissions for your signed-in account.');
          email = user.email;
        } else if (!await findActiveAdmin(req)) {
          return err(res, 403, 'Administrator authorization is required to view all submissions.');
        }
        const status = (req.query.status || '').trim();
        const where  = [], params = [];
        let i = 1;
        if (email)  { where.push(`LOWER(contributor_email)=LOWER($${i++})`); params.push(email); }
        if (status) { where.push(`status=$${i++}`); params.push(status); }
        const sql = `SELECT id, sub_uid AS uid, task_id AS "taskId", task_title AS "taskTitle", category,
          contributor_name AS name, contributor_email AS email, response_text AS response,
          status, score, auto_score AS "autoScore", dim_scores AS "dimScores",
          feedback, submitted_at AS "submittedAt", reviewed_at AS "reviewedAt"
          FROM submissions${where.length ? ' WHERE '+where.join(' AND ') : ''} ORDER BY id DESC`;
        const { rows } = await query(sql, params);
        return ok(res, rows);
      }

      case 'create_submission': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const user = await findAuthenticatedUser(req, b.token || '');
        if (!user || user.role !== 'contributor') return err(res, 401, 'Please sign in with an authorized contributor account.');
        const taskId = String(b.taskId ?? '').trim();
        const name   = user.name;
        const email  = user.email.toLowerCase();
        let response = (b.response || '').trim();

        if (b.justification) {
          const parts = [];
          if (b.choice)          parts.push('WINNER SELECTION: '    + b.choice);
          if (b.verdict)         parts.push('TRUTH VERDICT: '       + b.verdict);
          if (b.primaryCategory) parts.push('TAXONOMY CATEGORY: '   + b.primaryCategory);
          if (b.sentiment)       parts.push('SENTIMENT GRADE: '     + b.sentiment);
          if (Array.isArray(b.criteria)) parts.push('COMPLIANCE CRITERIA: ' + b.criteria.join(', '));
          parts.push('PROFESSIONAL JUSTIFICATION:\n' + b.justification.trim());
          response = parts.join('\n\n');
        }

        if (!taskId || !name || !email || !response) return err(res, 400, 'All evaluation fields are required.');

        const sr = await query('SELECT status FROM account_controls WHERE LOWER(email)=$1', [email]);
        if (['flagged', 'disabled'].includes(sr.rows[0]?.status)) {
          return err(res, 403, 'Task submissions are disabled while your account is under security review.');
        }

        const dr = await query("SELECT COUNT(*) FROM submissions WHERE LOWER(contributor_email)=$1 AND DATE(submitted_at)=CURRENT_DATE", [email]);
        const daily = parseInt(dr.rows[0].count);
        if (daily >= 2) return err(res, 429, 'Daily limit reached. Maximum 2 tasks per day.');

        const tr = await query("SELECT title, category, pay FROM tasks WHERE task_uid=$1 OR CAST(id AS VARCHAR)=$2 LIMIT 1", [taskId, String(taskId)]);
        const task = tr.rows[0];
        const uid = 'sub-' + Date.now() + '-' + Math.floor(Math.random()*900+100);
        const autoScore = (b.auto_score != null && !isNaN(b.auto_score)) ? parseFloat(b.auto_score) : null;
        const dimScores = (b.dim_scores && typeof b.dim_scores === 'object') ? JSON.stringify(b.dim_scores) : null;

        const ins = await query(
          "INSERT INTO submissions (sub_uid,task_id,task_title,category,contributor_name,contributor_email,response_text,pay,status,auto_score,dim_scores,submitted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10,NOW()) RETURNING id",
          [uid, taskId, task?.title||'Task', task?.category||'General', name, email, response, task?.pay||25, autoScore, dimScores]
        );
        const emailSent = await sendAccountEmail(user.email, 'Evaluation received by NexusGrid', `We received your evaluation${task?.title ? ` for “${task.title}”` : ''}. Its status is now pending review. We will email you when there is an update.`);
        return ok(res, { success:true, id:ins.rows[0].id, uid, email, emailSent });
      }

      // ── GRADE ──────────────────────────────────────────────────────────────

      case 'grade': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        if (!await findActiveAdmin(req)) return err(res, 403, 'Administrator authorization is required.');
        const b = await body(req);
        const sid = b.id || b.submissionId;
        if (!sid) return err(res, 400, 'Submission ID is required.');

        const adminScore = (b.score != null && !isNaN(b.score)) ? parseFloat(b.score) : null;
        let feedbackLabel = (b.feedback_label || '').trim();
        let feedback = (b.feedback || feedbackLabel).trim();

        const sr = await query('SELECT contributor_email, contributor_name, task_title, auto_score FROM submissions WHERE CAST(id AS VARCHAR)=$1 OR sub_uid=$2 LIMIT 1', [String(sid), sid]);
        const sub = sr.rows[0];
        if (!sub) return err(res, 404, 'Submission not found.');
        const storedAuto = sub.auto_score ? parseFloat(sub.auto_score) : 0;

        let final;
        if (adminScore !== null) {
          const clamped = Math.max(1, Math.min(5, adminScore));
          final = storedAuto > 0 ? Math.round((clamped*0.6 + storedAuto*0.4)*100)/100 : clamped;
        } else {
          final = storedAuto > 0 ? Math.round(storedAuto*100)/100 : 3.0;
        }
        final = Math.max(1, Math.min(5, final));

        const grade = (s) => s>=4.8?'Very Excellent':s>=4?'Excellent':s>=3.5?'Good':s>=2.5?'Fair':s>=1.5?'Poor':'Very Poor';
        if (!feedbackLabel) feedbackLabel = grade(final);
        if (!feedback) feedback = feedbackLabel;

        await query("UPDATE submissions SET status='approved',score=$1,feedback=$2,reviewed_at=NOW() WHERE CAST(id AS VARCHAR)=$3 OR sub_uid=$4", [final, feedback, String(sid), sid]);
        const emailSent = await sendAccountEmail(sub.contributor_email, 'Your NexusGrid evaluation was reviewed', `Your evaluation${sub.task_title ? ` for “${sub.task_title}”` : ''} has been reviewed and approved.\nScore: ${final.toFixed(2)}/5\nFeedback: ${feedback}`);
        return ok(res, { success:true, finalScore:final, adminScore, autoScore:storedAuto, feedbackLabel, feedback, emailSent });
      }

      // ── ACCOUNT STATS ──────────────────────────────────────────────────────

      case 'account': {
        const user = await findAuthenticatedUser(req);
        if (!user) return err(res, 401, 'Your session has expired. Please sign in again.');
        const email = user.email.toLowerCase().trim();

        const [sr, vr, secr, dr] = await Promise.all([
          query(`SELECT COUNT(*) total,
            SUM(CASE WHEN status='approved' AND score IS NOT NULL THEN 1 ELSE 0 END) graded,
            SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending,
            AVG(CASE WHEN status='approved' AND score IS NOT NULL THEN score END) avg_score,
            COALESCE(SUM(CASE WHEN status='approved' THEN pay ELSE 0 END),0) earned
            FROM submissions WHERE LOWER(contributor_email)=$1`, [email]),
          query('SELECT doc_type, verified_at FROM verified_contributors WHERE LOWER(email)=$1', [email]),
          query('SELECT status, country, flagged_at FROM account_controls WHERE LOWER(email)=$1', [email]),
          query("SELECT COUNT(*) FROM submissions WHERE LOWER(contributor_email)=$1 AND DATE(submitted_at)=CURRENT_DATE", [email]),
        ]);

        const stats = sr.rows[0];
        const today = parseInt(dr.rows[0].count);

        return ok(res, {
          email, isAuthorized: user?.status === 'active',
          userName: user?.name || null, userRole: user?.role || null, userStatus: user?.status || 'not_registered',
          rating: stats.avg_score != null ? Math.round(parseFloat(stats.avg_score)*10)/10 : null,
          gradedCount:  parseInt(stats.graded  || 0),
          pendingCount: parseInt(stats.pending || 0),
          totalCount:   parseInt(stats.total   || 0),
          accumulatedMoney: Math.round(parseFloat(stats.earned||0)*100)/100,
          todayCount: today, maxDaily: 2, canSubmitToday: today < 2,
          isVerified: vr.rows.length > 0,
          security: secr.rows[0] || null,
        });
      }

      // ── PAYMENT METHODS ────────────────────────────────────────────────────

      case 'save_payment_method': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const user = await findAuthenticatedUser(req, b.token || '');
        if (!user) return err(res, 401, 'Your session has expired. Please sign in again.');
        const email = user.email.toLowerCase();
        const type  = (b.method_type || '').trim(); // 'bank' | 'paypal' | 'stripe'
        if (!['bank','paypal','stripe'].includes(type)) return err(res, 400, 'Invalid method type. Use: bank, paypal, or stripe.');

        // If marking as primary, clear existing primary for this email
        if (b.is_primary) {
          await query('UPDATE payment_methods SET is_primary=false WHERE LOWER(email)=$1', [email]);
        }

        const { rows } = await query(`
          INSERT INTO payment_methods (email, method_type, account_name, account_number, routing_number, paypal_email, stripe_account_id, is_primary)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (email, method_type) DO UPDATE SET
            account_name=EXCLUDED.account_name, account_number=EXCLUDED.account_number,
            routing_number=EXCLUDED.routing_number, paypal_email=EXCLUDED.paypal_email,
            stripe_account_id=EXCLUDED.stripe_account_id, is_primary=EXCLUDED.is_primary,
            updated_at=NOW()
          RETURNING id, method_type, account_name, account_number, routing_number, paypal_email, stripe_account_id, is_primary
        `, [
          email, type,
          b.account_name   || null,
          b.account_number || null,
          b.routing_number || null,
          b.paypal_email   || null,
          b.stripe_account_id || null,
          b.is_primary ? true : false,
        ]);
        const emailSent = await sendAccountEmail(user.email, 'Payout method updated', `A ${type} payout method was added or updated for your NexusGrid account.\n\nIf you did not make this change, change your password immediately and contact support.`);
        return ok(res, { success: true, emailSent, paymentMethod: rows[0] });
      }

      case 'delete_payment_method': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const user = await findAuthenticatedUser(req, b.token || '');
        if (!user) return err(res, 401, 'Your session has expired. Please sign in again.');
        const email = user.email.toLowerCase();
        const type  = (b.method_type || '').trim();
        if (!['bank','paypal','stripe'].includes(type)) return err(res, 400, 'Invalid payment method.');
        const removed = await query('DELETE FROM payment_methods WHERE LOWER(email)=$1 AND method_type=$2', [email, type]);
        const emailSent = removed.rowCount
          ? await sendAccountEmail(user.email, 'Payout method removed', `Your ${type} payout method was removed from your NexusGrid account.\n\nIf you did not make this change, change your password immediately and contact support.`)
          : false;
        return ok(res, { success: true, emailSent });
      }

      case 'get_payment_methods': {
        const user = await findAuthenticatedUser(req);
        if (!user) return err(res, 401, 'Your session has expired. Please sign in again.');
        const { rows } = await query('SELECT id, method_type, account_name, account_number, routing_number, paypal_email, stripe_account_id, is_primary FROM payment_methods WHERE LOWER(email)=$1 ORDER BY is_primary DESC, id ASC', [user.email.toLowerCase()]);
        return ok(res, rows);
      }

      // ── VERIFY ─────────────────────────────────────────────────────────────

      case 'verify': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const email = (b.email || '').toLowerCase().trim();
        const docType = (b.docType || 'passport').trim();
        if (!email) return err(res, 400, 'Email is required.');
        await query('INSERT INTO verified_contributors (email, doc_type, verified_at) VALUES ($1,$2,NOW()) ON CONFLICT (email) DO UPDATE SET doc_type=EXCLUDED.doc_type, verified_at=NOW()', [email, docType]);
        return ok(res, { success:true, verified:true, email });
      }

      // ── SECURITY ───────────────────────────────────────────────────────────

      case 'security': {
        if (!await findActiveAdmin(req)) return err(res, 403, 'Administrator authorization is required.');
        const { rows } = await query('SELECT email, status, country, flagged_at AS "flaggedAt" FROM account_controls ORDER BY id DESC');
        const out = {};
        for (const r of rows) out[r.email] = r;
        return ok(res, out);
      }

      case 'security_flag': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        if (!await findActiveAdmin(req)) return err(res, 403, 'Administrator authorization is required.');
        const b = await body(req);
        const requestedEmail = typeof b.email === 'string' ? b.email.toLowerCase().trim() : '';
        const country = typeof b.country === 'string' && b.country.trim() ? b.country.trim().slice(0, 80) : 'Unknown';
        if (!requestedEmail || !isValidEmail(requestedEmail)) return err(res, 400, 'A valid email is required.');
        const { rows: contributors } = await query("SELECT name, email FROM users WHERE LOWER(email)=$1 AND role='contributor' LIMIT 1", [requestedEmail]);
        const contributor = contributors[0];
        if (!contributor) return err(res, 404, 'No contributor account was found for that email.');
        const email = contributor.email.toLowerCase();
        await query("INSERT INTO account_controls (email,status,country,flagged_at,updated_at) VALUES ($1,'flagged',$2,NOW(),NOW()) ON CONFLICT (email) DO UPDATE SET status='flagged',country=EXCLUDED.country,flagged_at=NOW(),updated_at=NOW()", [email, country]);
        const emailSent = await sendAccountEmail(
          email,
          'Your NexusGrid account is under security review',
          `Hello ${contributor.name},\n\nYour NexusGrid contributor account has been flagged for a security review${country ? ` related to an alert from ${country}` : ''}. While the review is pending, access to tasks and task submissions is disabled.\n\nIf you believe this is a mistake, please contact NexusGrid support.`
        );
        return ok(res, { success:true, email, status:'flagged', country, emailSent });
      }

      case 'security_action': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        if (!await findActiveAdmin(req)) return err(res, 403, 'Administrator authorization is required.');
        const b = await body(req);
        const email = typeof b.email === 'string' ? b.email.toLowerCase().trim() : '';
        const type  = typeof b.actionType === 'string' ? b.actionType.trim() : '';
        if (!email || !isValidEmail(email)) return err(res, 400, 'A valid email is required.');
        if (type === 'clear') {
          await query('DELETE FROM account_controls WHERE LOWER(email)=$1', [email]);
        } else if (type === 'disable' || type === 'restore') {
          await query('UPDATE account_controls SET status=$1, updated_at=NOW() WHERE LOWER(email)=$2', [type==='disable'?'disabled':'active', email]);
        } else {
          return err(res, 400, 'Invalid account action.');
        }
        return ok(res, { success:true });
      }

      // ── WORK STREAMS ───────────────────────────────────────────────────────

      case 'work_streams': {
        const { rows } = await query('SELECT * FROM work_streams ORDER BY base_rate DESC');
        for (const s of rows) {
          const c = await query('SELECT COUNT(*) FROM tasks WHERE stream_id=$1', [s.id]);
          s.task_count = parseInt(c.rows[0].count);
        }
        return ok(res, { success:true, streams: rows });
      }

      // ── ASSESSMENT ─────────────────────────────────────────────────────────

      case 'assessment_test': {
        const { rows } = await query('SELECT id, question_text, option_a, option_b, option_c, option_d FROM assessment_questions ORDER BY id ASC');
        return ok(res, { success:true, threshold:'70%', assessmentData: rows.map(r => ({ id:r.id, q:r.question_text, options:[r.option_a,r.option_b,r.option_c,r.option_d] })) });
      }

      case 'submit_assessment': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        const b = await body(req);
        const answers = b.answers || [];
        const { rows } = await query('SELECT id, correct_index FROM assessment_questions ORDER BY id ASC');
        let correct = 0;
        rows.forEach((r, i) => { if (answers[i] !== undefined && parseInt(answers[i]) === parseInt(r.correct_index)) correct++; });
        const score = rows.length ? Math.round((correct/rows.length)*100) : 0;
        const passed = score >= 70;
        return ok(res, { success:true, score, passed, message: passed ? 'Security clearance granted. Production streams unlocked.' : 'Score below 70%. Review guidelines and retry.' });
      }

      // ── ADMIN NOTIFY ───────────────────────────────────────────────────────

      case 'admin_notify': {
        if (method !== 'POST') return err(res, 405, 'Method Not Allowed');
        if (!await findActiveAdmin(req)) return err(res, 403, 'Administrator authorization is required.');

        const b = await body(req);
        const subject = typeof b.subject === 'string' ? b.subject.trim() : '';
        const message = typeof b.message === 'string' ? b.message.trim() : '';
        const sendAll = b.send_all === true;
        const toEmail = typeof b.to_email === 'string' ? b.to_email.trim().toLowerCase() : '';
        if (!subject || !message) return err(res, 400, 'Subject and message are required.');
        if (subject.length > 200 || message.length > 2000 || /[\r\n]/.test(subject)) {
          return err(res, 400, 'Subject or message exceeds the allowed length.');
        }
        if (!sendAll && !isValidEmail(toEmail)) return err(res, 400, 'A valid contributor email is required.');

        const apiKey = process.env.RESEND_API_KEY;
        const domain = (process.env.RESEND_EMAIL_DOMAIN || '').trim().toLowerCase();
        if (!apiKey || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
          return err(res, 503, 'Email sending is not configured.');
        }

        let recipients;
        if (sendAll) {
          const { rows } = await query(
            "SELECT DISTINCT LOWER(email) AS email FROM users WHERE role='contributor' AND status='active' AND email IS NOT NULL"
          );
          recipients = rows.map(row => row.email).filter(isValidEmail);
          if (!recipients.length) return err(res, 404, 'No active contributors with valid email addresses were found.');
        } else {
          const { rows } = await query(
            "SELECT LOWER(email) AS email FROM users WHERE LOWER(email)=$1 AND role='contributor' AND status='active' LIMIT 1",
            [toEmail]
          );
          if (!rows.length) return err(res, 404, 'No active contributor was found for that email address.');
          recipients = [rows[0].email];
        }

        const { Resend } = require('resend');
        const resend = new Resend(apiKey);
        const from = `NexusGrid <notifications@${domain}>`;
        const escapedMessage = escapeEmailHtml(message).replace(/\n/g, '<br>');
        const emailPayload = email => ({
          from,
          to: [email],
          subject,
          text: message,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapedMessage}</div>`
        });

        let accepted = 0;
        let failed = 0;
        if (!sendAll) {
          const { data, error } = await resend.emails.send(emailPayload(recipients[0]));
          if (error) {
            console.error('[Resend] Individual email failed:', error.message);
            return err(res, 502, 'Resend could not accept the email. Check the sender domain and provider configuration.');
          }
          accepted = data ? 1 : 0;
          failed = accepted ? 0 : 1;
        } else {
          for (let offset = 0; offset < recipients.length; offset += 100) {
            const batch = recipients.slice(offset, offset + 100).map(emailPayload);
            const { data, error } = await resend.batch.send(batch, { idempotencyKey: crypto.randomUUID() });
            if (error) {
              failed += batch.length;
              console.error('[Resend] Contributor email batch failed:', error.message);
            } else {
              accepted += batch.length;
            }
          }
        }

        if (!accepted) return err(res, 502, 'Resend could not accept any of the emails.');
        return ok(res, {
          success: true,
          emailAccepted: !sendAll,
          accepted,
          failed,
          total: recipients.length
        });
      }

      // ── DEFAULT ────────────────────────────────────────────────────────────

      default:
        return ok(res, {
          name: 'NexusGrid API', version: '3.0.0', runtime: 'Node.js / Vercel Serverless',
          database: 'Supabase PostgreSQL',
          endpoints: ['login','logout','current_user','admin_add_user','admin_list_users','admin_stats','admin_toggle_user','admin_notify','tasks','task_access','create_task','submissions','create_submission','grade','account','save_payment_method','delete_payment_method','get_payment_methods','verify','security','security_flag','security_action','work_streams','assessment_test','submit_assessment']
        });
    }
  } catch (e) {
    console.error('[NexusGrid API Error]', e.message);
    return send(res, 500, { error: e.message || 'Internal Server Error' });
  }
};
