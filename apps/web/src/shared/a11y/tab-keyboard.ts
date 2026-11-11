export type TabKeyDirection = 'next' | 'prev' | 'none';

export function tabKeyDirection(key: string): TabKeyDirection {
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return 'next';
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return 'prev';
  }
  return 'none';
}

export function nextTabIndex(current: number, length: number, direction: TabKeyDirection): number {
  if (length <= 0) {
    return 0;
  }
  if (direction === 'none') {
    return current;
  }
  if (direction === 'next') {
    return (current + 1) % length;
  }
  return (current - 1 + length) % length;
}
