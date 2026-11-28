-- ============================================================
-- HSU Student App — Grade Database (Big Data concept)
-- Students upload academic results with comments.
-- Aggregated data powers module difficulty statistics.
-- Import into phpMyAdmin after database/user_accounts.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS hsu_student_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hsu_student_app;

-- ---------- GRADES (crowdsourced academic results) ----------
CREATE TABLE IF NOT EXISTS grades (
  grade_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  module_code VARCHAR(32) NOT NULL,
  module_name VARCHAR(150) NULL,
  grade VARCHAR(8) NOT NULL,
  semester VARCHAR(40) NULL,
  academic_year SMALLINT UNSIGNED NULL,
  comment TEXT NULL,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grades_module (module_code),
  INDEX idx_grades_username (username),
  INDEX idx_grades_grade (grade),
  INDEX idx_grades_year (academic_year),
  CONSTRAINT chk_grades_grade_format
    CHECK (grade IN (
      'A+', 'A', 'A-',
      'B+', 'B', 'B-',
      'C+', 'C', 'C-',
      'D', 'F',
      'Pass', 'Fail'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Demo seed data (only when table is empty)
INSERT INTO grades (
  username, module_code, module_name, grade, semester, academic_year, comment, is_anonymous
)
SELECT * FROM (
  SELECT 's2024001' AS username, 'COM3102' AS module_code, 'Web Application Development' AS module_name,
         'A' AS grade, '2025-26 Sem 1' AS semester, 2025 AS academic_year,
         'Project-heavy; clear rubrics made it manageable.' AS comment, 1 AS is_anonymous
  UNION ALL
  SELECT 's2023005', 'COM3102', 'Web Application Development', 'B+', '2025-26 Sem 1', 2025,
         'Lots of work but fair grading.', 1
  UNION ALL
  SELECT 's2024001', 'COM2005', 'Database Systems', 'A-', '2024-25 Sem 2', 2025,
         'SQL practice helps a lot.', 1
  UNION ALL
  SELECT 's2023005', 'COM2005', 'Database Systems', 'B', '2024-25 Sem 2', 2025,
         'Theory questions were tough.', 1
  UNION ALL
  SELECT 's2024001', 'BUS1001', 'Introduction to Business', 'A+', '2024-25 Sem 1', 2024,
         'Straightforward if you attend lectures.', 1
  UNION ALL
  SELECT 's2023005', 'BUS1001', 'Introduction to Business', 'A', '2024-25 Sem 1', 2024,
         'Easy module for non-business students too.', 1
  UNION ALL
  SELECT 's2024001', 'MAT1001', 'Calculus I', 'C+', '2024-25 Sem 1', 2024,
         'Very hard; need strong math background.', 1
  UNION ALL
  SELECT 's2023005', 'MAT1001', 'Calculus I', 'D', '2024-25 Sem 1', 2024,
         'Failed the midterm, barely passed overall.', 1
  UNION ALL
  SELECT 's2024001', 'ENG1001', 'English for Academic Purposes', 'B', '2024-25 Sem 1', 2024,
         'Writing assignments take time.', 1
  UNION ALL
  SELECT 's2023005', 'ENG1001', 'English for Academic Purposes', 'B+', '2024-25 Sem 1', 2024,
         'Manageable with consistent effort.', 1
  UNION ALL
  SELECT 'hsu_staff', 'COM3102', 'Web Application Development', 'A-', '2025-26 Sem 1', 2025,
         'Sample staff entry for testing.', 0
) AS seed_grades
WHERE NOT EXISTS (SELECT 1 FROM grades LIMIT 1);