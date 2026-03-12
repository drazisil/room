import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createApiMiddleware } from './server/api.js';

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'room-api',
      configureServer(server) {
        server.middlewares.use('/api', createApiMiddleware());
      },
    },
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Rewrite all non-asset, non-api requests to index.html
          if (req.url && !req.url.includes('.') && !req.url.startsWith('/@') && !req.url.startsWith('/api')) {
            req.url = '/';
          }
          next();
        });
      },
    },
  ],
});
