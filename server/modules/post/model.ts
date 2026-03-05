import { Type as t } from '@sinclair/typebox'

export const createPostBody = t.Object({
  title: t.Optional(t.String({ maxLength: 100 })),
  content: t.String({ minLength: 1, maxLength: 1000 }),
})
export type CreatePostBody = typeof createPostBody.static

export const replyBody = t.Object({
  content: t.String({ minLength: 1, maxLength: 1000 }),
})
export type ReplyBody = typeof replyBody.static
