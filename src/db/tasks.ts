import type { Env, Task, TaskStatus } from '../types.js';

export async function createTask(
  env: Env,
  userId: number,
  title: string,
  dueDate: string,
  description: string | null = null,
): Promise<Task> {
  const res = await env.DB.prepare(
    `INSERT INTO tasks (user_id, title, description, due_date, original_date)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(userId, title, description, dueDate, dueDate)
    .run();
  const id = res.meta.last_row_id;
  const task = await getTaskById(env, userId, Number(id));
  if (!task) throw new Error('Failed to create task');
  return task;
}

/** Всегда проверяем user_id вместе с id — не доверяем ID, пришедшему от клиента (раздел 45 ТЗ). */
export async function getTaskById(env: Env, userId: number, taskId: number): Promise<Task | null> {
  const row = await env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .bind(taskId, userId)
    .first<Task>();
  return row ?? null;
}

export async function getTasksForDate(env: Env, userId: number, date: string): Promise<Task[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM tasks WHERE user_id = ? AND due_date = ? AND status != 'cancelled'
     ORDER BY due_time IS NULL, due_time, created_at`,
  )
    .bind(userId, date)
    .all<Task>();
  return results;
}

export async function setTaskStatus(
  env: Env,
  userId: number,
  taskId: number,
  status: TaskStatus,
): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
  )
    .bind(status, taskId, userId)
    .run();
  return res.meta.changes > 0;
}

export async function postponeTask(
  env: Env,
  userId: number,
  taskId: number,
  newDate: string,
): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE tasks
     SET due_date = ?, postpone_count = postpone_count + 1,
         last_postponed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND user_id = ? AND status = 'pending'`,
  )
    .bind(newDate, taskId, userId)
    .run();
  return res.meta.changes > 0;
}

/** Невыполненные задачи, оставшиеся с прошлых дней (для "перенесённых ранее задач", раздел 8 ТЗ). */
export async function getOverdueTasks(env: Env, userId: number, beforeDate: string): Promise<Task[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM tasks WHERE user_id = ? AND due_date < ? AND status = 'pending'`,
  )
    .bind(userId, beforeDate)
    .all<Task>();
  return results;
}
