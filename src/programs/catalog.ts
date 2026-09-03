import type { ProgramKey } from '../types.js';
import { HOME_WORKOUTS_CARD_TEXT } from './homeWorkouts.js';
import { MEDITATION_CARD_TEXT } from './meditationBeginner.js';

/**
 * Единственный источник правды о том, какие программы вообще существуют.
 * Ключ из callback_data всегда проверяется через isValidProgramKey() —
 * никогда не используется напрямую как имя таблицы/файла/функции (раздел 14 ТЗ).
 */
export const PROGRAM_KEYS: readonly ProgramKey[] = ['home_workouts_v1', 'meditation_beginner_v1'] as const;

export function isValidProgramKey(key: string): key is ProgramKey {
  return (PROGRAM_KEYS as readonly string[]).includes(key);
}

export const PROGRAM_TITLES: Record<ProgramKey, string> = {
  home_workouts_v1: 'Домашние тренировки',
  meditation_beginner_v1: 'Медитация для новичка',
};

export const PROGRAM_EMOJI: Record<ProgramKey, string> = {
  home_workouts_v1: '🏋️',
  meditation_beginner_v1: '🧘',
};

export function getProgramCardText(key: ProgramKey): string {
  return key === 'home_workouts_v1' ? HOME_WORKOUTS_CARD_TEXT : MEDITATION_CARD_TEXT;
}

export const PROGRAMS_LIST_TEXT = 'Готовые программы\n\nВыбери программу, которую хочешь добавить в свой план.';
