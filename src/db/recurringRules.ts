import type { Env, RecurringRule, RuleType, TaskInstance, TaskStatus } from '../types.js';
import { weekdayOf } from '../lib/timezone.js';

export type CreateRuleOptions = {
  description?: string;
  weekdays?: number[];
  weeklyDay?: number;
  startsOn?: string | null;
  programEnrollmentId?: number | null;
  programItemKey?: string | null;
};

export async function createRule(
  env: Env,
  userId: number,
  title: string,
  ruleType: RuleType,
  opts: CreateRuleOptions = {},
): Promise<RecurringRule> {
  const res = await env.DB.prepare(
    `INSERT INTO recurring_rules
       (user_id, title, description, rule_type, weekdays, weekly_day, starts_on, program_enrollment_id, program_item_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      userId,
      title,
      opts.description ?? null,
      ruleType,
      opts.weekdays ? opts.weekdays.join(',') : null,
      opts.weeklyDay ?? null,
      opts.startsOn ?? null,
      opts.programEnrollmentId ?? null,
      opts.programItemKey ?? null,
    )
    .run();
  const id = Number(res.meta.last_row_id);
  const rule = await env.DB.prepare('SELECT * FROM recurring_rules WHERE id = ?').bind(id).first<RecurringRule>();
  if (!rule) throw new Error('Failed to create rule');
  return rule;
}

/** Подготовленный statement для createRule — нужен для DB.batch() при установке программ.
 *  OR IGNORE — подстраховка от дублей при повторной установке (раздел 14.8 ТЗ),
 *  сработает благодаря частичному уникальному индексу idx_recurring_program_item. */
export function createRuleStatement(
  env: Env,
  userId: number,
  title: string,
  ruleType: RuleType,
  opts: CreateRuleOptions = {},
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT OR IGNORE INTO recurring_rules
       (user_id, title, description, rule_type, weekdays, weekly_day, starts_on, program_enrollment_id, program_item_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    userId,
    title,
    opts.description ?? null,
    ruleType,
    opts.weekdays ? opts.weekdays.join(',') : null,
    opts.weeklyDay ?? null,
    opts.startsOn ?? null,
    opts.programEnrollmentId ?? null,
    opts.programItemKey ?? null,
  );
}

/** Проверяет владельца — не доверяем ID правила без сверки user_id (раздел 45 ТЗ). */
export async function getRuleById(env: Env, userId: number, ruleId: number): Promise<RecurringRule | null> {
  const row = await env.DB.prepare('SELECT * FROM recurring_rules WHERE id = ? AND user_id = ?')
    .bind(ruleId, userId)
    .first<RecurringRule>();
  return row ?? null;
}

/** Мягкое удаление: is_active=0 + deleted_at. Уже созданные task_instances (и история) остаются нетронутыми. */
export async function deactivateRule(env: Env, userId: number, ruleId: number): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE recurring_rules SET is_active = 0, deleted_at = datetime('now')
     WHERE id = ? AND user_id = ? AND is_active = 1`,
  )
    .bind(ruleId, userId)
    .run();
  return res.meta.changes > 0;
}

/** Все правила (включая уже неактивные) конкретного enrollment — для отключения программы. */
export async function getRulesForEnrollment(env: Env, enrollmentId: number): Promise<RecurringRule[]> {
  const { results } = await env.DB.prepare('SELECT * FROM recurring_rules WHERE program_enrollment_id = ?')
    .bind(enrollmentId)
    .all<RecurringRule>();
  return results;
}

/** Деактивирует все правила enrollment'а одним запросом — используется при отключении программы. */
export async function deactivateRulesForEnrollment(env: Env, enrollmentId: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE recurring_rules SET is_active = 0, deleted_at = datetime('now')
     WHERE program_enrollment_id = ? AND is_active = 1`,
  )
    .bind(enrollmentId)
    .run();
}

export async function getActiveRulesForUser(env: Env, userId: number): Promise<RecurringRule[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM recurring_rules WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL`,
  )
    .bind(userId)
    .all<RecurringRule>();
  return results;
}

