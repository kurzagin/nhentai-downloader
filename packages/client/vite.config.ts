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
      // Proxy image CDN requests to different subdomains for load balancing
      '/image-cdn-1': {
        target: 'https://i1.nhentai.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/image-cdn-1/, ''),
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)',
        },
      },
      '/image-cdn-3': {
        target: 'https://i3.nhentai.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/image-cdn-3/, ''),
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)',
        },
      },
      '/image-cdn-4': {
        target: 'https://i4.nhentai.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/image-cdn-4/, ''),
        headers: {
          'Referer': 'https://nhentai.net/',
          'User-Agent': 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)',
        },
      },
    },
  },
});
