import type { ConversationDraft, ConversationState, Env } from '../types.js';

interface StoredState {
  state: ConversationState;
  draft: ConversationDraft;
}

export async function getConversationState(env: Env, userId: number): Promise<StoredState | null> {
  const row = await env.DB.prepare('SELECT state, draft_json FROM conversation_states WHERE user_id = ?')
    .bind(userId)
    .first<{ state: ConversationState; draft_json: string | null }>();
  if (!row) return null;
  return {
    state: row.state,
    draft: row.draft_json ? (JSON.parse(row.draft_json) as ConversationDraft) : {},
  };
}

export async function setConversationState(
  env: Env,
  userId: number,
  state: ConversationState,
  draft: ConversationDraft,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO conversation_states (user_id, state, draft_json, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, draft_json = excluded.draft_json, updated_at = datetime('now')`,
  )
    .bind(userId, state, JSON.stringify(draft))
    .run();
}

export async function clearConversationState(env: Env, userId: number): Promise<void> {
  await env.DB.prepare('DELETE FROM conversation_states WHERE user_id = ?').bind(userId).run();
}
