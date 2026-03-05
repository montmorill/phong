export interface LogEntry {
  level: 'log' | 'warn' | 'error'
  message: string
  ts: number
}

const MAX_LOGS = 500
export const logBuffer: LogEntry[] = []
export const logListeners = new Set<(entry: LogEntry) => void>()

function capture(level: LogEntry['level'], orig: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    orig(...args)
    const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
    const entry: LogEntry = { level, message, ts: Date.now() }
    if (logBuffer.length >= MAX_LOGS)
      logBuffer.shift()
    logBuffer.push(entry)
    for (const fn of logListeners)
      fn(entry)
  }
}

// Auto-initialize on import
console.log = capture('log', console.log.bind(console))
console.warn = capture('warn', console.warn.bind(console))
console.error = capture('error', console.error.bind(console))
