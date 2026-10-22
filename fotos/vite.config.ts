import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          terminos: path.resolve(__dirname, 'terminos.html'),
          terminosCondiciones: path.resolve(__dirname, 'terminos-y-condiciones/index.html'),
          terminosCondicionesHtml: path.resolve(__dirname, 'terminos-y-condiciones.html'),
          notFound: path.resolve(__dirname, '404.html'),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'rewrite-routes',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url === '/terminos-y-condiciones') {
              req.url = '/terminos-y-condiciones.html';
            } else if (req.url === '/admin' || req.url === '/admin/') {
              req.url = '/admin.html';
            } else if (req.url && req.url.startsWith('/producto/')) {
              req.url = '/index.html';
            }
            next();
          });
        },
      },
    ],
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
