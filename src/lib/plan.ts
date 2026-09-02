import type { Env, PlanItem, User } from '../types.js';
import { getTasksForDate } from '../db/tasks.js';
import { ensureInstancesForDate, getRuleTitle } from '../db/recurringRules.js';

/**
 * Собирает Daily Plan на дату: разовые задачи + экземпляры повторяющихся правил.
 * Экземпляры на дату создаются лениво (idempotent), если их ещё нет —
 * так план корректно формируется и при обращении из бота, и из cron.
 */
export async function buildPlanForDate(env: Env, user: User, date: string): Promise<PlanItem[]> {
  const [tasks, instances] = await Promise.all([
    getTasksForDate(env, user.id, date),
    ensureInstancesForDate(env, user.id, date, user.timezone),
  ]);

  const taskItems: PlanItem[] = tasks.map((t) => ({
    kind: 'task',
    id: t.id,
    title: t.title,
    status: t.status,
    due_time: t.due_time,
  }));

  const instanceItems: PlanItem[] = [];
  for (const inst of instances) {
    const title = await getRuleTitle(env, inst.rule_id);
    instanceItems.push({
      kind: 'instance',
      id: inst.id,
      title,
      status: inst.status,
      due_time: null,
    });
  }

  return [...instanceItems, ...taskItems].sort((a, b) => {
    if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
    if (a.due_time) return -1;
    if (b.due_time) return 1;
    return 0;
  });
}
