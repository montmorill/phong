import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'

const app = new Elysia({ prefix: '/api' })
  .use(cors())
  .use(import('@server/auth'))
  .use(import('@server/event'))
  .use(import('@server/notification'))
  .use(import('@server/posts'))
  .use(import('@server/bind'))
  .listen(3000)

export type App = typeof app

// eslint-disable-next-line no-console
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
