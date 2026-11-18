<?php
/**
 * NexusGrid — Production Configuration Sample
 * 
 * Instructions:
 * 1. Copy this file to 'config.php' (e.g. cp config.sample.php config.php).
 * 2. Update with your PostgreSQL credentials (Vercel Postgres, Supabase, Neon) or MySQL credentials.
 * 3. NexusGrid will automatically load 'config.php' on every request.
 */

// ==============================================================================
// OPTION A: Vercel Postgres / Neon / Supabase (Recommended for Vercel Hosting)
// ==============================================================================
// If hosting on Vercel with Vercel Postgres or Neon, simply provide POSTGRES_URL:
// (Vercel automatically injects POSTGRES_URL / DATABASE_URL in Environment Variables)
// define('POSTGRES_URL', 'postgres://default:password@ep-sample-123456.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require');

// ==============================================================================
// OPTION B: PostgreSQL with Discrete Variables
// ==============================================================================
// define('DB_CONNECTION', 'pgsql');
// define('DB_HOST', 'localhost');
// define('DB_PORT', '5432');
// define('DB_NAME', 'nexusgrid');
// define('DB_USER', 'postgres');
// define('DB_PASS', 'secret');
// define('DB_SSLMODE', 'prefer'); // 'require' for cloud hosting, 'prefer' for local

// ==============================================================================
// OPTION C: MySQL / MariaDB (Local Development or cPanel Hosting)
// ==============================================================================
define('DB_CONNECTION', 'mysql');
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'givegrid');
define('DB_USER', 'root');
define('DB_PASS', '');

// ==============================================================================
// Application Settings
// ==============================================================================
define('APP_NAME', 'NexusGrid');
define('APP_ENV', 'production');      // 'production' or 'development'
define('APP_DEBUG', false);           // Set to false in production to prevent path disclosure

// ==============================================================================
// Email Notification Settings
// ==============================================================================
define('MAIL_FROM', 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'nexusgrid.site'));
define('MAIL_FROM_NAME', 'NexusGrid Admin');
define('MAIL_REPLY_TO', 'admin@' . ($_SERVER['HTTP_HOST'] ?? 'nexusgrid.site'));
