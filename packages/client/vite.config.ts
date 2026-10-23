import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://nhentai.net',
        changeOrigin: true,
        secure: false,
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)',
        },
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[vite-proxy] Error:', err.message);
            if (!res.headersSent && 'writeHead' in res) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'Target Host Unreachable',
                  message:
                    'Could not connect to nhentai.net from the proxy host. Please ensure WARP/VPN is active or check connectivity.',
                  details: err.message,
                })
              );
            }
          });
        },
      },
      // Proxy thumbnail CDN requests
      '/thumb-cdn': {
        target: 'https://t1.nhentai.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/thumb-cdn/, ''),
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)',
        },
      },
      // Proxy image CDN requests
      '/image-cdn': {
        target: 'https://i1.nhentai.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/image-cdn/, ''),
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)',
        },
      },
    },
  },
});
