import { fileURLToPath } from 'node:url'
process.env.DIST_DIR ||= fileURLToPath(new URL('./dist/', import.meta.url))
await import('../server.mjs')
