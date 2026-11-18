<?php
/**
 * NexusGrid — REST API Controller
 * Serves JSON responses for tasks, work streams, submissions, contributor account stats, authentication & user management
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
$pdo = getDBConnection();
initAndSeedDatabase();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper to get JSON or POST input
function getRequestData(): array {
    $json = file_get_contents('php://input');
    if (!empty($json)) {
        $data = json_decode($json, true);
        if (is_array($data)) return $data;
    }
    return $_POST;
}

try {
    switch ($action) {
        // --- 0. AUTHENTICATION & LOGIN ---
        case 'login':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $email = strtolower(trim($input['email'] ?? ''));
            $password = trim($input['password'] ?? '');

            if (empty($email) || empty($password)) {
                http_response_code(400);
                echo json_encode(['error' => 'Email and password are required.']);
                exit;
            }

            $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'error' => 'Account not found. Only administrator-authorized users can log in.'
                ]);
                exit;
            }

            if ($user['status'] === 'disabled') {
                http_response_code(403);
                echo json_encode([
                    'error' => 'This account has been disabled by the administrator.'
                ]);
                exit;
            }

            if (!password_verify($password, $user['password_hash'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid password credentials.']);
                exit;
            }

            // Generate token
            $authToken = bin2hex(random_bytes(24));
            $updateStmt = $pdo->prepare("UPDATE users SET auth_token = ?, last_login = NOW() WHERE id = ?");
            $updateStmt->execute([$authToken, $user['id']]);

            echo json_encode([
                'success' => true,
                'token' => $authToken,
                'user' => [
                    'id' => (int)$user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'status' => $user['status']
                ]
            ]);
            break;

        case 'logout':
            $input = getRequestData();
            $token = $input['token'] ?? ($_GET['token'] ?? '');
            if (!empty($token)) {
                $pdo->prepare("UPDATE users SET auth_token = NULL WHERE auth_token = ?")->execute([$token]);
            }
            echo json_encode(['success' => true]);
            break;

        case 'current_user':
            $token = $_GET['token'] ?? '';
            if (empty($token)) {
                $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
                if (preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
                    $token = $matches[1];
                }
            }

            if (empty($token)) {
                echo json_encode(['user' => null]);
                exit;
            }

            $stmt = $pdo->prepare("SELECT id, name, email, role, status FROM users WHERE auth_token = ? LIMIT 1");
            $stmt->execute([$token]);
            $user = $stmt->fetch();
            echo json_encode(['user' => $user ?: null]);
            break;

        // --- ADMIN USER MANAGEMENT ---
        case 'admin_add_user':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $name = trim($input['name'] ?? '');
            $email = strtolower(trim($input['email'] ?? ''));
            $password = trim($input['password'] ?? '');
            $role = in_array($input['role'] ?? '', ['admin', 'contributor']) ? $input['role'] : 'contributor';

            if (empty($name) || empty($email) || empty($password)) {
                http_response_code(400);
                echo json_encode(['error' => 'Name, email, and initial password are required.']);
                exit;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Please provide a valid email address.']);
                exit;
            }

            // Check if user already exists
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ?");
            $checkStmt->execute([$email]);
            if ($checkStmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'A user with this email already exists.']);
                exit;
            }

            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
                INSERT INTO users (name, email, password_hash, role, status)
                VALUES (?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$name, $email, $passwordHash, $role]);

            $newId = (int)$pdo->lastInsertId();
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $newId,
                    'name' => $name,
                    'email' => $email,
                    'role' => $role,
                    'status' => 'active',
                    'login_password' => $password
                ]
            ]);
            break;

        case 'admin_list_users':
            $sql = "
                SELECT 
                    u.id, 
                    u.name, 
                    u.email, 
                    u.role, 
                    u.status, 
                    u.created_at AS createdAt, 
                    u.last_login AS lastLogin,
                    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) AS tasks_completed,
                    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) AS tasks_pending,
                    COUNT(s.id) AS tasks_total,
                    COALESCE(SUM(CASE WHEN s.status = 'approved' THEN s.pay ELSE 0 END), 0.00) AS accumulated_money,
                    ROUND(CAST(AVG(CASE WHEN s.status = 'approved' AND s.score IS NOT NULL THEN s.score END) AS numeric), 1) AS avg_rating
                FROM users u
                LEFT JOIN submissions s ON LOWER(u.email) = LOWER(s.contributor_email)
                GROUP BY u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_login
                ORDER BY u.id DESC
            ";
            $stmt = $pdo->query($sql);
            echo json_encode($stmt->fetchAll());
            break;

        case 'admin_stats':
            $pendingStmt = $pdo->query("SELECT COUNT(*) FROM submissions WHERE status = 'pending'");
            $pendingCount = (int)$pendingStmt->fetchColumn();

            $userStmt = $pdo->query("SELECT COUNT(*) FROM users");
            $userCount = (int)$userStmt->fetchColumn();

            $taskStmt = $pdo->query("SELECT COUNT(*) FROM tasks");
            $taskCount = (int)$taskStmt->fetchColumn();

            $secStmt = $pdo->query("SELECT COUNT(*) FROM account_controls");
            $secCount = (int)$secStmt->fetchColumn();

            $approvedStmt = $pdo->query("SELECT COUNT(*), COALESCE(SUM(pay), 0.00) FROM submissions WHERE status = 'approved'");
            $approvedRow = $approvedStmt->fetch(PDO::FETCH_NUM);
            $approvedCount = (int)($approvedRow[0] ?? 0);
            $totalPayouts = (float)($approvedRow[1] ?? 0);

            echo json_encode([
                'pendingCount' => $pendingCount,
                'userCount' => $userCount,
                'taskCount' => $taskCount,
                'secCount' => $secCount,
                'approvedCount' => $approvedCount,
                'totalPayouts' => round($totalPayouts, 2)
            ]);
            break;

        case 'admin_toggle_user':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $userId = (int)($input['id'] ?? 0);
            $actionType = $input['actionType'] ?? 'toggle'; // 'toggle', 'disable', 'activate', 'delete'

            if (!$userId) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID is required.']);
                exit;
            }

            if ($actionType === 'delete') {
                $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
            } else {
                $statusStmt = $pdo->prepare("SELECT status FROM users WHERE id = ?");
                $statusStmt->execute([$userId]);
                $curr = $statusStmt->fetchColumn();

                $newStatus = ($curr === 'disabled') ? 'active' : 'disabled';
                if ($actionType === 'activate') $newStatus = 'active';
                if ($actionType === 'disable') $newStatus = 'disabled';

                $pdo->prepare("UPDATE users SET status = ? WHERE id = ?")->execute([$newStatus, $userId]);
            }

            echo json_encode(['success' => true]);
            break;

        // --- 1. GET TASKS ---
        case 'tasks':
            $category = $_GET['category'] ?? 'All';
            $sort = $_GET['sort'] ?? 'recommended';
            $search = trim($_GET['search'] ?? '');

            $where = [];
            $params = [];

            if ($category !== 'All' && !empty($category)) {
                $where[] = "category = ?";
                $params[] = $category;
            }

            if (!empty($search)) {
                $where[] = "(title LIKE ? OR description LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }

            $sql = "SELECT id, task_uid AS uid, category, icon, title, description, how_to_do_it, what_to_submit, time_estimate AS time, difficulty_level AS level, no_ai_rule, pay, tag, posted_hours_ago AS posted, stream_id, prompt_text, response_a, response_b FROM tasks";
            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }

            if ($sort === 'pay-high') {
                $sql .= " ORDER BY pay DESC";
            } elseif ($sort === 'newest') {
                $sql .= " ORDER BY posted_hours_ago ASC";
            } else {
                $sql .= " ORDER BY id ASC";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $tasks = $stmt->fetchAll();

            // Total count
            $countStmt = $pdo->query("SELECT category, COUNT(*) as cnt FROM tasks GROUP BY category");
            $counts = ['All' => 0];
            while ($row = $countStmt->fetch()) {
                $counts[$row['category']] = (int)$row['cnt'];
                $counts['All'] += (int)$row['cnt'];
            }

            echo json_encode([
                'total' => count($tasks),
                'tasks' => $tasks,
                'counts' => $counts
            ]);
            break;

        // --- 2. CREATE TASK (ADMIN) ---
        case 'create_task':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $title = trim($input['title'] ?? '');
            $category = $input['category'] ?? 'Writing';
            $description = trim($input['description'] ?? '');
            $pay = (float)($input['pay'] ?? 25.00);
            $time = trim($input['time'] ?? '30 min');

            if (empty($title) || empty($description)) {
                http_response_code(400);
                echo json_encode(['error' => 'Title and description are required.']);
                exit;
            }

            $iconMap = [
                'Online Research'               => '⌕',
                'Data Entry'                     => '☷',
                'Content Writing'                => '✎',
                'Social Media'                   => '◈',
                'Transcription'                  => '♫',
                'Proofreading & Editing'         => '✓',
                'Website Testing'                => '⚙',
                'Lead Generation'                => '◎',
                'E-commerce Listings'            => '▤',
                'Translation (English-Swahili)'  => '⇄',
                'Categorisation & Tagging'       => '🏷',
                'Customer Support Writing'       => '✉',
                'Email & Business Writing'       => '✍',
                'Competitor & Market Analysis'   => '◩',
                'Image & Media Tasks'            => '⬡',
                'Video & Audio Research'         => '▷',
                'App & Product Reviews'          => '★',
                'Job & Career Research'          => '⌖',
                'Education & Tutorial Writing'   => '📖',
                'Digital Marketing Tasks'        => '↗',
                'Writing' => '✎', 'Coding' => '⌘', 'Research' => '⌕', 'Evaluation' => '◉'
            ];
            $icon = $iconMap[$category] ?? '✳';
            $taskUid = 'T' . time();
            $howToDoIt = trim($input['how_to_do_it'] ?? '');
            $whatToSubmit = trim($input['what_to_submit'] ?? '');
            $noAiRule = trim($input['no_ai_rule'] ?? '');

            $stmt = $pdo->prepare("
                INSERT INTO tasks (task_uid, category, icon, title, description, how_to_do_it, what_to_submit, no_ai_rule, pay, time_estimate, difficulty_level, tag, posted_hours_ago)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'All levels', 'NEW', 0)
            ");
            $stmt->execute([$taskUid, $category, $icon, $title, $description, $howToDoIt, $whatToSubmit, $noAiRule, $pay, $time]);
            $newId = $pdo->lastInsertId();

            echo json_encode([
                'success' => true,
                'task' => [
                    'id' => $newId,
                    'uid' => $taskUid,
                    'category' => $category,
                    'icon' => $icon,
                    'title' => $title,
                    'description' => $description,
                    'pay' => $pay,
                    'time' => $time,
                    'level' => 'All levels',
                    'tag' => 'NEW',
                    'posted' => 0
                ]
            ]);
            break;

        // --- 3. SUBMISSIONS ---
        case 'submissions':
            $email = trim($_GET['email'] ?? '');
            $status = trim($_GET['status'] ?? '');

            $where = [];
            $params = [];

            if (!empty($email)) {
                $where[] = "LOWER(contributor_email) = LOWER(?)";
                $params[] = $email;
            }

            if (!empty($status)) {
                $where[] = "status = ?";
                $params[] = $status;
            }

            $sql = "SELECT id, sub_uid AS uid, task_id AS taskId, task_title AS taskTitle, category, contributor_name AS name, contributor_email AS email, response_text AS response, status, score, auto_score AS autoScore, dim_scores AS dimScores, feedback, submitted_at AS submittedAt, reviewed_at AS reviewedAt FROM submissions";
            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }
            $sql .= " ORDER BY id DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll());
            break;

        // --- 4. CREATE SUBMISSION (GATED TO AUTHORIZED USERS) ---
        case 'create_submission':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $taskId = trim($input['taskId'] ?? '');
            $name = trim($input['name'] ?? '');
            $email = strtolower(trim($input['email'] ?? ''));
            $response = trim($input['response'] ?? '');
            
            // Format structured NexusGrid RLHF / Audit evaluation answers
            if (!empty($input['justification'])) {
                $evalParts = [];
                if (!empty($input['choice'])) $evalParts[] = "WINNER SELECTION: " . $input['choice'];
                if (!empty($input['verdict'])) $evalParts[] = "TRUTH VERDICT: " . $input['verdict'];
                if (!empty($input['primaryCategory'])) $evalParts[] = "TAXONOMY CATEGORY: " . $input['primaryCategory'];
                if (!empty($input['sentiment'])) $evalParts[] = "SENTIMENT GRADE: " . $input['sentiment'];
                if (!empty($input['criteria']) && is_array($input['criteria'])) {
                    $evalParts[] = "COMPLIANCE CRITERIA: " . implode(', ', $input['criteria']);
                }
                $evalParts[] = "PROFESSIONAL JUSTIFICATION:\n" . trim($input['justification']);
                $response = implode("\n\n", $evalParts);
            }

            if (empty($taskId) || empty($name) || empty($email) || empty($response)) {
                http_response_code(400);
                echo json_encode(['error' => 'All evaluation criteria and justification are required.']);
                exit;
            }

            // Gated check: user MUST exist in users table
            $userCheck = $pdo->prepare("SELECT id, status FROM users WHERE LOWER(email) = ? LIMIT 1");
            $userCheck->execute([$email]);
            $userRecord = $userCheck->fetch();

            if (!$userRecord) {
                http_response_code(403);
                echo json_encode([
                    'error' => 'Unauthorized account. Only users added by an administrator with valid logins can submit tasks. Please log in with your authorized credentials.'
                ]);
                exit;
            }

            if ($userRecord['status'] === 'disabled') {
                http_response_code(403);
                echo json_encode([
                    'error' => 'This account has been disabled by the administrator.'
                ]);
                exit;
            }

            // Check if account is disabled in security controls
            $secStmt = $pdo->prepare("SELECT status, country FROM account_controls WHERE LOWER(email) = ?");
            $secStmt->execute([$email]);
            $security = $secStmt->fetch();

            if ($security && $security['status'] === 'disabled') {
                http_response_code(403);
                echo json_encode(['error' => 'This account is paused while the security alert is reviewed.']);
                exit;
            }

            // Daily Submission Limit Check: Maximum 2 tasks per day per contributor
            $dailyStmt = $pdo->prepare("
                SELECT COUNT(*) FROM submissions 
                WHERE LOWER(contributor_email) = ? 
                AND DATE(submitted_at) = CURRENT_DATE
            ");
            $dailyStmt->execute([$email]);
            $dailyCount = (int) $dailyStmt->fetchColumn();

            if ($dailyCount >= 2) {
                http_response_code(429);
                echo json_encode([
                    'error' => 'Daily limit reached! You can complete a maximum of 2 tasks per day. Please return tomorrow.',
                    'dailyLimitReached' => true,
                    'dailyCount' => $dailyCount,
                    'maxDaily' => 2
                ]);
                exit;
            }

            // Find task info
            $taskStmt = $pdo->prepare("SELECT title, category, pay FROM tasks WHERE task_uid = ? OR CAST(id AS VARCHAR) = ? LIMIT 1");
            $taskStmt->execute([$taskId, (string)$taskId]);
            $task = $taskStmt->fetch();

            $taskTitle = $task ? $task['title'] : 'Task';
            $category = $task ? $task['category'] : 'General';
            $pay = $task ? (float)$task['pay'] : 25.00;
            $subUid = 'sub-' . time() . '-' . rand(100, 999);

            // Extract auto_score and dim_scores from payload
            $autoScore = isset($input['auto_score']) && is_numeric($input['auto_score'])
                ? round((float)$input['auto_score'], 2)
                : null;
            $dimScores = !empty($input['dim_scores']) && is_array($input['dim_scores'])
                ? json_encode($input['dim_scores'])
                : null;

            $stmt = $pdo->prepare("
                INSERT INTO submissions (sub_uid, task_id, task_title, category, contributor_name, contributor_email, response_text, pay, status, auto_score, dim_scores, submitted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
            ");
            $stmt->execute([$subUid, $taskId, $taskTitle, $category, $name, $email, $response, $pay, $autoScore, $dimScores]);

            echo json_encode([
                'success' => true,
                'id' => $pdo->lastInsertId(),
                'uid' => $subUid,
                'email' => $email
            ]);
            break;

        // --- 5. GRADE SUBMISSION (ADMIN) ---
        case 'grade':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $submissionId = $input['id'] ?? $input['submissionId'] ?? null;
            $adminScore = isset($input['score']) && is_numeric($input['score']) ? (float)$input['score'] : null;
            $feedbackLabel = trim($input['feedback_label'] ?? '');
            $feedback = trim($input['feedback'] ?? $feedbackLabel);
            $sendEmail = !empty($input['send_email']);
            $contributorEmail = strtolower(trim($input['contributor_email'] ?? ''));
            $contributorName = trim($input['contributor_name'] ?? 'Contributor');

            if (!$submissionId) {
                http_response_code(400);
                echo json_encode(['error' => 'Submission ID is required.']);
                exit;
            }

            // Fetch submission to get auto_score (from contributor dim ratings) and contributor info
            $subInfo = $pdo->prepare("SELECT contributor_email, contributor_name, task_title, auto_score, dim_scores FROM submissions WHERE CAST(id AS VARCHAR) = ? OR sub_uid = ? LIMIT 1");
            $subInfo->execute([(string)$submissionId, $submissionId]);
            $subRow = $subInfo->fetch();

            if (empty($contributorEmail) && $subRow) {
                $contributorEmail = $subRow['contributor_email'];
                $contributorName  = $subRow['contributor_name'];
            }

            // --- AUTO-CALCULATE FINAL SCORE ---
            $storedAutoScore = ($subRow && $subRow['auto_score']) ? (float)$subRow['auto_score'] : 0;

            if ($adminScore !== null) {
                $adminScore = max(1.0, min(5.0, $adminScore));
                if ($storedAutoScore > 0) {
                    // Weighted blend: 60% admin + 40% contributor self-evaluation
                    $finalScore = round(($adminScore * 0.60) + ($storedAutoScore * 0.40), 2);
                } else {
                    $finalScore = $adminScore;
                }
            } elseif ($storedAutoScore > 0) {
                $finalScore = round($storedAutoScore, 2);
            } else {
                $finalScore = 3.00;
            }
            $finalScore = max(1.0, min(5.0, $finalScore));

            // Auto-derive feedback label from final score if not provided
            if (empty($feedbackLabel)) {
                $feedbackLabel = match(true) {
                    $finalScore >= 4.8 => 'Very Excellent',
                    $finalScore >= 4.0 => 'Excellent',
                    $finalScore >= 3.5 => 'Good',
                    $finalScore >= 2.5 => 'Fair',
                    $finalScore >= 1.5 => 'Poor',
                    default            => 'Very Poor',
                };
            }
            if (empty($feedback)) $feedback = $feedbackLabel;

            $stmt = $pdo->prepare("
                UPDATE submissions 
                SET status = 'approved', score = ?, feedback = ?, reviewed_at = NOW()
                WHERE CAST(id AS VARCHAR) = ? OR sub_uid = ?
            ");
            $stmt->execute([$finalScore, $feedback, (string)$submissionId, $submissionId]);

            // Send grade notification email
            $emailSent = false;
            if ($sendEmail && !empty($contributorEmail)) {
                $scoreLabel = match(true) {
                    $finalScore >= 4.8 => 'Very Excellent ⭐',
                    $finalScore >= 4.0 => 'Excellent 🟩',
                    $finalScore >= 3.5 => 'Good 🟦',
                    $finalScore >= 2.5 => 'Fair 🟨',
                    $finalScore >= 1.5 => 'Poor 🟥',
                    default            => 'Very Poor ⬛',
                };
                $scoreBreakdown = "";
                if ($adminScore !== null && $storedAutoScore > 0) {
                    $scoreBreakdown = "BREAKDOWN: Admin grade {$adminScore}/5 (60%) + Auto-score {$storedAutoScore}/5 (40%)\r\n";
                }
                $subject = "NexusGrid — Your submission has been graded: {$scoreLabel}";
                $body  = "Hello {$contributorName},\r\n\r\n";
                $body .= "Your submission on NexusGrid has been reviewed and graded by an administrator.\r\n\r\n";
                $body .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n";
                $body .= "FINAL SCORE: {$finalScore} / 5\r\n";
                $body .= "RATING:      {$scoreLabel}\r\n";
                $body .= $scoreBreakdown;
                if (!empty($feedback)) {
                    $body .= "FEEDBACK:    {$feedback}\r\n";
                }
                $body .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n\r\n";
                $body .= "Log in to your NexusGrid account to view your updated rating and accumulated earnings.\r\n\r\n";
                $body .= "Thank you for your contribution!\r\n\r\n";
                $body .= "— The NexusGrid Team\r\n";
                $mailHost = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? 'nexusgrid.site');
                $fromHeader = defined('MAIL_FROM') ? MAIL_FROM : "noreply@{$mailHost}";
                $replyHeader = defined('MAIL_REPLY_TO') ? MAIL_REPLY_TO : "admin@{$mailHost}";
                $headers = "From: {$fromHeader}\r\nReply-To: {$replyHeader}\r\nX-Mailer: NexusGrid Enterprise/2.4";
                $emailSent = @mail($contributorEmail, $subject, $body, $headers);
            }

            echo json_encode([
                'success' => true,
                'emailSent' => $emailSent,
                'finalScore' => $finalScore,
                'adminScore' => $adminScore,
                'autoScore' => $storedAutoScore,
                'feedbackLabel' => $feedbackLabel,
                'feedback' => $feedback
            ]);
            break;

        // --- 5b. ADMIN EMAIL NOTIFICATION ---
        case 'admin_notify':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $subject = trim($input['subject'] ?? '');
            $message = trim($input['message'] ?? '');
            $sendAll = !empty($input['send_all']);
            $toEmail = strtolower(trim($input['to_email'] ?? ''));

            if (empty($subject) || empty($message)) {
                http_response_code(400);
                echo json_encode(['error' => 'Subject and message are required.']);
                exit;
            }

            $mailHost = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? 'nexusgrid.site');
            $fromHeader = defined('MAIL_FROM') ? MAIL_FROM : "noreply@{$mailHost}";
            $replyHeader = defined('MAIL_REPLY_TO') ? MAIL_REPLY_TO : "admin@{$mailHost}";
            $headers = "From: {$fromHeader}\r\nReply-To: {$replyHeader}\r\nX-Mailer: NexusGrid Enterprise/2.4\r\nContent-Type: text/plain; charset=UTF-8";
            $sentCount = 0;

            if ($sendAll) {
                // Email every active contributor
                $allUsers = $pdo->query("SELECT email, name FROM users WHERE role = 'contributor' AND status = 'active'")->fetchAll();
                foreach ($allUsers as $user) {
                    $personalised = "Hello {$user['name']},\r\n\r\n{$message}\r\n\r\n— The NexusGrid Admin Team\r\n";
                    if (@mail($user['email'], $subject, $personalised, $headers)) {
                        $sentCount++;
                    }
                }
                echo json_encode(['success' => true, 'send_all' => true, 'sent' => $sentCount]);
            } else {
                if (empty($toEmail)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Recipient email is required.']);
                    exit;
                }
                // Personalise if we find the user's name
                $nameRow = $pdo->prepare("SELECT name FROM users WHERE LOWER(email) = ? LIMIT 1");
                $nameRow->execute([$toEmail]);
                $nameResult = $nameRow->fetch();
                $recipientName = $nameResult ? $nameResult['name'] : 'Contributor';
                $body = "Hello {$recipientName},\r\n\r\n{$message}\r\n\r\n— The NexusGrid Admin Team\r\n";
                $emailSent = @mail($toEmail, $subject, $body, $headers);
                echo json_encode(['success' => true, 'emailSent' => $emailSent, 'to' => $toEmail]);
            }
            break;

        // --- 6. CONTRIBUTOR ACCOUNT STATS ---
        case 'account':
            $email = strtolower(trim($_GET['email'] ?? ''));
            if (empty($email)) {
                echo json_encode([
                    'email' => '',
                    'isAuthorized' => false,
                    'rating' => null,
                    'gradedCount' => 0,
                    'pendingCount' => 0,
                    'totalCount' => 0,
                    'isVerified' => false,
                    'security' => null
                ]);
                exit;
            }

            // Verify if user is registered in the users table
            $userCheck = $pdo->prepare("SELECT id, name, status, role FROM users WHERE LOWER(email) = ? LIMIT 1");
            $userCheck->execute([$email]);
            $userRecord = $userCheck->fetch();

            $isAuthorized = ($userRecord && $userRecord['status'] === 'active');

            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) AS totalCount,
                    SUM(CASE WHEN status = 'approved' AND score IS NOT NULL THEN 1 ELSE 0 END) AS gradedCount,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
                    AVG(CASE WHEN status = 'approved' AND score IS NOT NULL THEN score ELSE NULL END) AS avgScore,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN pay ELSE 0 END), 0.00) AS accumulatedMoney
                FROM submissions
                WHERE LOWER(contributor_email) = ?
            ");
            $stmt->execute([$email]);
            $stats = $stmt->fetch();

            // Verified check
            $vStmt = $pdo->prepare("SELECT doc_type, verified_at FROM verified_contributors WHERE LOWER(email) = ?");
            $vStmt->execute([$email]);
            $verified = $vStmt->fetch();

            // Security check
            $sStmt = $pdo->prepare("SELECT status, country, flagged_at FROM account_controls WHERE LOWER(email) = ?");
            $sStmt->execute([$email]);
            $security = $sStmt->fetch();

            // Daily submissions check
            $todayStmt = $pdo->prepare("
                SELECT COUNT(*) FROM submissions 
                WHERE LOWER(contributor_email) = ? 
                AND DATE(submitted_at) = CURRENT_DATE
            ");
            $todayStmt->execute([$email]);
            $todayCount = (int)$todayStmt->fetchColumn();

            echo json_encode([
                'email' => $email,
                'isAuthorized' => $isAuthorized,
                'userName' => $userRecord['name'] ?? null,
                'userRole' => $userRecord['role'] ?? null,
                'userStatus' => $userRecord['status'] ?? 'not_registered',
                'rating' => $stats['avgScore'] !== null ? round((float)$stats['avgScore'], 1) : null,
                'gradedCount' => (int)$stats['gradedCount'],
                'pendingCount' => (int)$stats['pendingCount'],
                'totalCount' => (int)$stats['totalCount'],
                'accumulatedMoney' => round((float)($stats['accumulatedMoney'] ?? 0), 2),
                'todayCount' => $todayCount,
                'maxDaily' => 2,
                'canSubmitToday' => ($todayCount < 2),
                'isVerified' => !empty($verified),
                'security' => $security ?: null
            ]);
            break;

        // --- 7. VERIFY ID ---
        case 'verify':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $email = strtolower(trim($input['email'] ?? ''));
            $docType = trim($input['docType'] ?? 'passport');

            if (empty($email)) {
                http_response_code(400);
                echo json_encode(['error' => 'Email is required.']);
                exit;
            }

            if (getDBDriver() === 'pgsql') {
                $stmt = $pdo->prepare("
                    INSERT INTO verified_contributors (email, doc_type, verified_at)
                    VALUES (?, ?, NOW())
                    ON CONFLICT (email) DO UPDATE SET doc_type = EXCLUDED.doc_type, verified_at = NOW()
                ");
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO verified_contributors (email, doc_type, verified_at)
                    VALUES (?, ?, NOW())
                    ON DUPLICATE KEY UPDATE doc_type = VALUES(doc_type), verified_at = NOW()
                ");
            }
            $stmt->execute([$email, $docType]);

            echo json_encode(['success' => true, 'verified' => true, 'email' => $email]);
            break;

        // --- 8. SECURITY CONTROLS ---
        case 'security':
            $stmt = $pdo->query("SELECT email, status, country, flagged_at AS flaggedAt FROM account_controls ORDER BY id DESC");
            $accounts = [];
            while ($row = $stmt->fetch()) {
                $accounts[$row['email']] = $row;
            }
            echo json_encode($accounts);
            break;

        case 'security_flag':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $email = strtolower(trim($input['email'] ?? ''));
            $country = trim($input['country'] ?? 'Unknown Country');

            if (empty($email)) {
                http_response_code(400);
                echo json_encode(['error' => 'Email is required.']);
                exit;
            }

            if (getDBDriver() === 'pgsql') {
                $stmt = $pdo->prepare("
                    INSERT INTO account_controls (email, status, country, flagged_at)
                    VALUES (?, 'flagged', ?, NOW())
                    ON CONFLICT (email) DO UPDATE SET status = 'flagged', country = EXCLUDED.country, flagged_at = NOW()
                ");
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO account_controls (email, status, country, flagged_at)
                    VALUES (?, 'flagged', ?, NOW())
                    ON DUPLICATE KEY UPDATE status = 'flagged', country = VALUES(country), flagged_at = NOW()
                ");
            }
            $stmt->execute([$email, $country]);

            echo json_encode(['success' => true, 'email' => $email, 'status' => 'flagged', 'country' => $country]);
            break;

        case 'security_action':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $email = strtolower(trim($input['email'] ?? ''));
            $actionType = trim($input['actionType'] ?? '');

            if ($actionType === 'clear') {
                $stmt = $pdo->prepare("DELETE FROM account_controls WHERE LOWER(email) = ?");
                $stmt->execute([$email]);
            } elseif ($actionType === 'disable' || $actionType === 'restore') {
                $newStatus = ($actionType === 'disable') ? 'disabled' : 'active';
                $stmt = $pdo->prepare("UPDATE account_controls SET status = ? WHERE LOWER(email) = ?");
                $stmt->execute([$newStatus, $email]);
            }

            echo json_encode(['success' => true]);
            break;

        // --- NEXUSGRID WORK STREAMS & ALIGNMENT PROTOCOLS ---
        case 'work_streams':
            $stmt = $pdo->query("SELECT * FROM work_streams ORDER BY base_rate DESC");
            $streams = $stmt->fetchAll();
            
            // Augment with live task counts per stream
            foreach ($streams as &$stream) {
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM tasks WHERE stream_id = ?");
                $countStmt->execute([$stream['id']]);
                $stream['task_count'] = (int) $countStmt->fetchColumn();
            }
            unset($stream);

            echo json_encode([
                'success' => true,
                'source' => 'https://www.nexugrid.site/dashboard',
                'protocol' => 'United States AI Alignment Protocol',
                'streams' => $streams
            ]);
            break;

        case 'assessment_test':
            $stmt = $pdo->query("SELECT id, question_text, option_a, option_b, option_c, option_d FROM assessment_questions ORDER BY id ASC");
            $rows = $stmt->fetchAll();
            $assessmentData = [];
            foreach ($rows as $r) {
                $assessmentData[] = [
                    'id' => (int)$r['id'],
                    'q' => $r['question_text'],
                    'options' => [$r['option_a'], $r['option_b'], $r['option_c'], $r['option_d']]
                ];
            }
            echo json_encode([
                'success' => true,
                'threshold' => '70%',
                'assessmentData' => $assessmentData
            ]);
            break;

        case 'submit_assessment':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }
            $input = getRequestData();
            $answers = $input['answers'] ?? [];
            if (!is_array($answers) || empty($answers)) {
                http_response_code(400);
                echo json_encode(['error' => 'Answers array required']);
                exit;
            }

            $stmt = $pdo->query("SELECT id, correct_index FROM assessment_questions ORDER BY id ASC");
            $correctAnswers = $stmt->fetchAll();
            $correctCount = 0;
            $total = count($correctAnswers);

            foreach ($correctAnswers as $idx => $row) {
                if (isset($answers[$idx]) && (int)$answers[$idx] === (int)$row['correct_index']) {
                    $correctCount++;
                }
            }

            $score = $total > 0 ? round(($correctCount / $total) * 100) : 0;
            $passed = $score >= 70;

            echo json_encode([
                'success' => true,
                'score' => $score,
                'passed' => $passed,
                'message' => $passed 
                    ? "Security clearance granted. Production work streams unlocked." 
                    : "Accuracy threshold (70%) not reached. Review guidelines and re-attempt."
            ]);
            break;

        default:
            echo json_encode([
                'status' => 'NexusGrid PHP API Running with User Authentication & AI Alignment Streams',
                'endpoints' => [
                    'login' => '?action=login',
                    'current_user' => '?action=current_user',
                    'admin_add_user' => '?action=admin_add_user',
                    'admin_list_users' => '?action=admin_list_users',
                    'tasks' => '?action=tasks',
                    'submissions' => '?action=submissions',
                    'account' => '?action=account&email=...'
                ]
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
