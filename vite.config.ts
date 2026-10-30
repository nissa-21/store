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
          // Endpoint para leer cuerpo JSON de peticiones
          const parseBody = (req: any): Promise<any> => {
            return new Promise((resolve) => {
              let body = '';
              req.on('data', (chunk: Buffer) => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  resolve(body ? JSON.parse(body) : {});
                } catch {
                  resolve({});
                }
              });
            });
          };

          // Middleware para APIs del Administrador NISSA
          server.middlewares.use(async (req, res, next) => {
            const url = req.url || '';

            // 1. Guardar imagen en la carpeta /fotos del disco local
            if (url === '/api/save-image' && req.method === 'POST') {
              try {
                const fs = await import('fs');
                const pathMod = await import('path');
                const data = await parseBody(req);
                let { filename, dataUrl } = data;
                if (!filename || !dataUrl) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: false, error: 'Faltan parámetros filename o dataUrl' }));
                  return;
                }

                // Sanitizar nombre de archivo
                filename = pathMod.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
                if (!/\.(jpe?g|png|webp|gif)$/i.test(filename)) {
                  filename += '.jpg';
                }

                const fotosDir = pathMod.resolve(__dirname, 'fotos');
                if (!fs.existsSync(fotosDir)) {
                  fs.mkdirSync(fotosDir, { recursive: true });
                }

                const base64Data = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
                const filePath = pathMod.join(fotosDir, filename);
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true, filename, path: `/fotos/${filename}` }));
                return;
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: err.message }));
                return;
              }
            }

            // 2. Guardar catálogo products.js en el disco local
            if (url === '/api/save-products' && req.method === 'POST') {
              try {
                const fs = await import('fs');
                const pathMod = await import('path');
                const data = await parseBody(req);
                const { code } = data;
                if (!code || typeof code !== 'string') {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: false, error: 'Código de products.js no proporcionado' }));
                  return;
                }
                const prodPath = pathMod.resolve(__dirname, 'products.js');
                fs.writeFileSync(prodPath, code, 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
                return;
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: err.message }));
                return;
              }
            }

            // 3. Guardar cotizador cotizador-data.js en el disco local
            if (url === '/api/save-cotizador' && req.method === 'POST') {
              try {
                const fs = await import('fs');
                const pathMod = await import('path');
                const data = await parseBody(req);
                const { code } = data;
                if (!code || typeof code !== 'string') {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: false, error: 'Código de cotizador-data.js no proporcionado' }));
                  return;
                }
                const cotiPath = pathMod.resolve(__dirname, 'cotizador-data.js');
                fs.writeFileSync(cotiPath, code, 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
                return;
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: err.message }));
                return;
              }
            }

            // 4. Proxy seguro a GitHub API (evita CORS, bloqueos de navegador, extensiones e iframes)
            if (url === '/api/github-proxy' && req.method === 'POST') {
              try {
                const data = await parseBody(req);
                const { url: targetUrl, method = 'GET', headers = {}, body: payloadBody } = data;
                if (!targetUrl || !targetUrl.startsWith('https://api.github.com/')) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ ok: false, error: 'URL inválida para GitHub API' }));
                  return;
                }

                // Normalizar cabeceras para GitHub
                const fetchHeaders: Record<string, string> = {
                  'User-Agent': 'NISSA-Admin-Suite',
                  'Accept': 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                };

                for (const [k, v] of Object.entries(headers)) {
                  if (typeof v === 'string') {
                    if (k.toLowerCase() === 'authorization') {
                      const cleanToken = v.replace(/^(token|Bearer)\s+/i, '').trim();
                      fetchHeaders['Authorization'] = `Bearer ${cleanToken}`;
                    } else {
                      fetchHeaders[k] = v;
                    }
                  }
                }

                const fetchOptions: RequestInit = {
                  method,
                  headers: fetchHeaders,
                };
                if (payloadBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                  fetchHeaders['Content-Type'] = 'application/json';
                  fetchOptions.body = typeof payloadBody === 'string' ? payloadBody : JSON.stringify(payloadBody);
                }

                const ghRes = await fetch(targetUrl, fetchOptions);
                const ghData = await ghRes.json().catch(() => ({}));

                res.statusCode = 200; // Siempre 200 para el wrapper proxy y se pasa status real adentro
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  ok: ghRes.ok,
                  status: ghRes.status,
                  statusText: ghRes.statusText,
                  data: ghData
                }));
                return;
              } catch (err: any) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  ok: false,
                  status: 502,
                  error: 'Error de conexión con GitHub API desde el servidor: ' + err.message
                }));
                return;
              }
            }

            // Reescrituras de rutas amigables
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
