import type { ElysiaWS } from 'elysia/ws'
import type { AppEvent } from '../events/bus'
import type { LogEntry } from './logger'
import { Elysia, t } from 'elysia'
import { bus } from '../events/bus'
import { adminEditAuth, adminUpdateAuth, adminViewAuth } from './guard'
import { getLogDates, logBuffer, logListeners, readLogsByDate } from './logger'
import { deleteTableRow, insertTableRow, queryTable, tableNames, updateTableRow } from './service'
import { proxyStudio } from './studio'
import { getUpdateStatus, runUpdateScript } from './updater'

const wsHandlers = new Map<ElysiaWS, {
  logFn: (entry: LogEntry) => void
  eventFn: (event: AppEvent) => void
  heartbeat: ReturnType<typeof setInterval>
}>()

export default new Elysia({ prefix: '/admin' })
  .group('', app => app
    .use(adminViewAuth)
    .get('/logs', () => logBuffer)
    .get('/log-dates', () => getLogDates())
    .get('/update', () => getUpdateStatus())
    .get('/logs/:date', ({ params, status }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date))
        return status(400, { message: 'error.badRequest' })
      return readLogsByDate(params.date)
    })
    .get('/tables', () => tableNames)
    .get('/db/:table', ({ params, status }) => {
      const data = queryTable(params.table)
      if (!data)
        return status(400, { message: 'error.badRequest' })
      return data
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
    }))
  .group('', app => app
    .use(adminEditAuth)
    .delete('/db/:table', ({ params, body, status }) => {
      const ok = deleteTableRow(params.table, body as Record<string, unknown>)
      if (!ok)
        return status(400, { message: 'error.badRequest' })
      return { ok: true }
    }, { body: t.Record(t.String(), t.Unknown()) })
    .patch('/db/:table', ({ params, body, status }) => {
      const ok = updateTableRow(params.table, body.pk as Record<string, unknown>, body.values as Record<string, unknown>)
      if (!ok)
        return status(400, { message: 'error.badRequest' })
      return { ok: true }
    }, { body: t.Object({ pk: t.Record(t.String(), t.Unknown()), values: t.Record(t.String(), t.Unknown()) }) })
    .post('/db/:table', ({ params, body, status }) => {
      const ok = insertTableRow(params.table, body as Record<string, unknown>)
      if (!ok)
        return status(400, { message: 'error.badRequest' })
      return { ok: true }
    }, { body: t.Record(t.String(), t.Unknown()) }))
  .group('', app => app
    .use(adminUpdateAuth)
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
    .group('/studio', app => app
      .use(adminViewAuth)
      .all('', ({ request }) => proxyStudio(request, '/'))
      .all('/*', ({ request, path }) => proxyStudio(request, path.replace('/admin/studio', '') || '/'))))
