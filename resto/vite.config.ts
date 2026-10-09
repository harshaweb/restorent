import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import { fileURLToPath, URL } from 'node:url'

function adminRoute(server: ViteDevServer | PreviewServer) {
  server.middlewares.use((req, _res, next) => {
    const url = new URL(req.url || '/', 'http://localhost')
    if (['/admin', '/admin/', '/admin/index.html'].includes(url.pathname)) req.url = '/admin.html' + url.search
    next()
  })
}

export default defineConfig({
  plugins: [{ name: 'admin-route', configureServer: adminRoute, configurePreviewServer: adminRoute }],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
