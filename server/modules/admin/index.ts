import type { ElysiaWS } from 'elysia/ws'
import type { AppEvent } from '../events/bus'
import type { LogEntry } from './logger'
import { Elysia, t } from 'elysia'
import { requireAuth } from '../auth/guard'
import { userHasCapability } from '../auth/service'
import { bus } from '../events/bus'
import { getLogDates, logBuffer, logListeners, readLogsByDate } from './logger'
import { getUpdateStatus, runUpdateScript } from './updater'

const wsHandlers = new Map<ElysiaWS, {
  logFn: (entry: LogEntry) => void
  eventFn: (event: AppEvent) => void
  heartbeat: ReturnType<typeof setInterval>
}>()

export default new Elysia({ prefix: '/admin' })
  .use(requireAuth)
  .onBeforeHandle(({ username, status }) => {
    if (!userHasCapability(username, 'admin'))
      return status(403, { message: 'error.forbidden' })
  })
  .get('/logs', () => logBuffer)
  .get('/log-dates', () => getLogDates())
  .get('/update', () => getUpdateStatus())
  .get('/logs/:date', ({ params, status }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date))
      return status(400, { message: 'error.badRequest' })
    return readLogsByDate(params.date)
  })
  .ws('/ws', {
    query: t.Object({ token: t.String() }),
    open(ws) {
      for (const entry of logBuffer)
        ws.send(JSON.stringify(entry))
      const logFn = (entry: LogEntry) => ws.send(JSON.stringify(entry))
      logListeners.add(logFn)
      const eventFn = (event: AppEvent) => ws.send(JSON.stringify({ type: 'event', ...event }))
      bus.on('event', eventFn)
      const heartbeat = setInterval(() => ws.send('{"type":"ping"}'), 5000)
      wsHandlers.set(ws, { logFn, eventFn, heartbeat })
    },
    close(ws) {
      const handler = wsHandlers.get(ws)
      if (handler) {
        logListeners.delete(handler.logFn)
        bus.off('event', handler.eventFn)
        clearInterval(handler.heartbeat)
        wsHandlers.delete(ws)
      }
    },
    message() {},
  })
  .post('/update', ({ status }) => {
    const result = runUpdateScript()
    if (!result.ok) {
      if (result.reason === 'missing')
        return status(500, { message: 'error.updateScriptMissing', scriptPath: result.scriptPath })
      if (result.reason === 'running')
        return status(409, { message: 'error.updateAlreadyRunning', update: getUpdateStatus() })
      return status(500, { message: 'error.updateFailed' })
    }
    return { ok: true, scriptPath: result.scriptPath, pid: result.pid, update: result.update }
  })
