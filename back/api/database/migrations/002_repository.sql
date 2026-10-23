-- Migration 002: role uploader + file repository (OneDrive). Run on databases created before this change.
ALTER TABLE users MODIFY role ENUM('admin','editor','uploader','client') NOT NULL DEFAULT 'client';

-- File repository (role uploader): files live in OneDrive (or local storage in
-- dev); MySQL keeps the metadata and the OneDrive item id.
CREATE TABLE IF NOT EXISTS repo_files (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  storage        ENUM('onedrive','local') NOT NULL,
  item_id        VARCHAR(255) NOT NULL,
  folder         VARCHAR(255) NOT NULL DEFAULT '',
  file_name      VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(150) NOT NULL,
  size_bytes     BIGINT UNSIGNED NOT NULL,
  title          VARCHAR(255) NULL,
  description    TEXT NULL,
  tags           VARCHAR(500) NULL,
  category       VARCHAR(120) NULL,
  lang           ENUM('en','es','other') NULL,
  web_url        VARCHAR(1000) NULL,
  is_missing     TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_by    INT UNSIGNED NULL,
  updated_by     INT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_repo_item (storage, item_id),
  INDEX idx_repo_category (category),
  INDEX idx_repo_created (created_at),
  FULLTEXT KEY ft_repo_search (file_name, title, description, tags),
  CONSTRAINT fk_repo_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_repo_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OAuth tokens for integrations (OneDrive personal): refresh token encrypted with AES-256-GCM
CREATE TABLE IF NOT EXISTS integration_tokens (
  provider       VARCHAR(40) NOT NULL PRIMARY KEY,
  account        VARCHAR(255) NULL,
  token_enc      TEXT NOT NULL,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
