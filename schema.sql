-- ====================================================================
-- Aaditech BGA (bga.aaditechs.in) - Hostinger MySQL Production Schema
-- Import this file in Hostinger hPanel -> Databases -> phpMyAdmin
-- ====================================================================

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+05:30";

-- --------------------------------------------------------
-- Table structure for `users` (Enterprise Authentication)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(64) NOT NULL,
  `email` varchar(191) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `salt` varchar(64) NOT NULL,
  `full_name` varchar(128) NOT NULL,
  `role` varchar(32) DEFAULT 'owner',
  `is_platform_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `password_reset_tokens` (Self-Service Recovery)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prt_token_hash` (`token_hash`),
  KEY `idx_prt_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `companies` (Multi-Tenant Management)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `companies` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `name` varchar(191) NOT NULL,
  `legal_name` varchar(191) DEFAULT NULL,
  `category` varchar(128) NOT NULL,
  `city` varchar(128) NOT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `google_place_id` varchar(128) DEFAULT NULL,
  `autopilot_enabled` tinyint(1) DEFAULT 1,
  `score` int(11) DEFAULT 75,
  `rank_position` int(11) DEFAULT 3,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `company_profiles_data`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `company_profiles_data` (
  `company_id` varchar(64) NOT NULL,
  `data_payload` longtext NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `leads` (Multi-Tenant Isolated CRM)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
  `id` varchar(64) NOT NULL,
  `company_id` varchar(64) DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `company` varchar(128) DEFAULT NULL,
  `phone` varchar(64) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `service` varchar(191) NOT NULL,
  `budget` varchar(64) DEFAULT NULL,
  `stage` varchar(32) NOT NULL DEFAULT 'new',
  `intent_score` int(11) NOT NULL DEFAULT 85,
  `source` varchar(64) NOT NULL DEFAULT 'website',
  `notes` text DEFAULT NULL,
  `ai_suggested_reply` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_lead` (`company_id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_stage` (`stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `reviews`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` varchar(64) NOT NULL,
  `company_id` varchar(64) DEFAULT NULL,
  `author` varchar(255) NOT NULL,
  `rating` int(11) NOT NULL DEFAULT 5,
  `date` varchar(64) NOT NULL,
  `relative_time` varchar(64) DEFAULT NULL,
  `content` text NOT NULL,
  `sentiment` enum('positive','neutral','negative') NOT NULL DEFAULT 'positive',
  `topic` varchar(128) DEFAULT NULL,
  `is_operational_issue` tinyint(1) NOT NULL DEFAULT 0,
  `replied` tinyint(1) NOT NULL DEFAULT 0,
  `reply_text` text DEFAULT NULL,
  `reply_date` varchar(64) DEFAULT NULL,
  `source` enum('google','facebook','justdial') NOT NULL DEFAULT 'google',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_review` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `content_posts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `content_posts` (
  `id` varchar(64) NOT NULL,
  `company_id` varchar(64) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `type` varchar(64) DEFAULT 'offer',
  `platforms` text DEFAULT NULL,
  `channel` varchar(64) NOT NULL DEFAULT 'google',
  `headline` varchar(255) DEFAULT NULL,
  `caption` text NOT NULL,
  `cta` varchar(255) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `video_url` text DEFAULT NULL,
  `status` enum('draft','pending_approval','scheduled','published') NOT NULL DEFAULT 'scheduled',
  `scheduled_date` varchar(64) DEFAULT NULL,
  `scheduled_time` varchar(64) NOT NULL,
  `time_slot` varchar(64) DEFAULT NULL,
  `hashtags` text DEFAULT NULL,
  `reel_script` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_post` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `autonomous_actions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `autonomous_actions` (
  `id` varchar(64) NOT NULL,
  `company_id` varchar(64) DEFAULT NULL,
  `type` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `impact` varchar(128) DEFAULT NULL,
  `action_type` varchar(64) NOT NULL DEFAULT 'automatic',
  `status` varchar(32) NOT NULL DEFAULT 'pending_approval',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_action` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `company_integrations`
-- Stores per-tenant real API credentials and live connection verification states
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `company_integrations` (
  `id` varchar(64) NOT NULL,
  `company_id` varchar(64) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `status` enum('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
  `credentials` text DEFAULT NULL,
  `config` text DEFAULT NULL,
  `last_tested_at` varchar(64) DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_company_provider` (`company_id`, `provider`),
  KEY `idx_comp_integ` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `business_profile`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `business_profile` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `city` varchar(128) NOT NULL,
  `phone` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `website` varchar(255) NOT NULL,
  `whatsapp` varchar(64) NOT NULL,
  `services_json` json DEFAULT NULL,
  `settings_json` json DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `company_assets`
-- Stores logos, marketing photos, and brand media per company
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `company_assets` (
  `id` varchar(64) NOT NULL,
  `company_id` varchar(64) NOT NULL,
  `asset_type` enum('logo','photo') NOT NULL,
  `url` varchar(512) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_assets_comp` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `content_theme_history`
-- Tracks template and palette combinatorial rotation per company
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `content_theme_history` (
  `id` varchar(64) NOT NULL,
  `company_id` varchar(64) NOT NULL,
  `template_id` varchar(64) NOT NULL,
  `palette_id` varchar(64) NOT NULL,
  `used_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cth_company_used` (`company_id`, `used_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Seed Data for Aaditech BGA (bga.aaditechs.in)
-- --------------------------------------------------------
INSERT INTO `companies` (`id`, `user_id`, `name`, `legal_name`, `category`, `city`, `phone`, `website`, `google_place_id`, `autopilot_enabled`, `score`, `rank_position`)
VALUES (
  'comp_aaditech_main',
  'usr_system_default',
  'Aaditech Solution',
  'Aaditech Solution Private Limited',
  'IT Services, Software Development & Local SEO Growth Engine',
  'Thane - Mumbai MMR',
  '+91 22 4963 8603',
  'https://bga.aaditechs.in',
  'ChIJN1t_tDeuEmsRUsoyG83frY4',
  1,
  82,
  2
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `business_profile` (`id`, `name`, `category`, `address`, `city`, `phone`, `email`, `website`, `whatsapp`)
VALUES (
  'biz_aaditech',
  'Aaditech Solution',
  'IT Services, Software Development & Local SEO Growth Engine',
  '210, Anant Laxmi Chambers, B-Cabin, Dada Patil Marg, Thane (W)',
  'Thane - Mumbai MMR',
  '+91 22 4963 8603',
  'info@aaditechs.in',
  'https://bga.aaditechs.in',
  '+91 98204 55120'
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `leads` (`id`, `company_id`, `name`, `company`, `phone`, `email`, `service`, `budget`, `stage`, `intent_score`, `source`, `ai_suggested_reply`)
VALUES
('lead_1', 'comp_aaditech_main', 'Rajesh Singhania', 'Singhania Logistics MMR', '+91 98201 44520', 'rajesh@singhanialogistics.in', 'Android Fleet Management App & Billing ERP', '₹65,000', 'new', 96, 'Website Form', 'Namaste Rajesh ji! Aaditech Solution se humne aapki logistics fleet app requirement review ki. Humne Thane & Navi Mumbai ke 12+ transport operators ke liye custom tracking solutions live kiye hain. Kya hum aaj 4 PM par live demo schedule karein?'),
('lead_2', 'comp_aaditech_main', 'Dr. Sneha Patwardhan', 'Patwardhan Multispecialty Dental', '+91 98192 33410', 'dr.sneha@patwardhandental.com', 'Google 3-Pack Local SEO & WhatsApp Patient Booking', '₹18,000/mo', 'contacted', 88, 'Google 3-Pack Call', 'Hello Dr. Sneha! Thank you for contacting Aaditech Solution. We reviewed your Google clinic listing. Adding WhatsApp appointment booking and localized 3-pack optimization will directly increase high-ticket implant consults. Sharing sample case study!')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

COMMIT;
SET FOREIGN_KEY_CHECKS=1;
