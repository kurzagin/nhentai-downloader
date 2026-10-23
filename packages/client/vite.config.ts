import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://nhentai.net',
        changeOrigin: true,
        secure: false,
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      },
      '/galleries': {
        target: 'https://i.nhentai.net',
        changeOrigin: true,
        secure: false,
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      },
      '/thumb-galleries': {
        target: 'https://t.nhentai.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/thumb-galleries/, '/galleries'),
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      },
    },
  },
});
