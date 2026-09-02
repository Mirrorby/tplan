import type { Env, User } from '../types.js';

export async function getUserByTelegramId(env: Env, telegramUserId: number): Promise<User | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE telegram_user_id = ?')
    .bind(telegramUserId)
    .first<User>();
  return row ?? null;
}

export async function getUserById(env: Env, id: number): Promise<User | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  return row ?? null;
}

export async function createUser(
  env: Env,
  telegramUserId: number,
  chatId: number,
  username: string | null,
  firstName: string | null,
  guessedTimezone: string,
): Promise<User> {
  await env.DB.prepare(
    `INSERT INTO users (telegram_user_id, chat_id, username, first_name, timezone)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(telegramUserId, chatId, username, firstName, guessedTimezone)
    .run();
  const user = await getUserByTelegramId(env, telegramUserId);
  if (!user) throw new Error('Failed to create user');
  return user;
}

export async function setUserTimezone(env: Env, userId: number, timezone: string): Promise<void> {
  await env.DB.prepare('UPDATE users SET timezone = ?, tz_confirmed = 1 WHERE id = ?')
    .bind(timezone, userId)
    .run();
}

export async function setMorningTime(env: Env, userId: number, time: string): Promise<void> {
  await env.DB.prepare('UPDATE users SET morning_time = ? WHERE id = ?').bind(time, userId).run();
}

export async function setEveningTime(env: Env, userId: number, time: string): Promise<void> {
  await env.DB.prepare('UPDATE users SET evening_time = ? WHERE id = ?').bind(time, userId).run();
}

/** Все активные пользователи — используется cron-обработчиками. */
export async function getActiveUsers(env: Env): Promise<User[]> {
  const { results } = await env.DB.prepare("SELECT * FROM users WHERE status = 'active'").all<User>();
  return results;
}
