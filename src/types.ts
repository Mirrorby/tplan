export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'cancelled';

export interface User {
  id: number;
  telegram_user_id: number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  timezone: string;
  morning_time: string; // HH:MM
  evening_time: string; // HH:MM
  auto_carry_over: number;
  status: 'active' | 'paused';
  created_at: string;
  tz_confirmed: number;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  due_date: string; // YYYY-MM-DD
  due_time: string | null;
  original_date: string;
  status: TaskStatus;
  priority: number | null;
  source: string;
  postpone_count: number;
  last_postponed_at: string | null;
  created_at: string;
  updated_at: string;
  program_enrollment_id: number | null;
  program_item_key: string | null;
}

export type RuleType = 'daily' | 'weekdays' | 'weekly';

export interface RecurringRule {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  rule_type: RuleType;
  weekdays: string | null; // CSV "1,3,5"
  weekly_day: number | null;
  is_active: number;
  created_at: string;
  deleted_at: string | null;
  starts_on: string | null; // YYYY-MM-DD — правило не применяется раньше этой даты
  program_enrollment_id: number | null;
  program_item_key: string | null;
}

export interface TaskInstance {
  id: number;
  rule_id: number;
  user_id: number;
  instance_date: string;
  status: TaskStatus;
  postpone_count: number;
  last_postponed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Единый вид "пункта плана", объединяющий tasks и task_instances для отрисовки. */
export interface PlanItem {
  kind: 'task' | 'instance';
  id: number; // id соответствующей строки (tasks.id или task_instances.id)
  title: string;
  status: TaskStatus;
  due_time: string | null;
}

export type ConversationState =
  | 'awaiting_title'
  | 'awaiting_date'
  | 'awaiting_custom_date'
  | 'awaiting_recurrence'
  | 'awaiting_postpone_date';

export interface ConversationDraft {
  title?: string;
  description?: string;
  due_date?: string;
  rule_type?: RuleType;
  weekdays?: number[];
  // id задачи/инстанса, которую переносим (для awaiting_postpone_date)
  postpone_task_id?: number;
  postpone_kind?: 'task' | 'inst';
}

// ============ Готовые программы (тренировки, медитации) ============

export type ProgramKey = 'home_workouts_v1' | 'meditation_beginner_v1';
export type ProgramStatus = 'active' | 'cancelled';
export type StartMode = 'today' | 'next_monday';

export interface ProgramEnrollment {
  id: number;
  user_id: number;
  program_key: ProgramKey;
  program_version: number;
  start_date: string;
  status: ProgramStatus;
  created_at: string;
  cancelled_at: string | null;
}
