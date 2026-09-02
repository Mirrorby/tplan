# Telegram-планер

Персональный ежедневный планер в виде Telegram-бота. Бот сам присылает план дня и
позволяет управлять задачами прямо из чата — без отдельного приложения.

Стек: TypeScript, Cloudflare Workers, Cloudflare D1, grammY, Telegram Bot API (webhooks),
Cloudflare Cron Triggers, GitHub Actions.

## Возможности MVP (этап 1)

- регистрация через `/start`, выбор часового пояса;
- разовые и повторяющиеся задачи (каждый день / дни недели / раз в неделю);
- автоматический утренний план и вечерний отчёт;
- управление задачами через inline-кнопки (выполнить / перенести / отменить);
- просмотр плана на другой день;
- полностью serverless: без постоянно работающего сервера.

## 1. Первоначальная настройка

### 1.1. Создать бота в Telegram

1. Напиши [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Сохрани выданный токен — это `TELEGRAM_BOT_TOKEN`.
3. Придумай любую случайную строку — это будет `TELEGRAM_WEBHOOK_SECRET`
   (используется, чтобы Telegram доказывал Worker'у, что запрос действительно от него).

### 1.2. Установить зависимости

```bash
npm install
```

### 1.3. Создать Cloudflare D1

```bash
npx wrangler d1 create telegram-planner-db
```

Команда выведет `database_id` — вставь его в `wrangler.toml` вместо
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

### 1.4. Применить миграции

```bash
# локально (для wrangler dev)
npm run db:migrate:local

# на проде
npm run db:migrate:remote
```

### 1.5. Секреты

Локально — скопируй `.dev.vars.example` в `.dev.vars` и заполни значениями.

На проде — секреты задаются через Cloudflare, не хранятся в репозитории:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

## 2. Локальная разработка

```bash
npm run dev
```

Для проверки вебхука локально понадобится туннель (например `cloudflared tunnel` или `ngrok`),
так как Telegram должен достучаться до твоей машины по HTTPS.

## 3. Деплой

### Вручную

```bash
npm run deploy
```

### Через GitHub Actions (автоматически при пуше в main)

1. В настройках репозитория (Settings → Secrets and variables → Actions) добавь:
   - `CLOUDFLARE_API_TOKEN` — токен с правами Edit Workers (создаётся в Cloudflare Dashboard → My Profile → API Tokens);
   - `CLOUDFLARE_ACCOUNT_ID` — из Cloudflare Dashboard (справа на главной странице).
2. Запушь в `main` — воркфлоу `.github/workflows/deploy.yml` соберёт и задеплоит Worker.

## 4. Установка webhook

После деплоя Worker получит адрес вида `https://telegram-planner.<your-subdomain>.workers.dev`.
Установи webhook на этот адрес:

```bash
TELEGRAM_BOT_TOKEN=xxx \
TELEGRAM_WEBHOOK_SECRET=yyy \
WORKER_URL=https://telegram-planner.<your-subdomain>.workers.dev \
node scripts/set-webhook.mjs
```

Проверить текущий статус webhook можно так:

```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

## 5. Настройка Cron

Cron уже описан в `wrangler.toml` (`*/5 * * * *`) и активируется автоматически при деплое —
дополнительных действий в Cloudflare Dashboard не требуется.

## 6. Структура проекта

```
src/
├── index.ts        # entry point: fetch (webhook) + scheduled (cron)
├── bot.ts           # маршрутизация апдейтов grammY
├── handlers/         # сценарии: /start, план дня, добавление задачи, карточка, настройки
├── cron/             # утренний план и вечерний отчёт
├── db/               # SQL-запросы по сущностям (users, tasks, recurring_rules, ...)
├── lib/               # хелперы: часовые пояса, callback_data, клавиатуры, сборка плана
└── types.ts           # общие типы
migrations/            # DDL для D1
```

## 7. Дальнейшее развитие

См. разделы 39–40 технического задания: этап 2 (статистика, рутины, гибкие правила
повторений, напоминания) и этап 3 (Telegram Mini App поверх той же базы).
