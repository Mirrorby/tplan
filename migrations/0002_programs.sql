-- 0002_programs.sql
-- Готовые программы (тренировки, медитации): установленные программы пользователей
-- + связь recurring_rules/tasks с программой.

CREATE TABLE IF NOT EXISTS program_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  program_key TEXT NOT NULL,
  program_version INTEGER NOT NULL DEFAULT 1,
  start_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at TEXT,
  UNIQUE(user_id, program_key)
);

CREATE INDEX IF NOT EXISTS idx_program_enrollments_user_status
ON program_enrollments(user_id, status);

ALTER TABLE recurring_rules ADD COLUMN starts_on TEXT;
ALTER TABLE recurring_rules ADD COLUMN program_enrollment_id INTEGER REFERENCES program_enrollments(id);
ALTER TABLE recurring_rules ADD COLUMN program_item_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_program_item
ON recurring_rules(program_enrollment_id, program_item_key)
WHERE program_enrollment_id IS NOT NULL;

ALTER TABLE tasks ADD COLUMN program_enrollment_id INTEGER REFERENCES program_enrollments(id);
ALTER TABLE tasks ADD COLUMN program_item_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_program_item
ON tasks(program_enrollment_id, program_item_key, due_date)
WHERE program_enrollment_id IS NOT NULL;
