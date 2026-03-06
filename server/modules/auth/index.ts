import { Elysia } from 'elysia'
import { bus } from '../events/bus'
import * as FollowService from '../follow/service'
import { jwtPlugin } from '../jwt'
import { optionalAuth, requireAuth } from './guard'
import { loginBody, signupBody, updateProfileBody } from './model'
import * as AuthService from './service'

export default new Elysia()
  .use(jwtPlugin)
  .post('/login', async ({ body, status, jwt }) => {
    const user = await AuthService.verify(body.username, body.password)
    if (!user)
      return status(401, { message: 'error.invalidCredentials' })
    return { token: await jwt.sign({ sub: user.username }) }
  }, {
    body: loginBody,
    error({ error, status }) {
      return status(400, { message: 'error.badRequest', detail: error })
    },
  })
  .post('/signup', async ({ body, status, jwt }) => {
    const user = await AuthService.create(body)
    if (!user)
      return status(409, { message: 'error.usernameExists' })
    bus.publish('user.registered', { username: user.username })
    return status(201, { token: await jwt.sign({ sub: user.username }) })
  }, {
    body: signupBody,
    error({ error, status }) {
      return status(400, { message: 'error.badRequest', detail: error })
    },
  })
  .use(optionalAuth)
  .get('/users/:username', ({ params, status, username: viewerUsername }) => {
    const profile = AuthService.getByUsername(params.username)
    if (!profile)
      return status(404, { message: 'error.userNotFound' })
    const { username, nickname, avatar } = profile
    const isFollowing = viewerUsername ? FollowService.isFollowing(viewerUsername, username) : false
    return { username, nickname, avatar, isFollowing }
  })
  .use(requireAuth)
  .get('/me', ({ username, status }) => {
    const user = AuthService.getByUsername(username)
    if (!user)
      return status(404, { message: 'error.userNotFound' })
    return user
  })
  .patch('/me', ({ username, status, body }) => {
    const user = AuthService.update(username, body)
    if (!user)
      return status(404, { message: 'error.userNotFound' })
    return user
  }, {
    body: updateProfileBody,
    error({ error, status }) {
      return status(400, { message: 'error.badRequest', detail: error })
    },
  })
