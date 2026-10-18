<?php
/**
 * GiveGrid - Database Configuration & Initialization
 * Connects to MySQL in Laragon
 */

define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'givegrid');
define('DB_USER', 'root');
define('DB_PASS', '');

function getDBConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            header('Content-Type: application/json', true, 500);
            echo json_encode(['error' => 'Database connection error: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

// Ensure database tables and initial catalog seed exist
function initAndSeedDatabase(): void {
    $pdo = getDBConnection();

    // Check if tasks table is populated
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM tasks");
    $count = (int) $stmt->fetchColumn();

    if ($count > 0) {
        return; // Already seeded
    }

    $catalog = [
        'Writing' => [
            'icon' => '✎', 'pay' => 22, 'time' => '35 min', 'level' => 'Beginner friendly',
            'titles' => [
                'Make AI explanations easier to understand', 'Shape a warm customer-support reply', 'Rewrite a confusing how-to guide',
                'Create clear summaries from long articles', 'Improve tone in a professional email', 'Explain a science idea for young readers',
                'Turn rough notes into a polished paragraph', 'Make product instructions easier to follow', 'Edit a short story for natural dialogue',
                'Write helpful captions for learning materials', 'Simplify a technical product description', 'Draft a respectful response to feedback',
                'Compare two versions of a short explanation', 'Make a policy note easier to scan', 'Write an accessible event announcement',
                'Improve a set of frequently asked questions', 'Create examples that clarify a tricky concept', 'Review a model answer for clarity and tone',
                'Make a recipe instruction unambiguous', 'Polish a short biography without changing facts', 'Write a concise introduction for a report',
                'Turn jargon into plain language', 'Improve a reminder message for a busy reader', 'Edit a short lesson for flow and structure',
                'Draft a friendly onboarding message'
            ],
            'descriptions' => [
                'Edit a short draft for clarity, accuracy, and natural wording while keeping its meaning intact.',
                'Review a sample and suggest a concise version that is useful, readable, and considerate.',
                'Use your writing judgment to improve structure, tone, and accessibility in a brief piece of text.'
            ]
        ],
        'Coding' => [
            'icon' => '⌘', 'pay' => 38, 'time' => '60 min', 'level' => 'Intermediate',
            'titles' => [
                'Review a small Python function', 'Spot bugs in a JavaScript snippet', 'Check a SQL query for edge cases',
                'Improve a simple React component', 'Explain a TypeScript compiler error', 'Review a data-cleaning script',
                'Find a boundary bug in an algorithm', 'Assess an API error-handling example', 'Improve a Python test case',
                'Check a CSS layout fix', 'Review a small shell script', 'Compare two code implementations',
                'Validate a JSON transformation', 'Inspect a function for off-by-one errors', 'Suggest a clearer variable naming scheme',
                'Review a basic HTML accessibility fix', 'Find a missing case in a switch statement', 'Check a date-parsing routine',
                'Improve a small recursive function', 'Review a pagination implementation', 'Assess a caching example',
                'Explain a regular expression', 'Check a small file-upload handler', 'Review a sorting implementation',
                'Find a bug in a form-validation example'
            ],
            'descriptions' => [
                'Inspect a short code sample for correctness, edge cases, and readable conventions.',
                'Review the proposed change, identify likely issues, and explain a practical improvement.',
                'Use your programming experience to assess a compact example and provide clear reasoning.'
            ]
        ],
        'Research' => [
            'icon' => '⌕', 'pay' => 32, 'time' => '50 min', 'level' => 'Intermediate',
            'titles' => [
                'Fact-check everyday science claims', 'Find reliable sources for a health explainer', 'Compare two summaries of a news topic',
                'Check dates in a short history timeline', 'Research common energy-saving advice', 'Verify a set of geography facts',
                'Review sources for a technology overview', 'Find evidence for a nutrition statement', 'Compare definitions from trusted references',
                'Check a short climate explainer', 'Research the history of a common invention', 'Verify facts in a travel guide draft',
                'Find current public data for a claim', 'Review citations in a learning resource', 'Check a simple economics explanation',
                'Research a biology question for students', 'Compare source quality for a policy brief', 'Verify a set of astronomy statements',
                'Find authoritative safety guidance', 'Check a short profile for factual accuracy', 'Research a language-learning question',
                'Review evidence behind a consumer tip', 'Verify dates and names in a culture guide', 'Find primary sources for a civic explainer',
                'Check figures in a public-information draft'
            ],
            'descriptions' => [
                'Use reputable sources to verify a short claim and note the evidence behind your conclusion.',
                'Research a focused question and summarize what reliable references support.',
                'Compare sources for accuracy and relevance, then leave a brief citation-backed note.'
            ]
        ],
        'Evaluation' => [
            'icon' => '◉', 'pay' => 18, 'time' => '30 min', 'level' => 'Beginner friendly',
            'titles' => [
                'Compare two helpfulness responses', 'Rate answers for factual accuracy', 'Choose the clearer set of instructions',
                'Assess tone in a difficult conversation', 'Compare summaries for key details', 'Review a response for unsupported claims',
                'Evaluate whether an answer follows directions', 'Rate two explanations for completeness', 'Check if a reply addresses the real question',
                'Compare responses for respectful language', 'Assess whether advice is appropriately cautious', 'Select the more useful travel suggestion',
                'Review answers for internal consistency', 'Rate a model response for readability', 'Compare two responses to a coding question',
                'Check whether a summary preserves meaning', 'Evaluate a response for relevant detail', 'Choose the best answer for a beginner',
                'Review a reply for inclusive wording', 'Compare alternatives for practical usefulness', 'Assess whether an answer admits uncertainty',
                'Rate a response for logical reasoning', 'Check if an explanation matches its audience', 'Compare answers for unnecessary assumptions',
                'Evaluate a short answer against a rubric'
            ],
            'descriptions' => [
                'Read a prompt and compare responses using a simple quality rubric.',
                'Choose the response that is more accurate, useful, and appropriate to the question.',
                'Review a short answer and rate its clarity, completeness, and reasoning.'
            ]
        ]
    ];

    $insertTaskStmt = $pdo->prepare("
        INSERT INTO tasks (task_uid, category, icon, title, description, pay, time_estimate, difficulty_level, tag, posted_hours_ago)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $times = ['25 min', '35 min', '45 min', '50 min', '60 min'];
    $categoryIndex = 0;

    foreach ($catalog as $category => $group) {
        $descCount = count($group['descriptions']);
        foreach ($group['titles'] as $index => $title) {
            $taskUid = (string)($categoryIndex * 25 + $index + 1);
            $desc = $group['descriptions'][$index % $descCount];
            $pay = $group['pay'] + (($index * 7 + $categoryIndex * 3) % 19);
            $time = $times[$index % 5];
            $level = match ($index % 4) {
                0 => 'Beginner friendly',
                1 => 'Intermediate',
                2 => 'Advanced',
                default => 'All levels'
            };
            $tag = $index < 2 ? 'NEW' : 'OPEN';
            $posted = ($index * 11 + $categoryIndex * 5) % 72 + 1;

            $insertTaskStmt->execute([
                $taskUid, $category, $group['icon'], $title, $desc, $pay, $time, $level, $tag, $posted
            ]);
        }
        $categoryIndex++;
    }

    // Seed Demo Submissions
    $insertSubStmt = $pdo->prepare("
        INSERT INTO submissions (sub_uid, task_id, task_title, category, contributor_name, contributor_email, response_text, status, score, feedback, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insertSubStmt->execute([
        'sub-demo-1',
        '1',
        'Make AI explanations easier to understand',
        'Writing',
        'Alex Rivera',
        'alex@example.com',
        'Rewrote the prompt explanation to remove jargon, used active voice, and provided a clean 3-point summary for non-technical users.',
        'approved',
        5.0,
        'Excellent clarity and natural tone!',
        date('Y-m-d H:i:s', time() - 86400)
    ]);

    $insertSubStmt->execute([
        'sub-demo-2',
        '26',
        'Review a small Python function',
        'Coding',
        'Jordan Lee',
        'jordan@example.com',
        'Found edge case with empty list handling on line 14. Added type hints and exception handling for null pointer.',
        'pending',
        null,
        '',
        date('Y-m-d H:i:s', time() - 3600)
    ]);

    // Seed Security & Verified Account
    $pdo->prepare("
        INSERT IGNORE INTO account_controls (email, status, country)
        VALUES ('flagged.user@example.com', 'flagged', 'Iceland')
    ")->execute();

    $pdo->prepare("
        INSERT IGNORE INTO verified_contributors (email, doc_type)
        VALUES ('alex@example.com', 'passport')
    ")->execute();

    ensureUsersTableAndSeed($pdo);
}

function ensureUsersTableAndSeed(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(180) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin', 'contributor') NOT NULL DEFAULT 'contributor',
            status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
            auth_token VARCHAR(64) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $count = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($count === 0) {
        $insert = $pdo->prepare("
            INSERT IGNORE INTO users (name, email, password_hash, role, status)
            VALUES (?, ?, ?, ?, ?)
        ");

        // Default admin: admin@givegrid.com / admin123
        $insert->execute([
            'Grid Admin',
            'admin@givegrid.com',
            password_hash('admin123', PASSWORD_DEFAULT),
            'admin',
            'active'
        ]);

        // Default contributor: alex@example.com / alex123
        $insert->execute([
            'Alex Rivera',
            'alex@example.com',
            password_hash('alex123', PASSWORD_DEFAULT),
            'contributor',
            'active'
        ]);

        // Default contributor: festus@example.com / festus123
        $insert->execute([
            'Festus Kirui',
            'festus@example.com',
            password_hash('festus123', PASSWORD_DEFAULT),
            'contributor',
            'active'
        ]);
    }
}
