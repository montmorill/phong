import { t } from 'elysia'

export const subscribeBody = t.Object({
  url: t.String({ minLength: 1 }),
  topics: t.Optional(t.Array(t.String({ minLength: 1 }))),
})

export const pushBody = t.Object({
  topic: t.String({ minLength: 1 }),
  payload: t.Unknown(),
})

export type PushBody = typeof pushBody.static
