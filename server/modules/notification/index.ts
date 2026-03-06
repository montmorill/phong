import { Elysia } from 'elysia'
import { requireAuth } from '../auth/guard'
import * as NotificationService from './service'
import './service'

export default new Elysia()
  .use(requireAuth)
  .get('/notifications', ({ username }) => NotificationService.list(username))
  .get('/notifications/unread', ({ username }) => ({ count: NotificationService.unreadCount(username) }))
  .post('/notifications/read', ({ username }) => {
    NotificationService.markAllRead(username)
    return {}
  })
  .post('/notifications/:id/read', ({ params, username }) => {
    NotificationService.markRead(Number(params.id), username)
    return {}
  })
