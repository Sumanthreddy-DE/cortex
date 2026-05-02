import { execSync } from 'node:child_process'

const ports = new Set(['5173', '51204'])
const lines = execSync('netstat -ano', { encoding: 'utf8' }).split(/\r?\n/)
const pids = new Set()

for (const line of lines) {
  if (!line.includes('LISTENING')) {
    continue
  }

  const parts = line.trim().split(/\s+/)
  const localAddress = parts[1]
  const pid = parts.at(-1)

  if (!localAddress || !pid) {
    continue
  }

  const port = localAddress.split(':').at(-1)
  if (port && ports.has(port)) {
    pids.add(pid)
  }
}

if (pids.size === 0) {
  console.log('[cortex:web] Nothing to stop.')
  process.exit(0)
}

for (const pid of pids) {
  try {
    process.kill(Number(pid))
    console.log(`[cortex:web] Stopped process ${pid}.`)
  } catch (error) {
    console.warn(`[cortex:web] Could not stop process ${pid}.`, error)
  }
}
