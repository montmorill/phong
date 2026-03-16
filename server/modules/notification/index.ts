import { Elysia, t } from 'elysia'
import { requireAuth } from '../auth/guard'
import * as PrefsService from './prefs'
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
  .get('/me/notification-prefs', ({ username }) => PrefsService.getPrefs(username))
  .patch('/me/notification-prefs', ({ username, body }) => {
    PrefsService.setPrefs(username, body)
    return PrefsService.getPrefs(username)
  }, {
    body: t.Object({
      like: t.Optional(t.Boolean()),
      reply: t.Optional(t.Boolean()),
      post: t.Optional(t.Boolean()),
      mail: t.Optional(t.Boolean()),
    }),
  })
