/**
 * Проект использует parse_mode: 'Markdown' (legacy-версия Telegram, не MarkdownV2).
 * В ней нужно экранировать всего 4 спецсимвола: _ * ` [
 * Это применяется к пользовательскому/системному тексту, который вставляется
 * в сообщение как есть (например description задачи), чтобы он не ломал разметку.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[])/g, '\\$1');
}

/** Telegram режет сообщения на 4096 символов — подстраховываемся перед отправкой. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;

export function truncateForTelegram(text: string, limit = TELEGRAM_MESSAGE_LIMIT): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 20)}\n\n…(обрезано)`;
}
