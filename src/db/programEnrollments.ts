import type { Env, ProgramEnrollment, ProgramKey } from '../types.js';

/** Активная установка программы для пользователя, если есть. */
export async function getActiveEnrollment(
  env: Env,
  userId: number,
  programKey: ProgramKey,
): Promise<ProgramEnrollment | null> {
  const row = await env.DB.prepare(
    `SELECT * FROM program_enrollments WHERE user_id = ? AND program_key = ? AND status = 'active'`,
  )
    .bind(userId, programKey)
    .first<ProgramEnrollment>();
  return row ?? null;
}

/** Любая установка (включая отменённую) — используется, чтобы отличить "не ставил" от "уже отключал". */
export async function getAnyEnrollment(
  env: Env,
  userId: number,
  programKey: ProgramKey,
): Promise<ProgramEnrollment | null> {
  const row = await env.DB.prepare('SELECT * FROM program_enrollments WHERE user_id = ? AND program_key = ?')
    .bind(userId, programKey)
    .first<ProgramEnrollment>();
  return row ?? null;
}

/** Проверка владельца — не доверяем enrollment_id, пришедшему из callback (раздел 16 ТЗ). */
export async function getEnrollmentById(
  env: Env,
  userId: number,
  enrollmentId: number,
): Promise<ProgramEnrollment | null> {
  const row = await env.DB.prepare('SELECT * FROM program_enrollments WHERE id = ? AND user_id = ?')
    .bind(enrollmentId, userId)
    .first<ProgramEnrollment>();
  return row ?? null;
}

export async function createEnrollment(
  env: Env,
  userId: number,
  programKey: ProgramKey,
  startDate: string,
): Promise<ProgramEnrollment> {
  const res = await env.DB.prepare(
    `INSERT INTO program_enrollments (user_id, program_key, start_date) VALUES (?, ?, ?)`,
  )
    .bind(userId, programKey, startDate)
    .run();
  const id = Number(res.meta.last_row_id);
  const row = await env.DB.prepare('SELECT * FROM program_enrollments WHERE id = ?')
    .bind(id)
    .first<ProgramEnrollment>();
  if (!row) throw new Error('Failed to create program enrollment');
  return row;
}

export async function cancelEnrollment(env: Env, userId: number, enrollmentId: number): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE program_enrollments SET status = 'cancelled', cancelled_at = datetime('now')
     WHERE id = ? AND user_id = ? AND status = 'active'`,
  )
    .bind(enrollmentId, userId)
    .run();
  return res.meta.changes > 0;
}
