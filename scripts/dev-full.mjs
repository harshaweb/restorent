import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const commands = [
  ['backend', ['--env-file-if-exists=.env', 'server.mjs']],
  ['frontend', [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), '--host', '127.0.0.1']],
]
let stopping = false
const children = commands.map(([name, args]) => {
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`))
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`))
  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`)
    stop(1)
  })
  child.on('exit', (code) => {
    if (!stopping) stop(code || 0)
  })
  return child
})

function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  children.forEach((child) => child.kill())
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop())
