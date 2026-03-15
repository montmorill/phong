import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'

export const jwtPlugin = new Elysia({ name: 'jwt-plugin' })
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET ?? 'dev-secret-please-change-in-production',
    exp: '7d',
  }))
