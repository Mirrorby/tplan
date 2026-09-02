import type { Context } from 'grammy';
import type { Env, User } from '../types.js';
import { setMorningTime, setEveningTime } from '../db/users.js';

export async function showSettings(ctx: Context, user: User): Promise<void> {
  await ctx.reply(
    `⚙️ Настройки\n\n` +
      `Часовой пояс: ${user.timezone}\n` +
      `Утренний план: ${user.morning_time}\n` +
      `Вечерний отчёт: ${user.evening_time}\n\n` +
      `Чтобы изменить время, пришли команду:\n` +
      `/morning ЧЧ:ММ — время утреннего плана\n` +
      `/evening ЧЧ:ММ — время вечернего отчёта`,
  );
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function handleSetMorningTime(ctx: Context, env: Env, user: User, arg: string): Promise<void> {
  if (!TIME_RE.test(arg)) {
    await ctx.reply('Формат времени: ЧЧ:ММ, например 08:30.');
    return;
  }
  await setMorningTime(env, user.id, arg);
  await ctx.reply(`Утренний план теперь будет приходить в ${arg}.`);
}

export async function handleSetEveningTime(ctx: Context, env: Env, user: User, arg: string): Promise<void> {
  if (!TIME_RE.test(arg)) {
    await ctx.reply('Формат времени: ЧЧ:ММ, например 21:00.');
    return;
  }
  await setEveningTime(env, user.id, arg);
  await ctx.reply(`Вечерний отчёт теперь будет приходить в ${arg}.`);
}
