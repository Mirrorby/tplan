/**
 * Все хелперы работают через нативный Intl — в Cloudflare Workers он доступен
 * без дополнительных полифиллов и покрывает список IANA-таймзон.
 */

/** Текущая дата (YYYY-MM-DD) в часовом поясе пользователя. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return formatDateInTimezone(now, timezone);
}

export function formatDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

/** Текущее время HH:MM в часовом поясе пользователя. */
export function currentTimeInTimezone(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.hour}:${map.minute}`;
}

/** День недели (0=вс..6=сб) для даты YYYY-MM-DD в заданном часовом поясе. */
export function weekdayOf(dateStr: string, timezone: string): number {
  // Строим дату в полдень локального времени, чтобы избежать смещения через полночь
  // при конвертации в UTC-объект Date.
  const d = new Date(`${dateStr}T12:00:00`);
  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[weekdayName] ?? d.getUTCDay();
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTH_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** "воскресенье, 31 августа" — для человеко-читаемых сообщений. */
export function formatHumanDate(dateStr: string, timezone: string): string {
  const wd = weekdayOf(dateStr, timezone);
  const [, monthStr, dayStr] = dateStr.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);
  return `${WEEKDAY_RU[wd]}, ${day} ${MONTH_RU[month - 1]}`;
}

/** Проверяет, что "сейчас" в таймзоне пользователя совпадает (с точностью до окна) с заданным HH:MM. */
export function isTimeMatch(nowHHMM: string, targetHHMM: string, windowMinutes = 5): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':');
    return Number(h) * 60 + Number(m);
  };
  const diff = Math.abs(toMinutes(nowHHMM) - toMinutes(targetHHMM));
  return diff < windowMinutes;
}
