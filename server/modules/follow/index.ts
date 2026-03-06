import { Elysia } from 'elysia'
import { optionalAuth, requireAuth } from '../auth/guard'
import * as FollowService from './service'

export default new Elysia()
  .use(optionalAuth)
  .get('/users/:username/follow', ({ params, username }) => ({
    following: username ? FollowService.isFollowing(username, params.username) : false,
  }))
  .use(requireAuth)
  .post('/users/:username/follow', ({ params, username, status }) => {
    if (params.username === username)
      return status(400, { message: 'error.badRequest' })
    const following = FollowService.toggle(username, params.username)
    return { following }
  })
