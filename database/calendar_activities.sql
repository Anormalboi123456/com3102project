-- ============================================================
-- HSU Student App — Academic Calendar & Activities Tables
-- Import into phpMyAdmin after database/user_accounts.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS hsu_student_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hsu_student_app;

-- ---------- 1. ACADEMIC CALENDAR EVENTS ----------
CREATE TABLE IF NOT EXISTS calendar_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  module_code VARCHAR(32) NULL,
  event_date DATE NOT NULL,
  event_time VARCHAR(64) NULL,
  event_type ENUM('Assignment', 'Test', 'Exam', 'Event', 'Holiday', 'Personal') NOT NULL DEFAULT 'Assignment',
  visibility ENUM('Public', 'HSU', 'Personal') NOT NULL DEFAULT 'HSU',
  description TEXT NULL,
  created_by VARCHAR(80) NOT NULL,
  created_by_role ENUM('Staff', 'Student', 'Public') NOT NULL DEFAULT 'Staff',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_calendar_event_date (event_date),
  INDEX idx_calendar_visibility (visibility),
  INDEX idx_calendar_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 2. CAMPUS ACTIVITIES ----------
CREATE TABLE IF NOT EXISTS activities (
  activity_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category ENUM('Academic', 'Club', 'Workshop', 'Sports', 'Career', 'Social') NOT NULL DEFAULT 'Club',
  activity_date DATE NOT NULL,
  activity_time VARCHAR(64) NOT NULL DEFAULT '14:00 - 16:00',
  location VARCHAR(150) NOT NULL DEFAULT 'HSU Campus',
  capacity INT UNSIGNED NOT NULL DEFAULT 50,
  audience ENUM('Public', 'HSU Only') NOT NULL DEFAULT 'Public',
  description TEXT NULL,
  created_by VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activities_date (activity_date),
  INDEX idx_activities_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 3. ACTIVITY REGISTRATIONS ----------
CREATE TABLE IF NOT EXISTS activity_registrations (
  registration_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  activity_id BIGINT UNSIGNED NOT NULL,
  username VARCHAR(80) NOT NULL,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_activity_user (activity_id, username),
  INDEX idx_reg_username (username),
  CONSTRAINT fk_reg_activity
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- DEMO SEED DATA (inserted only when tables are empty) ----------
INSERT INTO calendar_events (
  title, module_code, event_date, event_time, event_type, visibility, description, created_by, created_by_role
)
SELECT * FROM (
  SELECT 'COM3102 Project Submission Deadline' AS title, 'COM3102' AS module_code, '2026-11-30' AS event_date, '23:59' AS event_time, 'Assignment' AS event_type, 'HSU' AS visibility, 'Zip source code, SQL files, and MS Word README and submit on Moodle.' AS description, 'hsu_staff' AS created_by, 'Staff' AS created_by_role
  UNION ALL
  SELECT 'HSU Open Day 2026', NULL, '2026-12-05', '10:00 - 17:00', 'Event', 'Public', 'Campus tours, programme talks, and student club booths open to the public.', 'hsu_staff', 'Staff'
  UNION ALL
  SELECT 'COM3102 Project Video Demo', 'COM3102', '2026-12-10', '14:30 - 16:30', 'Assignment', 'HSU', 'Live Q&A and 15-minute presentation demo with the lecturer.', 'hsu_staff', 'Staff'
  UNION ALL
  SELECT 'COM2005 Final Assessment Test', 'COM2005', '2026-12-15', '10:00 - 12:00', 'Test', 'HSU', 'Closed-book written test in Block A Lecture Theatre.', 'hsu_staff', 'Staff'
  UNION ALL
  SELECT 'Semester 1 Examination Period Begins', NULL, '2026-12-18', '09:00', 'Exam', 'HSU', 'Check your individual exam timetable on the student portal.', 'hsu_staff', 'Staff'
  UNION ALL
  SELECT 'Christmas Day (Public Holiday)', NULL, '2026-12-25', 'All Day', 'Holiday', 'Public', 'University campus closed for public holiday.', 'hsu_staff', 'Staff'
) AS seed_events
WHERE NOT EXISTS (SELECT 1 FROM calendar_events LIMIT 1);

INSERT INTO activities (
  title, category, activity_date, activity_time, location, capacity, audience, description, created_by
)
SELECT * FROM (
  SELECT 'HSU Open Day & Club Fair' AS title, 'Social' AS category, '2026-12-05' AS activity_date, '10:00 - 17:00' AS activity_time, 'HSU Main Campus Plaza' AS location, 200 AS capacity, 'Public' AS audience, 'Meet student clubs, explore degree programmes, and join guided campus tours.' AS description, 'hsu_staff' AS created_by
  UNION ALL
  SELECT 'AI & Web Security Seminar', 'Academic', '2026-12-10', '15:00 - 16:30', 'Block D Auditorium', 80, 'HSU Only', 'Industry speakers discuss modern web security, API authentication, and AI engineering.' , 'hsu_staff'
  UNION ALL
  SELECT 'Coding Club: Next.js & PHP Workshop', 'Workshop', '2026-12-12', '14:00 - 16:30', 'Room A201', 35, 'Public', 'Hands-on session building full-stack web apps with React, Next.js, and MariaDB.', 'hsu_staff'
  UNION ALL
  SELECT 'HSU Career CV Clinic', 'Career', '2026-12-15', '13:30 - 16:00', 'Student Development Centre', 40, 'HSU Only', 'One-on-one resume review and mock interview tips for Year 2-4 students.', 'hsu_staff'
  UNION ALL
  SELECT 'Inter-Hall Badminton Friendly', 'Sports', '2026-12-16', '18:00 - 20:00', 'HSU Sports Hall', 32, 'HSU Only', 'Friendly doubles tournament open to all skill levels. Rackets provided.', 'hsu_staff'
  UNION ALL
  SELECT 'HSU Winter Christmas Party', 'Club', '2026-12-18', '18:30 - 21:30', 'Student Hall', 120, 'Public', 'Live music, festive snacks, gift exchange, and games. All students and friends welcome!', 'hsu_staff'
) AS seed_activities
WHERE NOT EXISTS (SELECT 1 FROM activities LIMIT 1);
