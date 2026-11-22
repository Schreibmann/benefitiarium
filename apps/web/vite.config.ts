import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiProxy = {
  // History MD week/month VP can take ~15–70s (day archives throttled ~30/min).
  '/api': {
    target: 'http://127.0.0.1:3000',
    timeout: 120_000,
    proxyTimeout: 120_000,
  },
  '/ws': {
    target: 'ws://127.0.0.1:3000',
    ws: true,
  },
} as const;

function vendorChunk(id: string): string | undefined {
  const normalized = id.replaceAll('\\', '/');
  if (
    /\/node_modules\/(?:react|react-dom)\//.test(normalized) ||
    /\/node_modules\/scheduler\//.test(normalized)
  ) {
    return 'react-vendor';
  }
  if (
    /\/node_modules\/@tanstack\/charts\//.test(normalized) ||
    /\/node_modules\/d3-/.test(normalized)
  ) {
    return 'charts-vendor';
  }
  return undefined;
}

/** Bind address for Vite when serving from a VM (e.g. VITE_DEV_HOST=0.0.0.0). */
function resolveDevHost(): string | boolean | undefined {
  const raw = process.env.VITE_DEV_HOST?.trim();
  if (raw === undefined || raw.length === 0) {
    return undefined;
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  return raw;
}

const devHost = resolveDevHost();

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'd3-scale'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  server: {
    port: 5173,
    ...(devHost === undefined ? {} : { host: devHost }),
    proxy: { ...apiProxy },
  },
  preview: {
    ...(devHost === undefined ? {} : { host: devHost }),
    proxy: { ...apiProxy },
  },
});
