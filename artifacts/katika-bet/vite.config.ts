import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';

const rawPort = process.env.PORT ?? '5173';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

const privyAppId =
  process.env.PRIVY_APP_ID ??
  process.env.VITE_PRIVY_APP_ID ??
  'cmske7xuh00750djms91aexl3';

async function replitPlugins(): Promise<PluginOption[]> {
  if (process.env.REPL_ID === undefined) {
    return [];
  }

  const plugins: PluginOption[] = [];

  try {
    const runtimeErrorOverlay = await import(
      '@replit/vite-plugin-runtime-error-modal'
    );
    plugins.push(runtimeErrorOverlay.default());
  } catch {
    // Optional off Replit.
  }

  if (process.env.NODE_ENV === 'production') {
    return plugins;
  }

  try {
    const cartographer = await import('@replit/vite-plugin-cartographer');
    plugins.push(
      cartographer.cartographer({
        root: path.resolve(import.meta.dirname, '..'),
      }),
    );
  } catch {
    // Optional off Replit.
  }

  try {
    const devBanner = await import('@replit/vite-plugin-dev-banner');
    plugins.push(devBanner.devBanner());
  } catch {
    // Optional off Replit.
  }

  return plugins;
}

export default defineConfig({
  base: basePath,
  define: {
    'import.meta.env.VITE_PRIVY_APP_ID': JSON.stringify(privyAppId),
  },
  plugins: [react(), tailwindcss(), ...(await replitPlugins())],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
