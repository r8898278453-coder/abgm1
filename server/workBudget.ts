import { performance } from 'node:perf_hooks';
export type WorkGate = () => boolean;
export function createWorkBudget(limitMs = 20_000, now: () => number = () => performance.now()) {
  if (!Number.isFinite(limitMs) || limitMs < 1 || limitMs > 60_000) throw new Error('INVALID_WORK_BUDGET');
  const started = now();
  const elapsed = () => Math.max(0, now() - started);
  return { canStart: () => elapsed() < limitMs,
    report: () => { const used = elapsed(); return { limitMs, elapsedMs: Math.round(used), exhausted: used >= limitMs, mode: 'cooperative' as const }; } };
}
export async function runBudgetedStages<T extends Record<string, (canStart: WorkGate) => Promise<any>>>(stages: T, budget = createWorkBudget()) {
  const results: Record<string, unknown> = {};
  const deferredStages: string[] = [];
  for (const [name, run] of Object.entries(stages)) {
    if (!budget.canStart()) { results[name] = { deferred: true, reason: 'TICK_BUDGET_EXHAUSTED' }; deferredStages.push(name); }
    else results[name] = await run(budget.canStart);
  }
  return { results: results as { [K in keyof T]: Awaited<ReturnType<T[K]>> | { deferred: true; reason: string } },
    budget: { ...budget.report(), deferredStages } };
}
