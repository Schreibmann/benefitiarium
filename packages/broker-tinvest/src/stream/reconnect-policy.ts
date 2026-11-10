export type ReconnectPolicy = {
  initialDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
};

export const DEFAULT_RECONNECT_POLICY: ReconnectPolicy = {
  initialDelayMs: 1_000,
  maxDelayMs: 60_000,
  jitterRatio: 0.2,
};

export function nextReconnectDelayMs(
  attempt: number,
  policy: ReconnectPolicy = DEFAULT_RECONNECT_POLICY,
  random: () => number = Math.random,
): number {
  const exp = Math.max(0, attempt);
  const base = Math.min(policy.maxDelayMs, policy.initialDelayMs * 2 ** exp);
  const jitter = base * policy.jitterRatio * (random() * 2 - 1);
  return Math.max(0, Math.round(base + jitter));
}
