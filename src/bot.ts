import { Bot, type Context } from 'grammy';
import type { Env, User } from './types.js';
import { getUserByTelegramId } from './db/users.js';
import { getConversationState, clearConversationState } from './db/conversationStates.js';
import { handleStart, handleTimezoneChoice } from './handlers/start.js';
import { showToday, showPlanForDate } from './handlers/today.js';
import { showSettings, handleSetMorningTime, handleSetEveningTime } from './handlers/settings.js';
import {
  startAddTask,
  handleTitleInput,
  handleWhenChoice,
  handleCustomDateInput,
  handleRecurrenceChoice,
  handleRecurrenceDetailInput,
} from './handlers/addTask.js';
import { handleDone, handleCancel, handlePostponeStart, handlePostponeTo } from './handlers/taskActions.js';
import { handleOpenCard } from './handlers/taskCard.js';
import { parse } from './lib/callbackData.js';
import { mainMenuKeyboard } from './lib/keyboards.js';
import { addDays, todayInTimezone } from './lib/timezone.js';

export function createBot(env: Env): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.command('start', async (ctx) => handleStart(ctx, env));

  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Команды:\n' +
        '/today — план на сегодня\n' +
        '/add — добавить задачу\n' +
        '/plan — меню\n' +
        '/settings — настройки\n' +
        '/help — эта справка',
    );
  });

  bot.command('today', async (ctx) => withUser(ctx, env, (user) => showToday(ctx, env, user)));
  bot.command('add', async (ctx) => withUser(ctx, env, (user) => startAddTask(ctx, env, user)));
  bot.command('settings', async (ctx) => withUser(ctx, env, (user) => showSettings(ctx, user)));

  bot.command('plan', async (ctx) =>
    withUser(ctx, env, async (user) => {
      await ctx.reply('Меню:', { reply_markup: mainMenuKeyboard() });
    }),
  );

  bot.command('morning', async (ctx) =>
    withUser(ctx, env, (user) => handleSetMorningTime(ctx, env, user, argOf(ctx))),
  );
  bot.command('evening', async (ctx) =>
    withUser(ctx, env, (user) => handleSetEveningTime(ctx, env, user, argOf(ctx))),
  );

  // ---- callback_query (inline-кнопки) ----
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const user = await getUserByTelegramId(env, ctx.from.id);
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'Сначала выполни /start' });
      return;
    }

    if (data.startsWith('tz:')) {
      await handleTimezoneChoice(ctx, env, data.slice(3));
      return;
    }
    if (data === 'add') {
      await ctx.answerCallbackQuery();
      await startAddTask(ctx, env, user);
      return;
    }
    if (data.startsWith('when:')) {
      await handleWhenChoice(ctx, env, user, data.slice(5) as 'today' | 'tomorrow' | 'custom' | 'recurring');
      return;
    }
    if (data.startsWith('rec:')) {
      await handleRecurrenceChoice(ctx, env, user, data.slice(4) as 'daily' | 'weekdays' | 'weekly');
      return;
    }
    if (data === 'back') {
      await ctx.answerCallbackQuery();
      return;
    }
    if (data === 'settings') {
      await ctx.answerCallbackQuery();
      await showSettings(ctx, user);
      return;
    }

    // Структурированные действия над задачами: "action:kind:id" или "action:payload"
    try {
      const cb = parse(data);
      switch (cb.action) {
        case 'done':
          await handleDone(ctx, env, user, cb);
          return;
        case 'cancel':
          await handleCancel(ctx, env, user, cb);
          return;
        case 'postpone':
          await handlePostponeStart(ctx, env, user, cb);
          return;
        case 'postpone_to':
          await handlePostponeTo(ctx, env, user, cb.payload ?? '');
          return;
        case 'open':
          await handleOpenCard(ctx, env, user, cb);
          return;
        case 'view_day': {
          await ctx.answerCallbackQuery();
          const payload = cb.payload;
          if (payload === 'today') {
            await showToday(ctx, env, user);
          } else if (payload === 'tomorrow') {
            const tomorrow = addDays(todayInTimezone(user.timezone), 1);
            await showPlanForDate(ctx, env, user, tomorrow, 'План на завтра');
          } else {
            await showToday(ctx, env, user);
          }
          return;
        }
        default:
          await ctx.answerCallbackQuery();
      }
    } catch {
      await ctx.answerCallbackQuery({ text: 'Устаревшая кнопка' });
    }
  });

  // ---- текстовые сообщения — маршрутизация по состоянию диалога ----
  bot.on('message:text', async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const user = await getUserByTelegramId(env, from.id);
    if (!user) {
      await handleStart(ctx, env);
      return;
    }

    const text = ctx.message.text.trim();

    // Ручной ввод IANA-таймзоны на этапе первичной настройки
    if (!user.tz_confirmed && text.includes('/')) {
      await handleTimezoneChoice(ctx, env, text);
      return;
    }

    const state = await getConversationState(env, user.id);
    if (!state) return; // вне диалога — игнорируем произвольный текст

    switch (state.state) {
      case 'awaiting_title':
        await handleTitleInput(ctx, env, user, text);
        return;
      case 'awaiting_custom_date':
        await handleCustomDateInput(ctx, env, user, text);
        return;
      case 'awaiting_recurrence':
        await handleRecurrenceDetailInput(ctx, env, user, text);
        return;
      default:
        await clearConversationState(env, user.id);
    }
  });

  bot.catch((err) => {
    console.error('Bot error:', err.error);
  });

  return bot;
}

async function withUser(ctx: Context, env: Env, fn: (user: User) => Promise<void>): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const user = await getUserByTelegramId(env, from.id);
  if (!user) {
    await ctx.reply('Сначала выполни /start');
    return;
  }
  await fn(user);
}

function argOf(ctx: Context): string {
  const text: string = ctx.message?.text ?? '';
  const parts = text.trim().split(/\s+/);
  return parts[1] ?? '';
}
