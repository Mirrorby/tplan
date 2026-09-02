import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import type { Env } from '../types.js';
import { createUser, getUserByTelegramId, setUserTimezone } from '../db/users.js';
import { showToday } from './today.js';

// Небольшой список часто встречающихся зон — для быстрого выбора кнопкой.
// Пользователь всегда может прислать любую IANA-зону текстом (например "Asia/Almaty").
const TZ_SUGGESTIONS = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
  'Europe/Kyiv',
  'Asia/Almaty',
  'Europe/Minsk',
];

export async function handleStart(ctx: Context, env: Env): Promise<void> {
  const from = ctx.from;
  if (!from || !ctx.chat) return;

  const existing = await getUserByTelegramId(env, from.id);
  if (existing) {
    await showToday(ctx, env, existing);
    return;
  }

  // Грубая эвристика по языку клиента — не идеальна, но даёт разумный дефолт,
  // который пользователь подтверждает или меняет на следующем шаге.
  const guessedTimezone = from.language_code === 'uk' ? 'Europe/Kyiv' : 'Europe/Moscow';

  const user = await createUser(env, from.id, ctx.chat.id, from.username ?? null, from.first_name ?? null, guessedTimezone);

  const kb = new InlineKeyboard();
  for (const tz of TZ_SUGGESTIONS) {
    kb.text(tz, `tz:${tz}`).row();
  }

  await ctx.reply(
    `Добро пожаловать! 👋\n\nЯ буду присылать тебе план на день прямо сюда, в чат.\n\n` +
      `Сначала выбери свой часовой пояс (по умолчанию я поставил ${guessedTimezone}), ` +
      `или пришли его текстом в формате IANA, например "Asia/Almaty":`,
    { reply_markup: kb },
  );

  // Отмечаем, что тайм-зону ещё нужно подтвердить — хэндлер текстовых сообщений
  // проверяет tz_confirmed прежде, чем маршрутизировать остальной ввод.
  void user;
}

export async function handleTimezoneChoice(ctx: Context, env: Env, timezone: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const user = await getUserByTelegramId(env, from.id);
  if (!user) return;

  await setUserTimezone(env, user.id, timezone);
  await ctx.answerCallbackQuery({ text: `Часовой пояс установлен: ${timezone}` });
  await ctx.reply(`Готово! Часовой пояс: ${timezone}\n\nУтренний план буду присылать в ${user.morning_time}, вечерний отчёт — в ${user.evening_time}. Это можно изменить в настройках.`);

  const updated = await getUserByTelegramId(env, from.id);
  if (updated) await showToday(ctx, env, updated);
}
