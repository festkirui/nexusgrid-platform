<?php
/**
 * NexusGrid — Database Configuration & Initialization
 * Supports:
 *  - PostgreSQL (Vercel Postgres, Neon, Supabase, Render, AWS RDS)
 *  - MySQL / MariaDB (WampServer, XAMPP, cPanel)
 */

// Load custom config.php if present (recommended for live hosting)
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

// 1. Check for standard cloud PostgreSQL connection strings (Vercel, Neon, Supabase)
$cloudPgUrl = '';
if (getenv('POSTGRES_URL')) {
    $cloudPgUrl = getenv('POSTGRES_URL');
} elseif (getenv('DATABASE_URL')) {
    $cloudPgUrl = getenv('DATABASE_URL');
} elseif (getenv('POSTGRES_URL_NON_POOLING')) {
    $cloudPgUrl = getenv('POSTGRES_URL_NON_POOLING');
} elseif (defined('POSTGRES_URL') && POSTGRES_URL) {
    $cloudPgUrl = POSTGRES_URL;
} elseif (defined('DATABASE_URL') && DATABASE_URL) {
    $cloudPgUrl = DATABASE_URL;
}

defined('POSTGRES_URL') || define('POSTGRES_URL', $cloudPgUrl);
defined('DB_CONNECTION') || define('DB_CONNECTION', getenv('DB_CONNECTION') ?: (!empty($cloudPgUrl) || getenv('PGHOST') ? 'pgsql' : 'mysql'));
defined('DB_HOST') || define('DB_HOST', getenv('DB_HOST') ?: (getenv('PGHOST') ?: '127.0.0.1'));
defined('DB_PORT') || define('DB_PORT', getenv('DB_PORT') ?: (getenv('PGPORT') ?: (DB_CONNECTION === 'pgsql' ? '5432' : '3306')));
defined('DB_NAME') || define('DB_NAME', getenv('DB_NAME') ?: (getenv('PGDATABASE') ?: 'givegrid'));
defined('DB_USER') || define('DB_USER', getenv('DB_USER') ?: (getenv('PGUSER') ?: 'root'));
defined('DB_PASS') || define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : (getenv('PGPASSWORD') !== false ? getenv('PGPASSWORD') : ''));
defined('DB_SSLMODE') || define('DB_SSLMODE', getenv('DB_SSLMODE') ?: (getenv('PGSSLMODE') ?: 'prefer'));
defined('APP_DEBUG') || define('APP_DEBUG', getenv('APP_DEBUG') === 'true');

