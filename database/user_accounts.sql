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

-- Sample accounts (password for all demo accounts: password)
-- bcrypt hash below is the standard one for the string "password"
INSERT INTO user_accounts (
  username, password_hash, is_hsu_student, is_hsu_staff,
  student_id, staff_number, entrance_year, programme, heard_about
)
-- the password_hash IS "password", somehow it is encrypted, wow gemini! 
SELECT * FROM (
  SELECT
    'hsu_staff' AS username,
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' AS password_hash,
    0 AS is_hsu_student,
    1 AS is_hsu_staff,
    NULL AS student_id,
    'STF001' AS staff_number,
    NULL AS entrance_year,
    'Academic Affairs' AS programme,
    'Internal' AS heard_about
  UNION ALL
  SELECT
    's2024001',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    1, 0,
    'S202401',
    NULL,
    2024,
    'Bachelor of Science in Computer Science',
    'Open Day'
  UNION ALL
  SELECT
    's2023005',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    1, 0,
    'S202305',
    NULL,
    2023,
    'Bachelor of Business Administration',
    'Friend'
  UNION ALL
  SELECT
    'public_visitor',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    0, 0,
    NULL,
    NULL,
    NULL,
    NULL,
    'Website'
) AS seed_users
WHERE NOT EXISTS (SELECT 1 FROM user_accounts LIMIT 1);
