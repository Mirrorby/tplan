import { Bot } from 'grammy';
import type { Env } from '../types.js';
import { getActiveUsers } from '../db/users.js';
import { buildPlanForDate } from '../lib/plan.js';
import { renderPlanText, planKeyboard } from '../lib/keyboards.js';
import { currentTimeInTimezone, formatHumanDate, isTimeMatch, todayInTimezone } from '../lib/timezone.js';

/**
 * Тикает каждые 5 минут (см. wrangler.toml). Для каждого активного пользователя
 * проверяем, совпадает ли текущее локальное время с его morning_time,
 * и не отправляли ли мы план на сегодня уже (daily_plans.sent_morning).
 */
export async function runMorningPlanTick(env: Env): Promise<void> {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const users = await getActiveUsers(env);

  for (const user of users) {
    if (!user.tz_confirmed) continue;

    const nowLocal = currentTimeInTimezone(user.timezone);
    if (!isTimeMatch(nowLocal, user.morning_time)) continue;

    const date = todayInTimezone(user.timezone);
    const already = await env.DB.prepare(
      'SELECT sent_morning FROM daily_plans WHERE user_id = ? AND plan_date = ?',
    )
      .bind(user.id, date)
      .first<{ sent_morning: number }>();
    if (already?.sent_morning) continue;

    try {
      const items = await buildPlanForDate(env, user, date);
      const humanDate = formatHumanDate(date, user.timezone);
      const text = renderPlanText(`**Доброе утро 👋**\n\nПлан на ${humanDate}:`, items);
      const kb = planKeyboard(items);

      const sent = await bot.api.sendMessage(user.chat_id, text, {
        reply_markup: kb,
        parse_mode: 'Markdown',
      });

      await env.DB.prepare(
        `INSERT INTO daily_plans (user_id, plan_date, morning_message_id, morning_chat_id, sent_morning)
         VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(user_id, plan_date) DO UPDATE SET
           morning_message_id = excluded.morning_message_id,
           morning_chat_id = excluded.morning_chat_id,
           sent_morning = 1`,
      )
        .bind(user.id, date, sent.message_id, user.chat_id)
        .run();
    } catch (err) {
      console.error(`Morning plan failed for user ${user.id}:`, err);
    }
  }
}
