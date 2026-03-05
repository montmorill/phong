import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import '@server/admin/logger'

const app = new Elysia({ prefix: '/api' })
  .use(cors())
  .use(import('@server/auth'))
  .use(import('@server/event'))
  .use(import('@server/notification'))
  .use(import('@server/posts'))
  .use(import('@server/bind'))
  .use(import('@server/admin'))
  .listen(3000)

export type App = typeof app

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)
