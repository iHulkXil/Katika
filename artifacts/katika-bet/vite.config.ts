import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : path.dirname(__filename);

const SAFE_WINDOW_TOP =
  '(function(){try{var t=window.top;if(!t)return undefined;void t.ethereum;return t;}catch(e){return undefined;}})()';

const WALLET_SDK_PATH_RE = /(@base-org[\\/+]account|@coinbase[\\/+]wallet-sdk)/;

function patchWalletSdkWindowTop(code: string): string {
  return code.replace(/\bwindow\.top\b/g, SAFE_WINDOW_TOP);
}

function safeIframeWalletSdkPlugin(): PluginOption {
  return {
    name: 'safe-iframe-wallet-sdk',
    transform(code, id) {
      if (WALLET_SDK_PATH_RE.test(id) && code.includes('window.top')) {
        return {
          code: patchWalletSdkWindowTop(code),
          map: null,
        };
      }
      return null;
    },
  };
}

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

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5000';

export default defineConfig({
  base: basePath,
  define: {
    'import.meta.env.VITE_PRIVY_APP_ID': JSON.stringify(privyAppId),
  },
  plugins: [react(), tailwindcss(), safeIframeWalletSdkPlugin()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'safe-iframe-wallet-sdk-esbuild',
          setup(build) {
            build.onLoad({ filter: /(@base-org[\\/+]account|@coinbase[\\/+]wallet-sdk).*\.[cm]?js$/ }, async (args) => {
              const code = await fs.promises.readFile(args.path, 'utf8');
              if (!code.includes('window.top')) return undefined;
              return {
                contents: patchWalletSdkWindowTop(code),
                loader: 'js',
              };
            });
          },
        },
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'cross-fetch': path.resolve(__dirname, 'src/lib/cross-fetch.ts'),
      '@assets': path.resolve(
        __dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
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
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
