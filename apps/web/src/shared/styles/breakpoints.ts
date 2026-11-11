/**
 * BENEFITIARIUM layout breakpoints (visual concept §13).
 * CSS `@media` queries must use the same pixel values.
 */
export const BREAKPOINT_MOBILE_MAX_PX = 767;
export const BREAKPOINT_TABLET_MAX_PX = 1279;
export const BREAKPOINT_DESKTOP_MIN_PX = 1280;

/** QA widths required by UI-015. */
export const RESPONSIVE_QA_WIDTHS_PX: readonly number[] = [375, 768, 1024, 1440];

export function layoutBandForWidth(widthPx: number): 'mobile' | 'tablet' | 'desktop' {
  if (widthPx <= BREAKPOINT_MOBILE_MAX_PX) {
    return 'mobile';
  }
  if (widthPx <= BREAKPOINT_TABLET_MAX_PX) {
    return 'tablet';
  }
  return 'desktop';
}

export function expectsDrawerNavigation(widthPx: number): boolean {
  return widthPx <= BREAKPOINT_TABLET_MAX_PX;
}

export function expectsSingleColumnFeatureLayout(widthPx: number): boolean {
  return widthPx <= BREAKPOINT_TABLET_MAX_PX;
}
