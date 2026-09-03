import type { Env, ProgramEnrollment, ProgramKey, StartMode, User } from '../types.js';
import { addDays, nextMondayOrToday, todayInTimezone, weekdayOf } from '../lib/timezone.js';
import { getActiveEnrollment, getAnyEnrollment, createEnrollment } from '../db/programEnrollments.js';
import { createRuleStatement } from '../db/recurringRules.js';
import { createTaskStatement } from '../db/tasks.js';
import { HOME_WORKOUTS } from './homeWorkouts.js';
import { MEDITATION_INTRO_DAYS, MEDITATION_CYCLE_ITEMS } from './meditationBeginner.js';
import { isValidProgramKey, PROGRAM_TITLES } from './catalog.js';

export type InstallResult =
  | { status: 'installed'; enrollment: ProgramEnrollment }
  | { status: 'already_installed'; enrollment: ProgramEnrollment }
  | { status: 'already_cancelled' }
  | { status: 'invalid_program_key' };

/** Раздел 5 ТЗ: дата начала считается по локальной календарной дате пользователя. */
export function resolveStartDate(user: User, startMode: StartMode): string {
  const today = todayInTimezone(user.timezone);
  return startMode === 'today' ? today : nextMondayOrToday(today, user.timezone);
}

export async function installProgram(
  env: Env,
  user: User,
  programKey: string,
  startMode: StartMode,
): Promise<InstallResult> {
  // 1. Никогда не доверяем ключу из callback напрямую — только сверенный по каталогу.
  if (!isValidProgramKey(programKey)) {
    return { status: 'invalid_program_key' };
  }

  // 2. Уже установлена и активна — ничего не создаём повторно.
  const active = await getActiveEnrollment(env, user.id, programKey);
  if (active) {
    return { status: 'already_installed', enrollment: active };
  }

  // 3. Программа уже была отключена раньше — в этой версии повторный запуск запрещён (раздел 19 ТЗ).
  const any = await getAnyEnrollment(env, user.id, programKey);
  if (any && any.status === 'cancelled') {
    return { status: 'already_cancelled' };
  }

  const startDate = resolveStartDate(user, startMode);
  const enrollment = await createEnrollment(env, user.id, programKey, startDate);

  if (programKey === 'home_workouts_v1') {
    await installHomeWorkouts(env, user, enrollment, startDate);
  } else {
    await installMeditationBeginner(env, user, enrollment, startDate);
  }

  return { status: 'installed', enrollment };
}

async function installHomeWorkouts(
  env: Env,
  user: User,
  enrollment: ProgramEnrollment,
  startDate: string,
): Promise<void> {
  const statements = HOME_WORKOUTS.map((w) =>
    createRuleStatement(env, user.id, w.title, 'weekdays', {
      description: w.description,
      weekdays: [w.weekday],
      startsOn: startDate,
      programEnrollmentId: enrollment.id,
      programItemKey: w.itemKey,
    }),
  );
  await env.DB.batch(statements);
}

async function installMeditationBeginner(
  env: Env,
  user: User,
  enrollment: ProgramEnrollment,
  startDate: string,
): Promise<void> {
  // 21 вводная задача — обычные tasks на конкретные даты.
  const taskStatements = MEDITATION_INTRO_DAYS.map((day) =>
    createTaskStatement(env, user.id, day.title, addDays(startDate, day.dayOffset), {
      description: day.description,
      source: 'system',
      programEnrollmentId: enrollment.id,
      programItemKey: day.itemKey,
    }),
  );

  // Бесконечный цикл с 22-го дня: cycle_start_date = start_date + 21 день.
  const cycleStartDate = addDays(startDate, 21);
  const ruleStatements = MEDITATION_CYCLE_ITEMS.map((item) => {
    const firstDate = addDays(cycleStartDate, item.dayOffset);
    return createRuleStatement(env, user.id, item.title, 'weekly', {
      description: item.description,
      weeklyDay: weekdayOf(firstDate, user.timezone),
      startsOn: firstDate,
      programEnrollmentId: enrollment.id,
      programItemKey: item.itemKey,
    });
  });

  // Одна батч-транзакция на все 28 вставок — минимизирует риск частично установленной программы
  // (раздел 14.7 ТЗ). Уникальные индексы + OR IGNORE защищают от дублей при повторном сбое.
  await env.DB.batch([...taskStatements, ...ruleStatements]);
}

export function programTitle(key: ProgramKey): string {
  return PROGRAM_TITLES[key];
}