function respondDbError(string $message, string $details = ''): never {
    $isJson = (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json'))
              || (isset($_SERVER['SCRIPT_NAME']) && basename($_SERVER['SCRIPT_NAME']) === 'api.php');

    $isLocal = in_array(DB_HOST, ['127.0.0.1', 'localhost'], true);
    $showDetails = (defined('APP_DEBUG') && APP_DEBUG) || $isLocal;
    $engine = DB_CONNECTION === 'pgsql' ? 'PostgreSQL' : 'MySQL';

    if ($isJson) {
        header('Content-Type: application/json; charset=utf-8', true, 500);
        echo json_encode([
            'error' => $message,
            'engine' => $engine,
            'details' => $showDetails ? $details : 'Database connection error. Please verify database credentials or POSTGRES_URL.',
            'hint' => 'Check config.php or environment variables (POSTGRES_URL, DATABASE_URL, or DB_HOST/DB_NAME/DB_USER).'
        ], JSON_PRETTY_PRINT);
    } else {
        header('Content-Type: text/html; charset=utf-8', true, 500);
        $displayDetails = htmlspecialchars($showDetails ? $details : 'Database connection error.');
        $hostDisplay = htmlspecialchars($_SERVER['HTTP_HOST'] ?? DB_HOST);
        echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Database Connection Notice — NexusGrid</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d12; color: #e1e7ec; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { max-width: 620px; width: 100%; background: #0e1520; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); }
        h2 { margin-top: 0; color: #f87171; font-size: 20px; display: flex; align-items: center; gap: 10px; }
        p { line-height: 1.6; color: #94a3b8; font-size: 14px; }
        code, pre { font-family: Consolas, monospace; background: #070b10; border: 1px solid #1e293b; border-radius: 6px; padding: 4px 8px; font-size: 13px; color: #00dfa2; }
        pre { padding: 14px; overflow-x: auto; color: #f87171; white-space: pre-wrap; word-break: break-all; margin: 16px 0; }
        .steps { background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 16px 20px; margin-top: 20px; }
        .steps ol { margin: 8px 0 0 18px; padding: 0; font-size: 13px; color: #cbd5e1; line-height: 1.6; }
        .steps li { margin-bottom: 6px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚠️ {$engine} Database Connection Notice</h2>
        <p>NexusGrid could not connect to the database on <code>{$hostDisplay}</code>.</p>
        <pre>{$displayDetails}</pre>
        <div class="steps">
            <strong style="color:#818cf8;">How to configure for Vercel / Cloud:</strong>
            <ol>
                <li><strong>Vercel Postgres / Neon / Supabase:</strong> Copy <code>POSTGRES_URL</code> or <code>DATABASE_URL</code> to your project Environment Variables or <code>config.php</code>.</li>
                <li><strong>Import Schema:</strong> Run <code>database_postgres.sql</code> in the Vercel Postgres / Neon SQL Query console.</li>
                <li><strong>Local MySQL:</strong> Start WampServer / MySQL on port <code>3306</code> and import <code>database.sql</code>.</li>
                <li>Refresh this page to access NexusGrid.</li>
            </ol>
        </div>
    </div>
</body>
</html>
HTML;
    }
    exit;
}

function getDBDriver(): string {
    static $driver = null;
    if ($driver !== null) {
        return $driver;
    }
    $pdo = getDBConnection();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    return $driver;
}

function getDBConnection(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $lastException = null;

    // --- A. CONNECT VIA POSTGRES_URL OR DATABASE_URL (Vercel, Neon, Supabase) ---
    $pgUrl = POSTGRES_URL;
    if (!empty($pgUrl)) {
        try {
            $parts = parse_url($pgUrl);
            $scheme = strtolower($parts['scheme'] ?? '');
            if (str_starts_with($scheme, 'postgres')) {
                $host = $parts['host'] ?? 'localhost';
                $port = $parts['port'] ?? 5432;
                $user = urldecode($parts['user'] ?? '');
                $pass = urldecode($parts['pass'] ?? '');
                $dbname = ltrim(urldecode($parts['path'] ?? ''), '/');

                $queryParams = [];
                if (!empty($parts['query'])) {
                    parse_str($parts['query'], $queryParams);
                }
                $sslmode = $queryParams['sslmode'] ?? 'require';

                $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode={$sslmode}";
                $pdo = new PDO($dsn, $user, $pass, $options);
                return $pdo;
            }
        } catch (PDOException $e) {
            $lastException = $e;
        }
    }

    // --- B. CONNECT VIA POSTGRESQL CONSTANTS (DB_CONNECTION = 'pgsql') ---
    if (DB_CONNECTION === 'pgsql') {
        try {
            $host = DB_HOST;
            $port = DB_PORT ?: 5432;
            $dbname = DB_NAME;
            $user = DB_USER;
            $pass = DB_PASS;
            $sslmode = DB_SSLMODE;

            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode={$sslmode}";
            $pdo = new PDO($dsn, $user, $pass, $options);
            return $pdo;
        } catch (PDOException $e) {
            $lastException = $e;
        }
    }

    // --- C. FALLBACK TO MYSQL / MARIADB (Local WampServer / XAMPP / cPanel) ---
    $portsToTry = [DB_PORT];
    if (DB_PORT !== '3307') {
        $portsToTry[] = '3307';
    }

    foreach ($portsToTry as $port) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . $port . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            return $pdo;
        } catch (PDOException $e) {
            $lastException = $e;
            if ($e->getCode() == 1049 || str_contains($e->getMessage(), 'Unknown database')) {
                try {
                    $rootDsn = "mysql:host=" . DB_HOST . ";port=" . $port . ";charset=utf8mb4";
                    $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS, $options);
                    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                    return $pdo;
                } catch (PDOException $createEx) {
                    $lastException = $createEx;
                }
            }
        }
    }

    respondDbError("Failed to connect to Database (" . (DB_CONNECTION === 'pgsql' ? 'PostgreSQL' : 'MySQL') . ")", $lastException ? $lastException->getMessage() : "Connection refused");
}

// Ensure database tables and initial catalog seed exist
function initAndSeedDatabase(): void {
    static $isSeeded = false;
    if ($isSeeded) {
        return;
    }
    $isSeeded = true;

    $pdo = getDBConnection();
    $driver = getDBDriver();

    // Universal table existence check (works on both PostgreSQL and MySQL)
    try {
        $checkStmt = $pdo->query("SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks'");
        $exists = (bool) $checkStmt->fetchColumn();

        if (!$exists) {
            $schemaFile = ($driver === 'pgsql') 
                ? __DIR__ . '/database_postgres.sql' 
                : __DIR__ . '/database.sql';

            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                $pdo->exec($sql);
            }
        }
    } catch (PDOException $e) {
        // Table exists or already populated
    }

    // Check if tasks table is populated
    $stmt = $pdo->query("SELECT COUNT(*) AS total FROM tasks");
    $count = (int) $stmt->fetchColumn();

    if ($count > 0) {
        ensureUsersTableAndSeed($pdo);
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

    // Ensure pay column exists in submissions if needed
    try {
        $pdo->exec("ALTER TABLE submissions ADD COLUMN pay DECIMAL(10, 2) NOT NULL DEFAULT 0.00");
    } catch (PDOException $e) {
        // Column already exists
    }

    // Seed Demo Submissions
    $insertSubStmt = $pdo->prepare("
        INSERT INTO submissions (sub_uid, task_id, task_title, category, contributor_name, contributor_email, response_text, pay, status, score, feedback, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insertSubStmt->execute([
        'sub-demo-1',
        '1',
        'Make AI explanations easier to understand',
        'Writing',
        'Alex Rivera',
        'alex@example.com',
        'Rewrote the prompt explanation to remove jargon, used active voice, and provided a clean 3-point summary for non-technical users.',
        22.00,
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
        38.00,
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
