import { Elysia, t } from 'elysia'
import { requireAuth } from '../auth/guard'
import { userHasCapability } from '../auth/service'

const NorthernBody = t.Object({
  ip: t.String({ format: 'ipv4' }),
  port: t.Number({ min: 0, max: 65535 }),
})

const northern: Partial<typeof NorthernBody.static> | null = {}

export default new Elysia({ prefix: '/northern' })
  .use(requireAuth)
  .post('/', ({ username, body }) => {
    if (!userHasCapability(username, 'northern')) {
      return { message: 'error.forbidden' }
    }
    console.info('POST /northern:', body)
    Object.assign(northern, body)
    console.info('northern:', northern)
  }, { body: NorthernBody })
