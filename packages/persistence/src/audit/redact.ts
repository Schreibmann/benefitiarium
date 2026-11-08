const SECRET_KEY_PATTERN =
  /^(.*_)?(token|secret|password|passwd|api[_-]?key|authorization|auth|credential|private[_-]?key)$/i;

const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const LONG_HEX_OR_B64 = /\b[A-Za-z0-9+/=_-]{24,}\b/g;

export const REDACTED = '[REDACTED]';

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

function redactString(value: string): string {
  return value.replace(BEARER_PATTERN, `Bearer ${REDACTED}`).replace(LONG_HEX_OR_B64, (match) => {
    // Keep short identifiers; redact long opaque credentials.
    if (match.length < 32) {
      return match;
    }
    return REDACTED;
  });
}

/**
 * Deep-redact secrets from audit payloads before persistence.
 * Known secret keys are replaced; bearer tokens / long opaque strings are scrubbed.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function redactAuditPayload(input: unknown): Record<string, unknown> {
  const redacted = redactValue(input);
  if (isPlainObject(redacted)) {
    return redacted;
  }
  return { value: redacted };
}

function redactValue(value: unknown): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (isSecretKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactValue(nested);
      }
    }
    return result;
  }
  return String(value);
}
