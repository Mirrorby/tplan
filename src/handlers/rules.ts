import type { Context } from 'grammy';
import type { Env, User } from '../types.js';
import { getActiveRulesForUser, deactivateRule } from '../db/recurringRules.js';
import { renderRulesText, rulesListKeyboard } from '../lib/keyboards.js';
import type { ParsedCallback } from '../lib/callbackData.js';

export async function showRulesList(ctx: Context, env: Env, user: User): Promise<void> {
  const rules = await getActiveRulesForUser(env, user.id);
  await ctx.reply(renderRulesText(rules), { reply_markup: rulesListKeyboard(rules) });
}

export async function handleDeleteRule(ctx: Context, env: Env, user: User, cb: ParsedCallback): Promise<void> {
  if (!cb.id || cb.kind !== 'rule') return;

  const ok = await deactivateRule(env, user.id, cb.id);
  if (!ok) {
    await ctx.answerCallbackQuery({ text: 'Не удалось удалить' });
    return;
  }
  await ctx.answerCallbackQuery({ text: 'Удалено' });

  // Перерисовываем список на месте — так видно, что задача исчезла, без лишнего сообщения.
  const rules = await getActiveRulesForUser(env, user.id);
  try {
    await ctx.editMessageText(renderRulesText(rules), { reply_markup: rulesListKeyboard(rules) });
  } catch {
    await ctx.reply(renderRulesText(rules), { reply_markup: rulesListKeyboard(rules) });
  }
}
