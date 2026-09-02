import type { Context } from 'grammy';
import type { Env, User } from '../types.js';
import { getTaskById, setTaskStatus, postponeTask } from '../db/tasks.js';
import { getInstanceById, setInstanceStatus, postponeInstance } from '../db/recurringRules.js';
import { buildPlanForDate } from '../lib/plan.js';
import { renderPlanText, planKeyboard, postponeKeyboard } from '../lib/keyboards.js';
import { formatHumanDate, addDays, todayInTimezone } from '../lib/timezone.js';
import type { ParsedCallback } from '../lib/callbackData.js';
import { setConversationState } from '../db/conversationStates.js';

/**
 * Все операции проверяют user_id вместе с id записи (через getTaskById/getInstanceById,
 * которые фильтруют по user_id) — раздел 45 ТЗ: не доверять ID от клиента без проверки владельца.
 */

async function resolveDate(env: Env, user: User, cb: ParsedCallback): Promise<string | null> {
  if (cb.kind === 'task' && cb.id) {
    const task = await getTaskById(env, user.id, cb.id);
    return task?.due_date ?? null;
  }
  if (cb.kind === 'inst' && cb.id) {
    const inst = await getInstanceById(env, user.id, cb.id);
    return inst?.instance_date ?? null;
  }
  return null;
}

/** Перерисовывает сообщение с планом на месте, вместо отправки нового (раздел 9 ТЗ). */
export async function rerenderPlanMessage(ctx: Context, env: Env, user: User, date: string): Promise<void> {
  const items = await buildPlanForDate(env, user, date);
  const humanDate = formatHumanDate(date, user.timezone);
  const text = renderPlanText(`**План — ${humanDate}**`, items);
  const kb = planKeyboard(items);
  try {
    await ctx.editMessageText(text, { reply_markup: kb, parse_mode: 'Markdown' });
  } catch {
    // Сообщение могло устареть/не редактируется — отправляем заново как fallback.
    await ctx.reply(text, { reply_markup: kb, parse_mode: 'Markdown' });
  }
}

export async function handleDone(ctx: Context, env: Env, user: User, cb: ParsedCallback): Promise<void> {
  if (!cb.id || !cb.kind) return;
  const ok =
    cb.kind === 'task'
      ? await setTaskStatus(env, user.id, cb.id, 'completed')
      : await setInstanceStatus(env, user.id, cb.id, 'completed');

  if (!ok) {
    await ctx.answerCallbackQuery({ text: 'Не удалось обновить задачу' });
    return;
  }
  await ctx.answerCallbackQuery({ text: 'Готово ✅' });

  const date = await resolveDate(env, user, cb);
  if (date) await rerenderPlanMessage(ctx, env, user, date);
}

export async function handleCancel(ctx: Context, env: Env, user: User, cb: ParsedCallback): Promise<void> {
  if (!cb.id || !cb.kind) return;
  const ok =
    cb.kind === 'task'
      ? await setTaskStatus(env, user.id, cb.id, 'cancelled')
      : await setInstanceStatus(env, user.id, cb.id, 'cancelled');

  if (!ok) {
    await ctx.answerCallbackQuery({ text: 'Не удалось отменить задачу' });
    return;
  }
  await ctx.answerCallbackQuery({ text: 'Отменено' });

  const date = await resolveDate(env, user, cb);
  if (date) await rerenderPlanMessage(ctx, env, user, date);
}

export async function handlePostponeStart(ctx: Context, env: Env, user: User, cb: ParsedCallback): Promise<void> {
  if (!cb.id || (cb.kind !== 'task' && cb.kind !== 'inst')) return;
  await ctx.answerCallbackQuery();
  await ctx.reply('На когда перенести?', { reply_markup: postponeKeyboard(cb.kind, cb.id) });
}

export async function handlePostponeTo(
  ctx: Context,
  env: Env,
  user: User,
  payload: string,
): Promise<void> {
  // payload: "tomorrow:task:123" | "custom:task:123"
  const [mode, kind, idStr] = payload.split(':');
  const id = Number(idStr);
  if (!id || (kind !== 'task' && kind !== 'inst')) return;

  if (mode === 'custom') {
    await ctx.answerCallbackQuery();
    await setConversationState(env, user.id, 'awaiting_postpone_date', {
      postpone_task_id: id,
      postpone_kind: kind,
    });
    await ctx.reply('Пришли дату в формате ГГГГ-ММ-ДД (например 2026-09-05).');
    return;
  }

  const today = todayInTimezone(user.timezone);
  const newDate = addDays(today, 1);

  const ok =
    kind === 'task'
      ? await postponeTask(env, user.id, id, newDate)
      : await postponeInstance(env, user.id, id, newDate);

  if (!ok) {
    await ctx.answerCallbackQuery({ text: 'Не удалось перенести задачу' });
    return;
  }
  await ctx.answerCallbackQuery({ text: `Перенесено на ${newDate}` });
  await rerenderPlanMessage(ctx, env, user, today);
}
