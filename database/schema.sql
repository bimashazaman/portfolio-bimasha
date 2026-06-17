-- ============================================================
--  Portfolio CMS — database schema
--  Target: MySQL 8.x / MariaDB on Hostinger shared hosting.
--  Engine: InnoDB, charset utf8mb4 (full Unicode incl. emoji).
--
--  Tables:
--    sections          — the live content; one row per section key (18 total).
--    section_versions  — append-only history; a snapshot is written here
--                        BEFORE every edit/revert so changes are undoable.
--    messages          — contact-form submissions.
--    meta_info         — small key/value store (admin password hash, global_rev).
--    login_attempts    — per-IP failed-login counters (brute-force throttle).
--
--  NOTE: `key` and `value` are SQL reserved words; they are always written
--  back-quoted here and in every PHP query. install.php issues the same
--  CREATE TABLE IF NOT EXISTS statements, so either source produces an
--  identical schema. All access from PHP is via PDO prepared statements.
-- ============================================================

-- ------------------------------------------------------------
--  sections — the live, editable content.
--  `key` is the section key (one of the 18 SECTION_KEYS); primary key, so
--  there is exactly one live row per section.
--  `payload` holds the section's value as JSON text (objects/arrays/strings).
--  `rev` increments on every edit (per-section revision counter).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  `key`      VARCHAR(40) NOT NULL,
  `payload`  LONGTEXT    NOT NULL,
  `rev`      INT         NOT NULL DEFAULT 1,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
--  section_versions — history / undo trail.
--  One snapshot row is inserted here (copy of the current live payload)
--  immediately before a section is updated or reverted. Never edited.
--  Indexed by `key` so the admin "versions" view loads quickly.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS section_versions (
  id         INT          NOT NULL AUTO_INCREMENT,
  `key`      VARCHAR(40)  NOT NULL,
  `payload`  LONGTEXT     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_section_versions_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
--  messages — contact-form submissions.
--  `ip` stores the submitter address (IPv4 or IPv6, hence 45 chars).
--  Validation/anti-abuse happens in api/contact.php before insert.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(160) DEFAULT NULL,
  email      VARCHAR(190) DEFAULT NULL,
  stage      VARCHAR(80)  DEFAULT NULL,
  message    TEXT         DEFAULT NULL,
  ip         VARCHAR(45)  DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
--  meta_info — tiny key/value store.
--  Known keys:
--    'admin_password_hash' — password_hash() output for the single admin user.
--    'global_rev'          — global revision counter, bumped on every edit;
--                            surfaced by the public API as `rev`.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta_info (
  `key`   VARCHAR(60) NOT NULL,
  `value` TEXT        DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
--  login_attempts — per-IP failed-login throttle.
--  api/auth/login.php increments `attempts` on each failure and applies a
--  progressive delay (never a hard lockout, so a shared IP can't be used to
--  DoS the real admin). A successful login clears the row; stale rows are
--  ignored after the window and overwritten on the next attempt.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  ip        VARCHAR(45) NOT NULL,
  attempts  INT         NOT NULL DEFAULT 0,
  last_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
