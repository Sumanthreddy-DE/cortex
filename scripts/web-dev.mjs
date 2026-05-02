import { spawn } from 'node:child_process'
import process from 'node:process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = []
let isShuttingDown = false

function killChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill()
    }
  }
}

function shutdown(code = 0) {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  killChildren()
  process.exit(code)
}

function start(name, args) {
  const child = spawn(npmCommand, ['run', ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  children.push(child)

  child.on('exit', (code) => {
    if (isShuttingDown) {
      return
    }

    if (code && code !== 0) {
      console.error(`[cortex:web] ${name} exited with code ${code}`)
      shutdown(code)
    }
  })

  child.on('error', (error) => {
    console.error(`[cortex:web] ${name} failed to start`, error)
    shutdown(1)
  })
}

console.log('[cortex:web] Starting browser preview...')
console.log('[cortex:web] Open http://127.0.0.1:5173 in Chrome once the Vite server is ready.')

start('API server', ['web:api'])
start('UI server', ['web:ui'])

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
