import { useEffect, useState } from 'react';
import { BREAKPOINT_TABLET_MAX_PX } from '../styles/breakpoints.js';

export function useDrawerLayout(): boolean {
  const [drawerLayout, setDrawerLayout] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${BREAKPOINT_TABLET_MAX_PX}px)`);
    const sync = () => {
      setDrawerLayout(query.matches);
    };
    sync();
    query.addEventListener('change', sync);
    return () => {
      query.removeEventListener('change', sync);
    };
  }, []);

  return drawerLayout;
}
