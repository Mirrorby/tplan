import type { Context } from 'grammy';
import type { Env, User } from '../types.js';
import { getTaskById } from '../db/tasks.js';
import { getInstanceById, getRuleTitle } from '../db/recurringRules.js';
import { taskCardKeyboard } from '../lib/keyboards.js';
import type { ParsedCallback } from '../lib/callbackData.js';

const STATUS_LABEL: Record<string, string> = {
  pending: 'не выполнено',
  completed: 'выполнено ✅',
  skipped: 'пропущено',
  cancelled: 'отменено',
};

export async function handleOpenCard(ctx: Context, env: Env, user: User, cb: ParsedCallback): Promise<void> {
  if (!cb.id || !cb.kind) return;

  if (cb.kind === 'task') {
    const task = await getTaskById(env, user.id, cb.id);
    if (!task) {
      await ctx.answerCallbackQuery({ text: 'Задача не найдена' });
      return;
    }
    await ctx.answerCallbackQuery();
    const lines = [`**${task.title}**`, ''];
    if (task.description) lines.push(task.description, '');
    lines.push(`Статус: ${STATUS_LABEL[task.status]}.`);
    await ctx.reply(lines.join('\n'), {
      reply_markup: taskCardKeyboard('task', task.id),
      parse_mode: 'Markdown',
    });
    return;
  }

  const inst = await getInstanceById(env, user.id, cb.id);
  if (!inst) {
    await ctx.answerCallbackQuery({ text: 'Задача не найдена' });
    return;
  }
  await ctx.answerCallbackQuery();
  const title = await getRuleTitle(env, inst.rule_id);
  const lines = [`**${title}**`, '', `Статус: ${STATUS_LABEL[inst.status]}.`];
  await ctx.reply(lines.join('\n'), {
    reply_markup: taskCardKeyboard('inst', inst.id),
    parse_mode: 'Markdown',
  });
}
