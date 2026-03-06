import { Elysia, t } from 'elysia'
import { optionalAuth, requireAuth } from '../auth/guard'
import { bus } from '../events/bus'
import { createPostBody, replyBody } from './model'
import * as PostService from './service'

export default new Elysia()
  .use(optionalAuth)
  .get('/posts', ({ query, username }) => PostService.list(username, query.username), {
    query: t.Object({ username: t.Optional(t.String()) }),
  })
  .get('/posts/:id', ({ params, status, username }) => {
    const post = PostService.get(Number(params.id), username)
    if (!post)
      return status(404, { message: 'error.postNotFound' })
    return post
  })
  .get('/posts/:id/thread', ({ params, username }) =>
    PostService.listThread(Number(params.id), username))
  .use(requireAuth)
  .post('/posts', ({ body, status, username }) => {
    const postId = PostService.create(username, body.content, body.title)
    bus.publish('post.created', { username, postId })
    return status(201, {})
  }, {
    body: createPostBody,
    error({ error, status }) {
      return status(400, { message: 'error.badRequest', detail: error })
    },
  })
  .delete('/posts/:id', ({ params, status, username }) => {
    const result = PostService.remove(Number(params.id), username)
    if (result === 'not_found')
      return status(404, { message: 'error.postNotFound' })
    if (result === 'forbidden')
      return status(403, { message: 'error.forbidden' })
    return {}
  })
  .post('/posts/:id/like', ({ params, status, username }) => {
    const result = PostService.toggleLike(Number(params.id), username)
    if (result === null)
      return status(404, { message: 'error.postNotFound' })
    bus.publish('post.liked', { postId: Number(params.id), actorUsername: username, liked: result })
    return { liked: result }
  })
  .post('/posts/:id/reply', ({ params, body, status, username }) => {
    const parentExists = PostService.get(Number(params.id))
    if (!parentExists)
      return status(404, { message: 'error.postNotFound' })
    const replyId = PostService.create(username, body.content, undefined, Number(params.id))
    bus.publish('post.replied', { parentId: Number(params.id), actorUsername: username, replyId })
    return status(201, {})
  }, {
    body: replyBody,
  })
