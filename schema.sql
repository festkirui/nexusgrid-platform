-- GiveGrid Database Schema for MySQL / Laragon
CREATE DATABASE IF NOT EXISTS `givegrid` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `givegrid`;

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `task_uid` VARCHAR(64) UNIQUE NOT NULL,
  `category` ENUM('Writing', 'Coding', 'Research', 'Evaluation') NOT NULL,
  `icon` VARCHAR(16) NOT NULL DEFAULT '✳',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `pay` DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
  `time_estimate` VARCHAR(50) NOT NULL DEFAULT '30 min',
  `difficulty_level` VARCHAR(50) NOT NULL DEFAULT 'All levels',
  `tag` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  `posted_hours_ago` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Submissions Table
CREATE TABLE IF NOT EXISTS `submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sub_uid` VARCHAR(64) UNIQUE NOT NULL,
  `task_id` VARCHAR(64) NOT NULL,
  `task_title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `contributor_name` VARCHAR(120) NOT NULL,
  `contributor_email` VARCHAR(180) NOT NULL,
  `response_text` TEXT NOT NULL,
  `pay` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `score` DECIMAL(3, 1) NULL,
  `feedback` TEXT NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  INDEX `idx_email` (`contributor_email`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Account Controls / Security Table
CREATE TABLE IF NOT EXISTS `account_controls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(180) UNIQUE NOT NULL,
  `status` ENUM('active', 'flagged', 'disabled') NOT NULL DEFAULT 'flagged',
  `country` VARCHAR(100) NOT NULL,
  `flagged_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Verified Contributors Table
CREATE TABLE IF NOT EXISTS `verified_contributors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(180) UNIQUE NOT NULL,
  `doc_type` VARCHAR(50) NOT NULL DEFAULT 'passport',
  `verified_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
