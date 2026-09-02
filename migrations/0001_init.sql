-- 0001_init.sql
-- Базовая схема для Telegram-планера (MVP, этап 1)

-- ============ users ============
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id INTEGER NOT NULL UNIQUE,
  chat_id INTEGER NOT NULL,
  username TEXT,
  first_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
  morning_time TEXT NOT NULL DEFAULT '08:00',   -- HH:MM в локальном времени пользователя
  evening_time TEXT NOT NULL DEFAULT '21:00',
  auto_carry_over INTEGER NOT NULL DEFAULT 0,   -- 0/1: автоматически переносить невыполненные задачи
  status TEXT NOT NULL DEFAULT 'active',        -- active | paused
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  tz_confirmed INTEGER NOT NULL DEFAULT 0        -- 0/1: подтвердил ли пользователь часовой пояс
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_user_id);

-- ============ tasks (разовые задачи) ============
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,          -- YYYY-MM-DD, текущая плановая дата
  due_time TEXT,                   -- HH:MM, необязательно
  original_date TEXT NOT NULL,     -- дата, на которую задача была создана изначально
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | skipped | cancelled
  priority INTEGER,                -- заложено, не используется в MVP
  source TEXT NOT NULL DEFAULT 'user', -- user | system
  postpone_count INTEGER NOT NULL DEFAULT 0,
  last_postponed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, due_date);

-- ============ recurring_rules (правила повторения) ============
CREATE TABLE IF NOT EXISTS recurring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,         -- 'daily' | 'weekdays' | 'weekly'
  weekdays TEXT,                   -- CSV из чисел 0-6 (0=вс) для 'weekdays'
  weekly_day INTEGER,              -- 0-6 для 'weekly'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT                  -- soft delete, история instance'ов сохраняется
);

CREATE INDEX IF NOT EXISTS idx_rules_user_active ON recurring_rules(user_id, is_active);

-- ============ task_instances (экземпляры повторяющихся задач на конкретный день) ============
CREATE TABLE IF NOT EXISTS task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL REFERENCES recurring_rules(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  instance_date TEXT NOT NULL,     -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | skipped | cancelled
  postpone_count INTEGER NOT NULL DEFAULT 0,
  last_postponed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(rule_id, instance_date)
);

CREATE INDEX IF NOT EXISTS idx_instances_user_date ON task_instances(user_id, instance_date);

-- ============ daily_plans (план пользователя на дату — снимок для истории/отчётов) ============
CREATE TABLE IF NOT EXISTS daily_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_date TEXT NOT NULL,
  morning_message_id INTEGER,      -- id сообщения в Telegram (для editMessageText)
  morning_chat_id INTEGER,
  sent_morning INTEGER NOT NULL DEFAULT 0,
  sent_evening INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, plan_date)
);

-- ============ scheduled_actions (очередь автоматических действий) ============
CREATE TABLE IF NOT EXISTS scheduled_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,       -- 'morning_plan' | 'evening_report'
  run_at_utc TEXT NOT NULL,        -- вычисленное время в UTC
  status TEXT NOT NULL DEFAULT 'pending', -- pending | done | failed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduled_status_time ON scheduled_actions(status, run_at_utc);

-- ============ conversation_states (пошаговые диалоги) ============
CREATE TABLE IF NOT EXISTS conversation_states (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  state TEXT NOT NULL,             -- например 'awaiting_title' | 'awaiting_date' | 'awaiting_recurrence'
  draft_json TEXT,                 -- JSON с накопленными данными черновика
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
