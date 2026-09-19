export const planningIntervalMs = 5 * 60 * 1000;

export function currentPlanningEpoch(now: Date | number = Date.now()) {
  const timestamp = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(timestamp)) throw new Error("A valid time is required.");
  return new Date(Math.floor(timestamp / planningIntervalMs) * planningIntervalMs).toISOString();
}
