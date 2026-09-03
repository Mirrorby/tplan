import type { Context } from 'grammy';
import type { Env, ProgramKey, StartMode, User } from '../types.js';
import {
  isValidProgramKey,
  PROGRAM_TITLES,
  PROGRAMS_LIST_TEXT,
  getProgramCardText,
} from '../programs/catalog.js';
import { installProgram } from '../programs/installProgram.js';
import { getActiveEnrollment, cancelEnrollment } from '../db/programEnrollments.js';
import { deactivateRulesForEnrollment } from '../db/recurringRules.js';
import { cancelPendingTasksForEnrollment } from '../db/tasks.js';
import {
  programsListKeyboard,
  programCatalogCardKeyboard,
  programInstalledCardKeyboard,
  programInstallSuccessKeyboard,
  programDisableConfirmKeyboard,
} from '../lib/keyboards.js';
import { formatHumanDate } from '../lib/timezone.js';
import { truncateForTelegram } from '../lib/telegramText.js';

export async function showProgramsList(ctx: Context, env: Env, user: User): Promise<void> {
  await ctx.reply(PROGRAMS_LIST_TEXT, { reply_markup: programsListKeyboard() });
}

export async function showProgramCard(ctx: Context, env: Env, user: User, rawKey: string): Promise<void> {
  if (!isValidProgramKey(rawKey)) {
    await ctx.answerCallbackQuery({ text: 'Неизвестная программа' });
    return;
  }
  const key: ProgramKey = rawKey;
  const enrollment = await getActiveEnrollment(env, user.id, key);
  const text = getProgramCardText(key);

  if (enrollment) {
    const humanDate = formatHumanDate(enrollment.start_date, user.timezone);
    await ctx.reply(`${text}\n\n✅ Уже установлена (с ${humanDate}).`, {
      reply_markup: programInstalledCardKeyboard(key),
    });
    return;
  }

  await ctx.reply(text, { reply_markup: programCatalogCardKeyboard(key) });
}

export async function handleInstall(
  ctx: Context,
  env: Env,
  user: User,
  rawKey: string,
  rawMode: string,
): Promise<void> {
  if (!isValidProgramKey(rawKey)) {
    await ctx.answerCallbackQuery({ text: 'Неизвестная программа' });
    return;
  }
  const startMode: StartMode = rawMode === 'monday' ? 'next_monday' : 'today';

  await ctx.answerCallbackQuery();

  let result;
  try {
    result = await installProgram(env, user, rawKey, startMode);
  } catch (err) {
    console.error('installProgram failed:', err);
    await ctx.reply('Не получилось установить программу — попробуй ещё раз чуть позже.');
    return;
  }

  if (result.status === 'invalid_program_key') {
    await ctx.reply('Неизвестная программа.');
    return;
  }
  if (result.status === 'already_cancelled') {
    await ctx.reply('Программа уже использовалась и была отключена. Повторный запуск будет добавлен в следующей версии.');
    return;
  }
  if (result.status === 'already_installed') {
    await ctx.reply('Эта программа уже добавлена в твой план.');
    return;
  }

  // status === 'installed'
  const key: ProgramKey = rawKey;
  const title = PROGRAM_TITLES[key];
  const humanDate = formatHumanDate(result.enrollment.start_date, user.timezone);

  const successText =
    key === 'home_workouts_v1'
      ? `Программа «${title}» добавлена ✅\n\nДата начала: ${humanDate}.\nПервое подходящее занятие появится в плане автоматически.`
      : `Программа «${title}» добавлена ✅\n\nДата начала: ${humanDate}.\nПервые 21 день будут постепенно увеличивать длительность практики. Затем включится бесконечный недельный цикл.`;

  await ctx.reply(truncateForTelegram(successText), { reply_markup: programInstallSuccessKeyboard() });
}

export async function showDisableConfirm(ctx: Context, env: Env, user: User, rawKey: string): Promise<void> {
  if (!isValidProgramKey(rawKey)) {
    await ctx.answerCallbackQuery({ text: 'Неизвестная программа' });
    return;
  }
  await ctx.answerCallbackQuery();
  await ctx.reply('Отключить программу?\n\nБудущие занятия исчезнут из плана, но история выполнений сохранится.', {
    reply_markup: programDisableConfirmKeyboard(rawKey),
  });
}

export async function handleDisableNo(ctx: Context, env: Env, user: User, rawKey: string): Promise<void> {
  await ctx.answerCallbackQuery();
  await showProgramCard(ctx, env, user, rawKey);
}

export async function handleDisableYes(ctx: Context, env: Env, user: User, rawKey: string): Promise<void> {
  if (!isValidProgramKey(rawKey)) {
    await ctx.answerCallbackQuery({ text: 'Неизвестная программа' });
    return;
  }
  const key: ProgramKey = rawKey;

  // Всегда перепроверяем владельца и активность по user_id+key — id enrollment'а не приходит
  // из callback вообще, поэтому подделать его нельзя (раздел 16 ТЗ).
  const enrollment = await getActiveEnrollment(env, user.id, key);
  if (!enrollment) {
    await ctx.answerCallbackQuery({ text: 'Программа уже не активна' });
    return;
  }

  await cancelEnrollment(env, user.id, enrollment.id);
  await deactivateRulesForEnrollment(env, enrollment.id);
  await cancelPendingTasksForEnrollment(env, enrollment.id);

  await ctx.answerCallbackQuery({ text: 'Отключено' });
  await ctx.reply(`Программа «${PROGRAM_TITLES[key]}» отключена. История выполнений сохранена.`);
}
