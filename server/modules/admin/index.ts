import type { AppEvent } from '../event/bus'
import type { LogEntry } from './logger'
import { jwt } from '@elysiajs/jwt'
import { Elysia, t } from 'elysia'
import { getByUsername } from '../auth/service'
import { bus } from '../event/bus'
import { logBuffer, logListeners } from './logger'
import { queryTable, tableNames } from './service'

const wsHandlers = new Map<object, { logFn: (entry: LogEntry) => void, eventFn: (event: AppEvent) => void, heartbeat: ReturnType<typeof setInterval> }>()

async function checkAdmin(
  headers: Record<string, string | undefined>,
  query: Record<string, string | undefined>,
  jwtInstance: { verify: (token: string) => Promise<false | Record<string, unknown>> },
) {
  const token = headers.authorization?.startsWith('Bearer ')
    ? headers.authorization.slice(7)
    : (query.token ?? '')
  if (!token)
    return null
  const payload = await jwtInstance.verify(token)
  if (!payload || typeof payload.sub !== 'string')
    return null
  const user = getByUsername(payload.sub)
  if (!user?.capabilities.includes('admin'))
    return null
  return payload.sub
}

export default new Elysia({ prefix: '/admin' })
  .use(jwt({
    name: 'jwt',
    secret: Bun.env.JWT_SECRET ?? 'dev-secret-please-change-in-production',
    exp: '7d',
  }))
  .get('/logs', async ({ headers, jwt, query, status }) => {
    if (!await checkAdmin(headers, query as Record<string, string>, jwt))
      return status(403, { message: 'error.forbidden' })
    return logBuffer
  })
  .get('/tables', async ({ headers, jwt, query, status }) => {
    if (!await checkAdmin(headers, query as Record<string, string>, jwt))
      return status(403, { message: 'error.forbidden' })
    return tableNames
  })
  .get('/db/:table', async ({ headers, jwt, query, params, status }) => {
    if (!await checkAdmin(headers, query as Record<string, string>, jwt))
      return status(403, { message: 'error.forbidden' })
    const data = queryTable(params.table)
    if (!data)
      return status(400, { message: 'error.badRequest' })
    return data
  })
  .ws('/ws', {
    query: t.Object({ token: t.String() }),
    async open(ws) {
      const username = await checkAdmin({}, { token: ws.data.query.token }, ws.data.jwt)
      if (!username) {
        ws.close(1008, 'Forbidden')
        return
      }
      // Send existing log buffer
      for (const entry of logBuffer)
        ws.send(JSON.stringify(entry))
      // Subscribe to new logs
      const logFn = (entry: LogEntry) => ws.send(JSON.stringify(entry))
      logListeners.add(logFn)
      // Subscribe to all bus events
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
