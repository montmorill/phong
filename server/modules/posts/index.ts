import { jwt } from '@elysiajs/jwt'
import { Elysia, t } from 'elysia'
import { bus } from '../event/bus'
import { createPostBody, replyBody } from './model'
import * as PostService from './service'

export default new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: Bun.env.JWT_SECRET ?? 'dev-secret-please-change-in-production',
    exp: '7d',
  }))
  .get('/posts', async ({ headers, jwt, query }) => {
    const authorization = headers.authorization ?? ''
    let viewerUsername: string | undefined
    if (authorization.startsWith('Bearer ')) {
      const payload = await jwt.verify(authorization.slice(7))
      if (payload && typeof payload.sub === 'string')
        viewerUsername = payload.sub
    }
    return PostService.list(viewerUsername, query.username)
  }, {
    query: t.Object({ username: t.Optional(t.String()) }),
  })
  .post('/posts', async ({ headers, jwt, body, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    PostService.create(payload.sub, body.content, body.title)
    bus.publish('post.created', { username: payload.sub })
    return status(201, {})
  }, {
    body: createPostBody,
    error({ error, status }) {
      return status(400, { message: 'error.badRequest', detail: error })
    },
  })
  .delete('/posts/:id', async ({ headers, jwt, params, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    const result = PostService.remove(Number(params.id), payload.sub)
    if (result === 'not_found')
      return status(404, { message: 'error.postNotFound' })
    if (result === 'forbidden')
      return status(403, { message: 'error.forbidden' })
    return {}
  })
  .post('/posts/:id/like', async ({ headers, jwt, params, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    const result = PostService.toggleLike(Number(params.id), payload.sub)
    if (result === null)
      return status(404, { message: 'error.postNotFound' })
    bus.publish('post.liked', { postId: Number(params.id), actorUsername: payload.sub, liked: result })
    return { liked: result }
  })
  .get('/posts/:id', async ({ headers, jwt, params, status }) => {
    const authorization = headers.authorization ?? ''
    let viewerUsername: string | undefined
    if (authorization.startsWith('Bearer ')) {
      const payload = await jwt.verify(authorization.slice(7))
      if (payload && typeof payload.sub === 'string')
        viewerUsername = payload.sub
    }
    const post = PostService.get(Number(params.id), viewerUsername)
    if (!post)
      return status(404, { message: 'error.postNotFound' })
    return post
  })
  .get('/posts/:id/thread', async ({ headers, jwt, params }) => {
    const authorization = headers.authorization ?? ''
    let viewerUsername: string | undefined
    if (authorization.startsWith('Bearer ')) {
      const payload = await jwt.verify(authorization.slice(7))
      if (payload && typeof payload.sub === 'string')
        viewerUsername = payload.sub
    }
    return PostService.listThread(Number(params.id), viewerUsername)
  })
  .post('/posts/:id/reply', async ({ headers, jwt, params, body, status }) => {
    const authorization = headers.authorization ?? ''
    if (!authorization.startsWith('Bearer '))
      return status(401, { message: 'error.unauthorized' })
    const payload = await jwt.verify(authorization.slice(7))
    if (!payload || typeof payload.sub !== 'string')
      return status(401, { message: 'error.tokenExpired' })
    const parentExists = PostService.get(Number(params.id))
    if (!parentExists)
      return status(404, { message: 'error.postNotFound' })
    const replyId = PostService.create(payload.sub, body.content, undefined, Number(params.id))
    bus.publish('post.replied', { parentId: Number(params.id), actorUsername: payload.sub, replyId })
    return status(201, {})
  }, {
    body: replyBody,
  })
