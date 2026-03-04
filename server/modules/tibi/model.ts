import { Type as t } from '@sinclair/typebox'

export const createTibiBody = t.Object({
  title: t.Optional(t.String({ maxLength: 100 })),
  content: t.String({ minLength: 1, maxLength: 1000 }),
})
export type CreateTibiBody = typeof createTibiBody.static

export const replyBody = t.Object({
  content: t.String({ minLength: 1, maxLength: 1000 }),
})
export type ReplyBody = typeof replyBody.static
