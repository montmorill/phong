import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'
import { confirmBody } from './model'
import * as BindService from './service'

async function getUsername(headers: Record<string, string | undefined>, jwtInstance: { verify: (token: string) => Promise<false | Record<string, unknown>> }) {
  const authorization = headers.authorization ?? ''
  if (!authorization.startsWith('Bearer '))
    return null
  const payload = await jwtInstance.verify(authorization.slice(7))
  if (!payload || typeof payload.sub !== 'string')
    return null
  return payload.sub
}

export default new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: Bun.env.JWT_SECRET ?? 'dev-secret-please-change-in-production',
    exp: '7d',
  }))
  // User: get current QQ binding
  .get('/me/bindings/qq', async ({ headers, jwt, status }) => {
    const username = await getUsername(headers, jwt)
    if (!username)
      return status(401, { message: 'error.unauthorized' })
    const qq = BindService.getQQBinding(username)
    return { qq }
  })
  // User: request a bind code to show on screen
  .post('/me/bindings/qq/request', async ({ headers, jwt, status }) => {
    const username = await getUsername(headers, jwt)
    if (!username)
      return status(401, { message: 'error.unauthorized' })
    const code = BindService.generateCode(username)
    return { code }
  })
  // User: unbind QQ
  .delete('/me/bindings/qq', async ({ headers, jwt, status }) => {
    const username = await getUsername(headers, jwt)
    if (!username)
      return status(401, { message: 'error.unauthorized' })
    BindService.deleteQQBinding(username)
    return status(204, null)
  })
  // Bot: confirm binding with QQ number + code received from user
  .post('/bind/qq/confirm', ({ body, status }) => {
    const ok = BindService.confirmByCode(body.code, body.qq)
    if (!ok)
      return status(400, { message: 'bind.invalidCode' })
    return { ok: true }
  }, {
    body: confirmBody,
    error({ error, status }) {
      return status(400, { message: 'error.badRequest', detail: error })
    },
  })
