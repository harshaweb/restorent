import { spawn } from 'node:child_process'

const commands = [
  ['backend', 'node', ['server.mjs']],
  ['frontend', 'npm', ['run', 'dev', '--', '--host', '127.0.0.1']],
]

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false })
  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`))
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`))
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code
  })
  return child
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    children.forEach((child) => child.kill(signal))
  })
}
