CREATE DATABASE IF NOT EXISTS hsu_student_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hsu_student_app;

CREATE TABLE IF NOT EXISTS students (
  student_id VARCHAR(32) NOT NULL,
  student_name VARCHAR(120) NOT NULL,
  programme VARCHAR(80) NOT NULL,
  last_login DATETIME NULL,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id)
) ENGINE=InnoDB;
