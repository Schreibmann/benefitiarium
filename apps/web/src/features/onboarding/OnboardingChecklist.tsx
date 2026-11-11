import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../shared/ui/Badge.js';
import { Button } from '../../shared/ui/Button.js';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import {
  nextOnboardingStatus,
  ONBOARDING_STEPS,
  type OnboardingStepId,
  onboardingStatusLabel,
  onboardingStatusTone,
} from './onboarding-steps.js';
import {
  type OnboardingState,
  readOnboardingState,
  setOnboardingStepStatus,
  writeOnboardingState,
} from './onboarding-store.js';
import './onboarding-checklist.css';

type Props = {
  storage?: Storage;
};

export function OnboardingChecklist(props: Props) {
  const storage = props.storage ?? window.localStorage;
  const [state, setState] = useState<OnboardingState>(() => readOnboardingState(storage));

  useEffect(() => {
    writeOnboardingState(storage, state);
  }, [state, storage]);

  const advance = useCallback((id: OnboardingStepId) => {
    setState((current) => setOnboardingStepStatus(current, id, nextOnboardingStatus(current[id])));
  }, []);

  const doneCount = ONBOARDING_STEPS.filter((step) => state[step.id] === 'done').length;

  return (
    <Card className="onboarding-checklist">
      <CardHeader
        title="Первый запуск"
        action={
          <Badge tone="brand">
            {doneCount}/{ONBOARDING_STEPS.length}
          </Badge>
        }
      />
      <CardBody>
        <p className="onboarding-checklist__lede">
          Подключите данные, добавьте инструменты и настройте первую стратегию. Все шаги можно
          выполнить постепенно — интерфейс не блокируется.
        </p>
        <ol className="onboarding-checklist__list">
          {ONBOARDING_STEPS.map((step, index) => {
            const status = state[step.id];
            return (
              <li key={step.id} className="onboarding-checklist__item">
                <div className="onboarding-checklist__meta">
                  <span className="onboarding-checklist__index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="onboarding-checklist__title">{step.title}</p>
                    <p className="onboarding-checklist__description">{step.description}</p>
                  </div>
                </div>
                <div className="onboarding-checklist__actions">
                  <Badge tone={onboardingStatusTone(status)}>{onboardingStatusLabel(status)}</Badge>
                  <Button href={step.href} variant="secondary" size="sm">
                    {step.ctaLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      advance(step.id);
                    }}
                  >
                    Сменить статус
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
