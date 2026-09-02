import type { Context } from 'grammy';
import type { Env, User } from '../types.js';
import {
  getConversationState,
  setConversationState,
  clearConversationState,
} from '../db/conversationStates.js';
import { createTask } from '../db/tasks.js';
import { createRule } from '../db/recurringRules.js';
import { dateChoiceKeyboard, recurrenceChoiceKeyboard } from '../lib/keyboards.js';
import { addDays, todayInTimezone } from '../lib/timezone.js';
import { showPlanForDate } from './today.js';

const WEEKDAY_ALIASES: Record<string, number> = {
  вс: 0, пн: 1, вт: 2, ср: 3, чт: 4, пт: 5, сб: 6,
};

export async function startAddTask(ctx: Context, env: Env, user: User): Promise<void> {
  await setConversationState(env, user.id, 'awaiting_title', {});
  await ctx.reply('Что нужно сделать?');
}

export async function handleTitleInput(ctx: Context, env: Env, user: User, text: string): Promise<void> {
  const title = text.trim();
  if (!title) {
    await ctx.reply('Название не может быть пустым. Что нужно сделать?');
    return;
  }
  await setConversationState(env, user.id, 'awaiting_date', { title });
  await ctx.reply('Когда?', { reply_markup: dateChoiceKeyboard() });
}

export async function handleWhenChoice(
  ctx: Context,
  env: Env,
  user: User,
  choice: 'today' | 'tomorrow' | 'custom' | 'recurring',
): Promise<void> {
  const stored = await getConversationState(env, user.id);
  const title = stored?.draft.title;
  if (!title) {
    await ctx.answerCallbackQuery({ text: 'Сессия истекла, начните заново через /add' });
    return;
  }

  if (choice === 'custom') {
    await ctx.answerCallbackQuery();
    await setConversationState(env, user.id, 'awaiting_custom_date', { title });
    await ctx.reply('Введи дату в формате ГГГГ-ММ-ДД (например 2026-09-05).');
    return;
  }

  if (choice === 'recurring') {
    await ctx.answerCallbackQuery();
    await setConversationState(env, user.id, 'awaiting_recurrence', { title });
    await ctx.reply('Как повторять?', { reply_markup: recurrenceChoiceKeyboard() });
    return;
  }

  const today = todayInTimezone(user.timezone);
  const dueDate = choice === 'today' ? today : addDays(today, 1);

  await createTask(env, user.id, title, dueDate);
  await clearConversationState(env, user.id);
  await ctx.answerCallbackQuery({ text: 'Задача добавлена' });
  await ctx.reply('Задача добавлена ✅');
  await showPlanForDate(ctx, env, user, dueDate);
}

export async function handleCustomDateInput(ctx: Context, env: Env, user: User, text: string): Promise<void> {
  const dateStr = text.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    await ctx.reply('Не похоже на дату. Формат: ГГГГ-ММ-ДД, например 2026-09-05.');
    return;
  }
  const stored = await getConversationState(env, user.id);
  const title = stored?.draft.title;
  if (!title) {
    await ctx.reply('Сессия истекла, начните заново через /add');
    await clearConversationState(env, user.id);
    return;
  }

  await createTask(env, user.id, title, dateStr);
  await clearConversationState(env, user.id);
  await ctx.reply('Задача добавлена ✅');
  await showPlanForDate(ctx, env, user, dateStr);
}

export async function handleRecurrenceChoice(
  ctx: Context,
  env: Env,
  user: User,
  choice: 'daily' | 'weekdays' | 'weekly',
): Promise<void> {
  const stored = await getConversationState(env, user.id);
  const title = stored?.draft.title;
  if (!title) {
    await ctx.answerCallbackQuery({ text: 'Сессия истекла, начните заново через /add' });
    return;
  }

  if (choice === 'daily') {
    await createRule(env, user.id, title, 'daily');
    await clearConversationState(env, user.id);
    await ctx.answerCallbackQuery({ text: 'Задача добавлена' });
    await ctx.reply(`Готово — «${title}» будет повторяться каждый день ✅`);
    return;
  }

  await ctx.answerCallbackQuery();
  await setConversationState(env, user.id, 'awaiting_recurrence', { title, rule_type: choice });
  if (choice === 'weekdays') {
    await ctx.reply('В какие дни недели? Напиши через запятую, например: пн,ср,пт');
  } else {
    await ctx.reply('В какой день недели? Напиши один из: пн, вт, ср, чт, пт, сб, вс');
  }
}

export async function handleRecurrenceDetailInput(ctx: Context, env: Env, user: User, text: string): Promise<void> {
  const stored = await getConversationState(env, user.id);
  const title = stored?.draft.title;
  const ruleType = stored?.draft.rule_type;
  if (!title || !ruleType) {
    await ctx.reply('Сессия истекла, начните заново через /add');
    await clearConversationState(env, user.id);
    return;
  }

  const tokens = text.toLowerCase().split(',').map((t) => t.trim());
  const days = tokens.map((t) => WEEKDAY_ALIASES[t]).filter((d): d is number => d !== undefined);

  if (days.length === 0) {
    await ctx.reply('Не распознал дни недели. Используй сокращения: пн, вт, ср, чт, пт, сб, вс.');
    return;
  }

  if (ruleType === 'weekdays') {
    await createRule(env, user.id, title, 'weekdays', { weekdays: days });
  } else {
    await createRule(env, user.id, title, 'weekly', { weeklyDay: days[0] });
  }

  await clearConversationState(env, user.id);
  await ctx.reply(`Готово — «${title}» добавлена как повторяющаяся задача ✅`);
}
