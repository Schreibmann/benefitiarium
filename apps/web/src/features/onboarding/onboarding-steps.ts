export type OnboardingStepId =
  | 'connect-market-data'
  | 'watchlist'
  | 'instrument-history'
  | 'first-strategy'
  | 'sandbox-account'
  | 'sandbox-run';

export type OnboardingStepStatus = 'not_started' | 'in_progress' | 'done' | 'blocked';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'connect-market-data',
    title: 'Подключить источник рыночных данных',
    description: 'Без источника обзор и графики остаются пустыми — без фиктивных котировок.',
    href: '/app/settings',
    ctaLabel: 'К настройкам',
  },
  {
    id: 'watchlist',
    title: 'Выбрать список наблюдения',
    description: 'Соберите watchlist тикеров после появления каталога инструментов.',
    href: '/app/market',
    ctaLabel: 'Открыть рынок',
  },
  {
    id: 'instrument-history',
    title: 'Открыть инструмент и загрузить историю',
    description: 'Страница инструмента появится вместе с market/chart контрактами.',
    href: '/app/analytics',
    ctaLabel: 'К аналитике',
  },
  {
    id: 'first-strategy',
    title: 'Создать первую стратегию',
    description: 'Настройте условия или выберите пример, когда модуль стратегий будет готов.',
    href: '/app/strategies',
    ctaLabel: 'К стратегиям',
  },
  {
    id: 'sandbox-account',
    title: 'Создать Sandbox-счёт',
    description: 'Тестовый счёт отделён от Live и доступен через Sandbox Admin.',
    href: '/admin/sandbox',
    ctaLabel: 'Sandbox Admin',
  },
  {
    id: 'sandbox-run',
    title: 'Запустить тест в Sandbox/Paper',
    description: 'Автоисполнение включается только после лимитов риска — не по умолчанию.',
    href: '/app/trading',
    ctaLabel: 'К торговле',
  },
];

export function isOnboardingStepId(value: string): value is OnboardingStepId {
  return ONBOARDING_STEPS.some((step) => step.id === value);
}

export function isOnboardingStepStatus(value: string): value is OnboardingStepStatus {
  return (
    value === 'not_started' || value === 'in_progress' || value === 'done' || value === 'blocked'
  );
}

export function onboardingStatusLabel(status: OnboardingStepStatus): string {
  switch (status) {
    case 'not_started':
      return 'NOT STARTED';
    case 'in_progress':
      return 'IN PROGRESS';
    case 'done':
      return 'DONE';
    case 'blocked':
      return 'BLOCKED';
  }
}

export function onboardingStatusTone(
  status: OnboardingStepStatus,
): 'neutral' | 'info' | 'positive' | 'warning' {
  switch (status) {
    case 'not_started':
      return 'neutral';
    case 'in_progress':
      return 'info';
    case 'done':
      return 'positive';
    case 'blocked':
      return 'warning';
  }
}

export function createDefaultOnboardingState(): Record<OnboardingStepId, OnboardingStepStatus> {
  return {
    'connect-market-data': 'not_started',
    watchlist: 'not_started',
    'instrument-history': 'not_started',
    'first-strategy': 'not_started',
    'sandbox-account': 'not_started',
    'sandbox-run': 'blocked',
  };
}

export function nextOnboardingStatus(current: OnboardingStepStatus): OnboardingStepStatus {
  switch (current) {
    case 'not_started':
      return 'in_progress';
    case 'in_progress':
      return 'done';
    case 'done':
      return 'not_started';
    case 'blocked':
      return 'not_started';
  }
}
