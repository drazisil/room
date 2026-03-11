import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Rewrite all non-asset requests to index.html
          if (req.url && !req.url.includes('.') && !req.url.startsWith('/@')) {
            req.url = '/';
          }
          next();
        });
      },
    },
  ],
});
