import { describe, expect, it } from 'vitest';
import { packageName } from './index.js';

describe('@moex/domain', () => {
  it('exports package identity', () => {
    expect(packageName).toBe('@moex/domain');
  });
});
