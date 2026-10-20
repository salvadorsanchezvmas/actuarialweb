-- Actuarial Factor — MySQL 8 / MariaDB 10.6+ schema
-- utf8mb4 for full Unicode (Spanish / English content)

CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  company         VARCHAR(160) NULL,
  password_hash   VARCHAR(100) NOT NULL,
  role            ENUM('admin','editor','client') NOT NULL DEFAULT 'client',
  status          ENUM('active','disabled') NOT NULL DEFAULT 'active',
  last_login_at   DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token_hash),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug              VARCHAR(80) NOT NULL UNIQUE,
  title             VARCHAR(160) NOT NULL,
  title_es          VARCHAR(160) NULL,
  tag               VARCHAR(80) NULL,
  tag_es            VARCHAR(80) NULL,
  summary           VARCHAR(500) NULL,
  summary_es        VARCHAR(500) NULL,
  description_html  MEDIUMTEXT NULL,
  description_html_es MEDIUMTEXT NULL,
  icon              VARCHAR(40) NULL,
  sort_order        SMALLINT NOT NULL DEFAULT 0,
  is_active         TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(120) NOT NULL,
  role_es       VARCHAR(120) NULL,
  bio           TEXT NULL,
  bio_es        TEXT NULL,
  photo_url     VARCHAR(255) NULL,
  linkedin_url  VARCHAR(255) NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stats (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label       VARCHAR(120) NOT NULL,
  label_es    VARCHAR(120) NULL,
  value       INT NOT NULL,
  suffix      VARCHAR(8) NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_role   VARCHAR(120) NOT NULL,
  author_role_es VARCHAR(120) NULL,
  company_type  VARCHAR(120) NULL,
  rating        DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  quote         TEXT NOT NULL,
  quote_es      TEXT NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offices (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  country       VARCHAR(80) NOT NULL,
  country_es    VARCHAR(80) NULL,
  city          VARCHAR(120) NOT NULL,
  city_es       VARCHAR(120) NULL,
  address_line  VARCHAR(255) NOT NULL,
  postal_code   VARCHAR(20) NULL,
  phone         VARCHAR(30) NULL,
  email         VARCHAR(160) NULL,
  map_url       VARCHAR(500) NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS careers (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(160) NOT NULL,
  location         VARCHAR(120) NOT NULL,
  title_es         VARCHAR(160) NULL,
  location_es      VARCHAR(120) NULL,
  employment_type  VARCHAR(60) NOT NULL DEFAULT 'Full-time',
  employment_type_es VARCHAR(60) NULL,
  summary          TEXT NULL,
  summary_es       TEXT NULL,
  status           ENUM('open','closed') NOT NULL DEFAULT 'open',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(80) NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  name_es     VARCHAR(120) NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(160) NOT NULL UNIQUE,
  title         VARCHAR(255) NOT NULL,
  title_es      VARCHAR(255) NULL,
  excerpt       VARCHAR(500) NULL,
  excerpt_es    VARCHAR(500) NULL,
  content_html  MEDIUMTEXT NULL,
  content_html_es MEDIUMTEXT NULL,
  cover_image   VARCHAR(255) NULL,
  category_id   INT UNSIGNED NULL,
  author_id     INT UNSIGNED NULL,
  status        ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_posts_pub (status, published_at),
  CONSTRAINT fk_post_category FOREIGN KEY (category_id) REFERENCES post_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_post_author FOREIGN KEY (author_id) REFERENCES team_members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_requests (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  company         VARCHAR(160) NOT NULL,
  email           VARCHAR(160) NOT NULL,
  phone           VARCHAR(20) NULL,
  service         VARCHAR(40) NULL,
  preferred_date  DATE NULL,
  subject         VARCHAR(160) NULL,
  message         TEXT NOT NULL,
  consent         TINYINT(1) NOT NULL DEFAULT 0,
  source          VARCHAR(255) NULL,
  lang            CHAR(2) NOT NULL DEFAULT 'en',
  status          ENUM('new','in_progress','closed') NOT NULL DEFAULT 'new',
  ip_address      VARCHAR(45) NULL,
  user_agent      VARCHAR(255) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email              VARCHAR(160) NOT NULL UNIQUE,
  status             ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
  source             VARCHAR(255) NULL,
  lang               CHAR(2) NOT NULL DEFAULT 'en',
  unsubscribe_token  CHAR(48) NOT NULL UNIQUE,
  ip_address         VARCHAR(45) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at    DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template    VARCHAR(60) NOT NULL,
  recipient   VARCHAR(255) NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  status      ENUM('sent','failed') NOT NULL,
  message_id  VARCHAR(255) NULL,
  error       VARCHAR(500) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
