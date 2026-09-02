import { InlineKeyboard } from 'grammy';
import type { PlanItem, RecurringRule } from '../types.js';
import { encode, encodeWithPayload } from './callbackData.js';

const RULE_TYPE_LABEL: Record<string, string> = {
  daily: 'каждый день',
  weekdays: 'по дням недели',
  weekly: 'раз в неделю',
};

const STATUS_EMOJI: Record<string, string> = {
  pending: '⬜',
  completed: '✅',
  skipped: '⏭',
  cancelled: '❌',
};

/** Текст плана дня: заголовок + список пунктов. */
export function renderPlanText(title: string, items: PlanItem[]): string {
  if (items.length === 0) {
    return `${title}\n\nНа этот день задач нет.`;
  }
  const lines = items.map((i) => `${STATUS_EMOJI[i.status]} ${i.title}`);
  return `${title}\n\n${lines.join('\n')}\n\nЗадач: ${items.length}`;
}

/** Клавиатура под планом дня: по кнопке на каждую невыполненную задачу + управляющие кнопки. */
export function planKeyboard(items: PlanItem[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const item of items) {
    if (item.status !== 'pending') continue;
    const kind = item.kind === 'task' ? 'task' : 'inst';
    kb.text(`✅ ${item.title}`, encode('done', kind, item.id)).row();
  }
  kb.text('➕ Добавить', 'add').text('📅 План', encodeWithPayload('view_day', 'menu'));
  return kb;
}

export function taskCardKeyboard(kind: 'task' | 'inst', id: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Выполнить', encode('done', kind, id))
    .text('↪️ Перенести', encode('postpone', kind, id))
    .row()
    .text('❌ Отменить', encode('cancel', kind, id))
    .text('⬅️ Назад', 'back');
}

export function postponeKeyboard(kind: 'task' | 'inst', id: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('Завтра', encodeWithPayload('postpone_to', `tomorrow:${kind}:${id}`))
    .text('Выбрать дату', encodeWithPayload('postpone_to', `custom:${kind}:${id}`));
}

export function dateChoiceKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Сегодня', 'when:today')
    .text('Завтра', 'when:tomorrow')
    .row()
    .text('Выбрать дату', 'when:custom')
    .text('Повторять', 'when:recurring');
}

export function recurrenceChoiceKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Каждый день', 'rec:daily')
    .row()
    .text('Дни недели', 'rec:weekdays')
    .row()
    .text('Раз в неделю', 'rec:weekly');
}

export function renderRulesText(rules: RecurringRule[]): string {
  if (rules.length === 0) {
    return '🔁 Повторяющихся задач пока нет.\n\nСоздать можно через /add → "Повторять".';
  }
  const lines = rules.map((r) => `• ${r.title} — ${RULE_TYPE_LABEL[r.rule_type] ?? r.rule_type}`);
  return `🔁 Повторяющиеся задачи:\n\n${lines.join('\n')}\n\nЧтобы удалить — нажми на задачу ниже.`;
}

export function rulesListKeyboard(rules: RecurringRule[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of rules) {
    kb.text(`🗑 ${r.title}`, encode('cancel', 'rule', r.id)).row();
  }
  return kb;
}

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 Сегодня', encodeWithPayload('view_day', 'today'))
    .text('➕ Добавить', 'add')
    .row()
    .text('📅 План', encodeWithPayload('view_day', 'week'))
    .text('🔁 Повторяющиеся', 'rules')
    .row()
    .text('⚙️ Настройки', 'settings');
}
