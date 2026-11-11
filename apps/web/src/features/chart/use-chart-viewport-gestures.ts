import { type RefObject, useEffect, useEffectEvent, useRef } from 'react';
import {
  type ChartXExtent,
  type ChartXWindow,
  panXWindow,
  zoomXWindowAt,
} from './chart-viewport.js';

type Args = {
  enabled: boolean;
  xWindow: ChartXWindow;
  xExtent: ChartXExtent;
  onXWindowChange: (next: ChartXWindow) => void;
};

/**
 * Custom wheel zoom + drag pan. TanStack Charts `zoomX` remounts whenever the
 * controlled window identity changes in React, which breaks in-progress gestures.
 *
 * Listeners use the capture phase so chart SVG children cannot swallow events.
 * Active drags track pointer moves on `window` so pan continues outside the plot.
 */
export function useChartViewportGestures(
  containerRef: RefObject<HTMLElement | null>,
  args: Args,
): void {
  const dragRef = useRef<{
    pointerId: number;
    lastClientX: number;
    width: number;
  } | null>(null);

  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (!args.enabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const el = containerRef.current;
    if (el === null) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / width));
    const factor = Math.exp(event.deltaY * 0.0015);
    args.onXWindowChange(zoomXWindowAt(args.xWindow, args.xExtent, factor, ratio));
  });

  const onPointerDown = useEffectEvent((event: PointerEvent) => {
    if (!args.enabled || event.button !== 0) {
      return;
    }
    const el = containerRef.current;
    if (el === null) {
      return;
    }
    event.preventDefault();
    el.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      width: Math.max(el.getBoundingClientRect().width, 1),
    };
  });

  const onPointerMove = useEffectEvent((event: PointerEvent) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.lastClientX;
    if (dx === 0) {
      return;
    }
    drag.lastClientX = event.clientX;
    const span = Math.max(args.xWindow.end - args.xWindow.start, 1e-9);
    const delta = (-dx / drag.width) * span;
    args.onXWindowChange(panXWindow(args.xWindow, args.xExtent, delta));
  });

  const onPointerUp = useEffectEvent((event: PointerEvent) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    const el = containerRef.current;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
  });

  useEffect(() => {
    const el = containerRef.current;
    if (el === null || !args.enabled) {
      return;
    }
    const wheelOpts: AddEventListenerOptions = { passive: false, capture: true };
    const pointerOpts: AddEventListenerOptions = { capture: true };
    el.addEventListener('wheel', onWheel, wheelOpts);
    el.addEventListener('pointerdown', onPointerDown, pointerOpts);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('wheel', onWheel, wheelOpts);
      el.removeEventListener('pointerdown', onPointerDown, pointerOpts);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [args.enabled, containerRef]);
}
