import {
  createDefaultOnboardingState,
  isOnboardingStepId,
  isOnboardingStepStatus,
  type OnboardingStepId,
  type OnboardingStepStatus,
} from './onboarding-steps.js';

export const ONBOARDING_STORAGE_KEY = 'benefitiarium.onboarding.v1';

export type OnboardingState = Record<OnboardingStepId, OnboardingStepStatus>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseOnboardingState(raw: string | null): OnboardingState {
  const defaults = createDefaultOnboardingState();
  if (raw === null || raw.length === 0) {
    return defaults;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }

  if (!isPlainObject(parsed)) {
    return defaults;
  }

  const next = { ...defaults };
  for (const [key, value] of Object.entries(parsed)) {
    if (!isOnboardingStepId(key)) {
      continue;
    }
    if (typeof value !== 'string' || !isOnboardingStepStatus(value)) {
      continue;
    }
    next[key] = value;
  }
  return next;
}

export function readOnboardingState(storage: Storage): OnboardingState {
  return parseOnboardingState(storage.getItem(ONBOARDING_STORAGE_KEY));
}

export function writeOnboardingState(storage: Storage, state: OnboardingState): void {
  storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}

export function setOnboardingStepStatus(
  state: OnboardingState,
  id: OnboardingStepId,
  status: OnboardingStepStatus,
): OnboardingState {
  return {
    ...state,
    [id]: status,
  };
}
