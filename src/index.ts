import { webhookCallback } from 'grammy';
import type { Env } from './types.js';
import { createBot } from './bot.js';
import { runMorningPlanTick } from './cron/morningPlan.js';
import { runEveningReportTick } from './cron/eveningReport.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Проверяем секрет вебхука Telegram (X-Telegram-Bot-Api-Secret-Token) —
    // раздел 45 ТЗ: "проверять Telegram webhook".
    const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const bot = createBot(env);
    const handleUpdate = webhookCallback(bot, 'cloudflare-mod');

    try {
      return await handleUpdate(request);
    } catch (err) {
      console.error('Webhook handling error:', err);
      // Telegram ретраит не-2xx ответы — отвечаем 200, чтобы не получить шторм ретраев
      // на неожиданной ошибке, но логируем для расследования.
      return new Response('OK', { status: 200 });
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          await runMorningPlanTick(env);
        } catch (err) {
          console.error('Morning plan tick failed:', err);
        }
        try {
          await runEveningReportTick(env);
        } catch (err) {
          console.error('Evening report tick failed:', err);
        }
      })(),
    );
  },
};
