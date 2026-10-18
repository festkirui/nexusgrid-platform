<?php
/**
 * GiveGrid - REST API Controller
 * Serves JSON responses for tasks, submissions, contributor account stats, and security
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
        // 1. GET /api.php?action=tasks
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

            $sql = "SELECT id, task_uid AS uid, category, icon, title, description, pay, time_estimate AS time, difficulty_level AS level, tag, posted_hours_ago AS posted FROM tasks";
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

        // 2. POST /api.php?action=create_task
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

            $iconMap = ['Writing' => '✎', 'Coding' => '⌘', 'Research' => '⌕', 'Evaluation' => '◉'];
            $icon = $iconMap[$category] ?? '✳';
            $taskUid = 'custom-' . time();

            $stmt = $pdo->prepare("
                INSERT INTO tasks (task_uid, category, icon, title, description, pay, time_estimate, difficulty_level, tag, posted_hours_ago)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'All levels', 'NEW', 0)
            ");
            $stmt->execute([$taskUid, $category, $icon, $title, $description, $pay, $time]);
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

        // 3. GET /api.php?action=submissions
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

            $sql = "SELECT id, sub_uid AS uid, task_id AS taskId, task_title AS taskTitle, category, contributor_name AS name, contributor_email AS email, response_text AS response, status, score, feedback, submitted_at AS submittedAt, reviewed_at AS reviewedAt FROM submissions";
            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }
            $sql .= " ORDER BY id DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll());
            break;

        // 4. POST /api.php?action=create_submission
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

            if (empty($taskId) || empty($name) || empty($email) || empty($response)) {
                http_response_code(400);
                echo json_encode(['error' => 'All submission fields are required.']);
                exit;
            }

            // Check if account is disabled by admin security
            $secStmt = $pdo->prepare("SELECT status, country FROM account_controls WHERE LOWER(email) = ?");
            $secStmt->execute([$email]);
            $security = $secStmt->fetch();

            if ($security && $security['status'] === 'disabled') {
                http_response_code(403);
                echo json_encode(['error' => 'This account is paused while the security alert is reviewed.']);
                exit;
            }

            // Find task info
            $taskStmt = $pdo->prepare("SELECT title, category FROM tasks WHERE task_uid = ? OR id = ? LIMIT 1");
            $taskStmt->execute([$taskId, $taskId]);
            $task = $taskStmt->fetch();

            $taskTitle = $task ? $task['title'] : 'Task';
            $category = $task ? $task['category'] : 'General';
            $subUid = 'sub-' . time() . '-' . rand(100, 999);

            $stmt = $pdo->prepare("
                INSERT INTO submissions (sub_uid, task_id, task_title, category, contributor_name, contributor_email, response_text, status, submitted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            ");
            $stmt->execute([$subUid, $taskId, $taskTitle, $category, $name, $email, $response]);

            echo json_encode([
                'success' => true,
                'id' => $pdo->lastInsertId(),
                'uid' => $subUid,
                'email' => $email
            ]);
            break;

        // 5. POST /api.php?action=grade
        case 'grade':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                exit;
            }

            $input = getRequestData();
            $submissionId = $input['id'] ?? null;
            $score = (float)($input['score'] ?? 5.0);
            $feedback = trim($input['feedback'] ?? '');

            if (!$submissionId) {
                http_response_code(400);
                echo json_encode(['error' => 'Submission ID is required.']);
                exit;
            }

            $stmt = $pdo->prepare("
                UPDATE submissions 
                SET status = 'approved', score = ?, feedback = ?, reviewed_at = NOW()
                WHERE id = ? OR sub_uid = ?
            ");
            $stmt->execute([$score, $feedback, $submissionId, $submissionId]);

            echo json_encode(['success' => true]);
            break;

        // 6. GET /api.php?action=account
        case 'account':
            $email = strtolower(trim($_GET['email'] ?? ''));
            if (empty($email)) {
                echo json_encode([
                    'email' => '',
                    'rating' => null,
                    'gradedCount' => 0,
                    'pendingCount' => 0,
                    'totalCount' => 0,
                    'isVerified' => false,
                    'security' => null
                ]);
                exit;
            }

            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) AS totalCount,
                    SUM(CASE WHEN status = 'approved' AND score IS NOT NULL THEN 1 ELSE 0 END) AS gradedCount,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
                    AVG(CASE WHEN status = 'approved' AND score IS NOT NULL THEN score ELSE NULL END) AS avgScore
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

            echo json_encode([
                'email' => $email,
                'rating' => $stats['avgScore'] !== null ? round((float)$stats['avgScore'], 1) : null,
                'gradedCount' => (int)$stats['gradedCount'],
                'pendingCount' => (int)$stats['pendingCount'],
                'totalCount' => (int)$stats['totalCount'],
                'isVerified' => !empty($verified),
                'security' => $security ?: null
            ]);
            break;

        // 7. POST /api.php?action=verify
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

            $stmt = $pdo->prepare("
                INSERT INTO verified_contributors (email, doc_type, verified_at)
                VALUES (?, ?, NOW())
                ON DUPLICATE KEY UPDATE doc_type = VALUES(doc_type), verified_at = NOW()
            ");
            $stmt->execute([$email, $docType]);

            echo json_encode(['success' => true, 'verified' => true, 'email' => $email]);
            break;

        // 8. GET /api.php?action=security
        case 'security':
            $stmt = $pdo->query("SELECT email, status, country, flagged_at AS flaggedAt FROM account_controls ORDER BY id DESC");
            $accounts = [];
            while ($row = $stmt->fetch()) {
                $accounts[$row['email']] = $row;
            }
            echo json_encode($accounts);
            break;

        // 9. POST /api.php?action=security_flag
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

            $stmt = $pdo->prepare("
                INSERT INTO account_controls (email, status, country, flagged_at)
                VALUES (?, 'flagged', ?, NOW())
                ON DUPLICATE KEY UPDATE status = 'flagged', country = VALUES(country), flagged_at = NOW()
            ");
            $stmt->execute([$email, $country]);

            echo json_encode(['success' => true, 'email' => $email, 'status' => 'flagged', 'country' => $country]);
            break;

        // 10. POST /api.php?action=security_action
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

        default:
            echo json_encode([
                'status' => 'GiveGrid PHP API Running',
                'endpoints' => [
                    'tasks' => '?action=tasks',
                    'submissions' => '?action=submissions',
                    'account' => '?action=account&email=...',
                    'security' => '?action=security'
                ]
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
