import { compare } from '@moex/decimal';
import { type DecimalString, parseDecimalString } from '@moex/domain';

/** Documented T-Invest SandboxPayIn upper bound. */
export const SANDBOX_PAYIN_MAX_RUB = parseDecimalString('30000000');

/** Product copy for Admin UI / API (SandboxPayIn cannot decrease balance). */
export const SANDBOX_PAYIN_NO_WITHDRAW_WARNING =
  'SandboxPayIn only increases the RUB balance; withdrawal or balance decrease is not supported.';

export function sandboxFundPolicyNotes(): string[] {
  return [
    SANDBOX_PAYIN_NO_WITHDRAW_WARNING,
    `Maximum documented SandboxPayIn amount is ${SANDBOX_PAYIN_MAX_RUB} RUB.`,
    'Funding is not provider-side idempotent; rely on app Idempotency-Key + request hash.',
  ];
}

export type FundValidationResult =
  | { ok: true; amount: DecimalString }
  | { ok: false; reason: string };

/**
 * Validates Sandbox funding amount. Withdrawal/decrease is not supported by Sandbox API.
 */
export function validateSandboxFundAmount(rawAmount: string): FundValidationResult {
  let amount: DecimalString;
  try {
    amount = parseDecimalString(rawAmount);
  } catch {
    return { ok: false, reason: 'amount must be a decimal string' };
  }

  if (compare(amount, '0') <= 0) {
    return { ok: false, reason: 'amount must be positive; SandboxPayIn cannot withdraw funds' };
  }
  if (compare(amount, SANDBOX_PAYIN_MAX_RUB) > 0) {
    return {
      ok: false,
      reason: `amount exceeds SandboxPayIn limit of ${SANDBOX_PAYIN_MAX_RUB} RUB`,
    };
  }
  return { ok: true, amount };
}
