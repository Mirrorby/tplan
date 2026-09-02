import { Bot } from 'grammy';
import type { Env } from '../types.js';
import { getActiveUsers } from '../db/users.js';
import { buildPlanForDate } from '../lib/plan.js';
import { currentTimeInTimezone, formatHumanDate, isTimeMatch, todayInTimezone } from '../lib/timezone.js';

export async function runEveningReportTick(env: Env): Promise<void> {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const users = await getActiveUsers(env);

  for (const user of users) {
    if (!user.tz_confirmed) continue;

    const nowLocal = currentTimeInTimezone(user.timezone);
    if (!isTimeMatch(nowLocal, user.evening_time)) continue;

    const date = todayInTimezone(user.timezone);
    const already = await env.DB.prepare(
      'SELECT sent_evening FROM daily_plans WHERE user_id = ? AND plan_date = ?',
    )
      .bind(user.id, date)
      .first<{ sent_evening: number }>();
    if (already?.sent_evening) continue;

    try {
      const items = await buildPlanForDate(env, user, date);
      const done = items.filter((i) => i.status === 'completed').length;
      const pending = items.filter((i) => i.status === 'pending');
      const humanDate = formatHumanDate(date, user.timezone);

      const lines = [`**Итоги дня — ${humanDate}**`, '', `Выполнено: ${done} из ${items.length}.`];
      if (pending.length > 0) {
        lines.push('', 'Осталось невыполненным:');
        for (const p of pending) lines.push(`⬜ ${p.title}`);
        lines.push('', 'Открой /today, чтобы перенести или закрыть оставшиеся задачи.');
      } else if (items.length > 0) {
        lines.push('', 'Все задачи закрыты — отличный день! 🎉');
      }

      await bot.api.sendMessage(user.chat_id, lines.join('\n'), { parse_mode: 'Markdown' });

      await env.DB.prepare(
        `INSERT INTO daily_plans (user_id, plan_date, sent_evening)
         VALUES (?, ?, 1)
         ON CONFLICT(user_id, plan_date) DO UPDATE SET sent_evening = 1`,
      )
        .bind(user.id, date)
        .run();

      if (user.auto_carry_over && pending.length > 0) {
        // Автоматический перенос невыполненных обычных задач на завтра.
        // Экземпляры повторяющихся правил не переносим — на следующий подходящий день
        // для них будет создан новый экземпляр автоматически.
        const tomorrow = await env.DB.prepare(
          `SELECT date(?, '+1 day') as d`,
        ).bind(date).first<{ d: string }>();
        if (tomorrow?.d) {
          await env.DB.prepare(
            `UPDATE tasks SET due_date = ?, postpone_count = postpone_count + 1,
             last_postponed_at = datetime('now'), updated_at = datetime('now')
             WHERE user_id = ? AND due_date = ? AND status = 'pending'`,
          )
            .bind(tomorrow.d, user.id, date)
            .run();
        }
      }
    } catch (err) {
      console.error(`Evening report failed for user ${user.id}:`, err);
    }
  }
}