/** Применимо ли правило к дате dateStr (по дню недели в TZ пользователя, с учётом даты начала). */
export function ruleAppliesToDate(rule: RecurringRule, dateStr: string, timezone: string): boolean {
  if (rule.starts_on && dateStr < rule.starts_on) {
    return false;
  }
  if (rule.rule_type === 'daily') return true;
  const wd = weekdayOf(dateStr, timezone);
  if (rule.rule_type === 'weekdays') {
    const days = (rule.weekdays ?? '').split(',').map(Number);
    return days.includes(wd);
  }
  if (rule.rule_type === 'weekly') {
    return rule.weekly_day === wd;
  }
  return false;
}

export async function getInstanceForDate(
  env: Env,
  ruleId: number,
  date: string,
): Promise<TaskInstance | null> {
  const row = await env.DB.prepare('SELECT * FROM task_instances WHERE rule_id = ? AND instance_date = ?')
    .bind(ruleId, date)
    .first<TaskInstance>();
  return row ?? null;
}

/** Создаёт экземпляр задачи на дату, если он ещё не существует (идемпотентно). */
export async function ensureInstanceForDate(
  env: Env,
  rule: RecurringRule,
  date: string,
): Promise<TaskInstance> {
  const existing = await getInstanceForDate(env, rule.id, date);
  if (existing) return existing;

  await env.DB.prepare(
    `INSERT INTO task_instances (rule_id, user_id, instance_date) VALUES (?, ?, ?)
     ON CONFLICT(rule_id, instance_date) DO NOTHING`,
  )
    .bind(rule.id, rule.user_id, date)
    .run();

  const created = await getInstanceForDate(env, rule.id, date);
  if (!created) throw new Error('Failed to create task instance');
  return created;
}

export async function getInstanceById(
  env: Env,
  userId: number,
  instanceId: number,
): Promise<TaskInstance | null> {
  const row = await env.DB.prepare('SELECT * FROM task_instances WHERE id = ? AND user_id = ?')
    .bind(instanceId, userId)
    .first<TaskInstance>();
  return row ?? null;
}

export async function setInstanceStatus(
  env: Env,
  userId: number,
  instanceId: number,
  status: TaskStatus,
): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE task_instances SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
  )
    .bind(status, instanceId, userId)
    .run();
  return res.meta.changes > 0;
}

export async function postponeInstance(
  env: Env,
  userId: number,
  instanceId: number,
  newDate: string,
): Promise<boolean> {
  // Перенос экземпляра — это фактически смена его даты; если на новой дате уже есть
  // экземпляр этого правила, перенос отклоняется (нельзя задвоить).
  const conflict = await env.DB.prepare(
    `SELECT id FROM task_instances WHERE id != ? AND rule_id = (SELECT rule_id FROM task_instances WHERE id = ?) AND instance_date = ?`,
  )
    .bind(instanceId, instanceId, newDate)
    .first();
  if (conflict) return false;

  const res = await env.DB.prepare(
    `UPDATE task_instances
     SET instance_date = ?, postpone_count = postpone_count + 1,
         last_postponed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND user_id = ? AND status = 'pending'`,
  )
    .bind(newDate, instanceId, userId)
    .run();
  return res.meta.changes > 0;
}

/** Список правил + гарантированное создание их экземпляров на дату — то, что нужно для сборки плана дня. */
export async function ensureInstancesForDate(
  env: Env,
  userId: number,
  date: string,
  timezone: string,
): Promise<TaskInstance[]> {
  const rules = await getActiveRulesForUser(env, userId);
  const applicable = rules.filter((r) => ruleAppliesToDate(r, date, timezone));
  const instances: TaskInstance[] = [];
  for (const rule of applicable) {
    instances.push(await ensureInstanceForDate(env, rule, date));
  }
  return instances;
}

export async function getRuleTitle(env: Env, ruleId: number): Promise<string> {
  const row = await env.DB.prepare('SELECT title FROM recurring_rules WHERE id = ?')
    .bind(ruleId)
    .first<{ title: string }>();
  return row?.title ?? '';
}
