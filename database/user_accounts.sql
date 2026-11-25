CREATE DATABASE IF NOT EXISTS hsu_student_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hsu_student_app;
CREATE TABLE IF NOT EXISTS user_accounts (
  account_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_hsu_student TINYINT(1) NOT NULL DEFAULT 0,
  is_hsu_staff TINYINT(1) NOT NULL DEFAULT 0,
  student_id VARCHAR(32) NULL,
  staff_number VARCHAR(32) NULL,
  entrance_year SMALLINT UNSIGNED NULL,
  programme VARCHAR(80) NULL,
  heard_about VARCHAR(255) NULL,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_user_accounts_student_id_format
    CHECK (student_id IS NULL OR student_id REGEXP '^[Ss][0-9]{6}$')
);