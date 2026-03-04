import { jwt } from '@elysiajs/jwt'
import { Type as t } from '@sinclair/typebox'
import { Elysia } from 'elysia'
import { createTibiBody, replyBody } from './model'
import * as TibiService from './service'

export default new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: Bun.env.JWT_SECRET ?? 'dev-secret-please-change-in-production',
    exp: '7d',
  }))
  .get('/tibi', async ({ headers, jwt, query }) => {
    const authorization = headers.authorization ?? ''
    let viewerUsername: string | undefined
    if (authorization.startsWith('Bearer ')) {
      const payload = await jwt.verify(authorization.slice(7))
      if (payload && typeof payload.sub === 'string')
        viewerUsername = payload.sub
    }
    return TibiService.list(viewerUsername, query.username)
  }, {
    query: t.Object({ username: t.Optional(t.String()) }),
  })
  .post('/tibi', async ({ headers, jwt, body, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    TibiService.create(payload.sub, body.content, body.title)
    return status(201, {})
  }, {
    body: createTibiBody,
    error({ error, status }) {
      return status(400, { message: 'error.badRequest', detail: error })
    },
  })
  .delete('/tibi/:id', async ({ headers, jwt, params, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    const result = TibiService.remove(Number(params.id), payload.sub)
    if (result === 'not_found')
      return status(404, { message: 'error.tibiNotFound' })
    if (result === 'forbidden')
      return status(403, { message: 'error.forbidden' })
    return {}
  })
  .post('/tibi/:id/like', async ({ headers, jwt, params, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    const result = TibiService.toggleLike(Number(params.id), payload.sub)
    if (result === null)
      return status(404, { message: 'error.tibiNotFound' })
    return { liked: result }
  })
  .get('/tibi/:id', async ({ headers, jwt, params, status }) => {
    const authorization = headers.authorization ?? ''
    let viewerUsername: string | undefined
    if (authorization.startsWith('Bearer ')) {
      const payload = await jwt.verify(authorization.slice(7))
      if (payload && typeof payload.sub === 'string')
        viewerUsername = payload.sub
    }
    const tibi = TibiService.get(Number(params.id), viewerUsername)
    if (!tibi)
      return status(404, { message: 'error.tibiNotFound' })
    return tibi
  })
  .get('/tibi/:id/replies', async ({ headers, jwt, params }) => {
    const authorization = headers.authorization ?? ''
    let viewerUsername: string | undefined
    if (authorization.startsWith('Bearer ')) {
      const payload = await jwt.verify(authorization.slice(7))
      if (payload && typeof payload.sub === 'string')
        viewerUsername = payload.sub
    }
    return TibiService.listReplies(Number(params.id), viewerUsername)
  })
  .post('/tibi/:id/reply', async ({ headers, jwt, params, body, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    const parentExists = TibiService.get(Number(params.id))
    if (!parentExists)
      return status(404, { message: 'error.tibiNotFound' })
    TibiService.create(payload.sub, body.content, undefined, Number(params.id))
    return status(201, {})
  }, {
    body: replyBody,
  })
