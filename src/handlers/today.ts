import type { Context } from 'grammy';
import type { Env, User } from '../types.js';
import { buildPlanForDate } from '../lib/plan.js';
import { renderPlanText, planKeyboard } from '../lib/keyboards.js';
import { formatHumanDate, todayInTimezone } from '../lib/timezone.js';

export async function showToday(ctx: Context, env: Env, user: User): Promise<void> {
  const date = todayInTimezone(user.timezone);
  await showPlanForDate(ctx, env, user, date, 'План на сегодня');
}

export async function showPlanForDate(
  ctx: Context,
  env: Env,
  user: User,
  date: string,
  titlePrefix = 'План на',
): Promise<void> {
  const items = await buildPlanForDate(env, user, date);
  const humanDate = formatHumanDate(date, user.timezone);
  const text = renderPlanText(`**${titlePrefix} — ${humanDate}**`, items);
  const kb = planKeyboard(items);

  await ctx.reply(text, { reply_markup: kb, parse_mode: 'Markdown' });
}
