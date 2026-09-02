/**
 * Telegram ограничивает callback_data 64 байтами, поэтому используем компактный
 * формат "action:kind:id" вместо JSON.
 *
 * Примеры:
 *   "done:task:123"      — отметить обычную задачу выполненной
 *   "done:inst:45"        — отметить экземпляр повторяющейся задачи выполненным
 *   "open:task:123"       — открыть карточку задачи
 *   "postpone:task:123"   — начать перенос
 *   "cancel:task:123"     — отменить
 *   "postpone_to:tomorrow" — выбор "перенести на завтра" внутри карточки
 *   "view_day:2026-09-02"  — посмотреть план на другую дату
 */

export type ItemKind = 'task' | 'inst' | 'rule';
export type Action = 'done' | 'open' | 'postpone' | 'cancel' | 'back' | 'view_day' | 'postpone_to' | 'add' | 'noop';

export interface ParsedCallback {
  action: Action;
  kind?: ItemKind;
  id?: number;
  payload?: string;
}

export function encode(action: Action, kind: ItemKind, id: number): string {
  const data = `${action}:${kind}:${id}`;
  if (data.length > 64) throw new Error(`callback_data too long: ${data}`);
  return data;
}

export function encodeWithPayload(action: Action, payload: string): string {
  const data = `${action}:${payload}`;
  if (data.length > 64) throw new Error(`callback_data too long: ${data}`);
  return data;
}

export function parse(raw: string): ParsedCallback {
  const segments = raw.split(':');
  const action = segments[0] as Action;

  if (action === 'view_day' || action === 'postpone_to') {
    return { action, payload: segments.slice(1).join(':') };
  }
  if (action === 'add' || action === 'back' || action === 'noop') {
    return { action };
  }

  const kind = segments[1] as ItemKind;
  const id = Number(segments[2]);
  if (!['task', 'inst', 'rule'].includes(kind) || Number.isNaN(id)) {
    throw new Error(`Invalid callback_data: ${raw}`);
  }
  return { action, kind, id };
}
