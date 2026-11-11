import { describe, expect, it } from 'vitest';
import {
  BREAKPOINT_DESKTOP_MIN_PX,
  BREAKPOINT_MOBILE_MAX_PX,
  BREAKPOINT_TABLET_MAX_PX,
  expectsDrawerNavigation,
  expectsSingleColumnFeatureLayout,
  layoutBandForWidth,
  RESPONSIVE_QA_WIDTHS_PX,
} from './breakpoints.js';

describe('breakpoints', () => {
  it('matches visual concept desktop/tablet/mobile bands', () => {
    expect(BREAKPOINT_MOBILE_MAX_PX).toBe(767);
    expect(BREAKPOINT_TABLET_MAX_PX).toBe(1279);
    expect(BREAKPOINT_DESKTOP_MIN_PX).toBe(1280);
    expect(layoutBandForWidth(375)).toBe('mobile');
    expect(layoutBandForWidth(768)).toBe('tablet');
    expect(layoutBandForWidth(1024)).toBe('tablet');
    expect(layoutBandForWidth(1440)).toBe('desktop');
  });

  it('lists UI-015 QA widths', () => {
    expect(RESPONSIVE_QA_WIDTHS_PX).toEqual([375, 768, 1024, 1440]);
  });

  it('uses drawer nav below desktop and single-column feature layouts on tablet+', () => {
    expect(expectsDrawerNavigation(1279)).toBe(true);
    expect(expectsDrawerNavigation(1280)).toBe(false);
    expect(expectsSingleColumnFeatureLayout(1024)).toBe(true);
    expect(expectsSingleColumnFeatureLayout(1440)).toBe(false);
  });
});
