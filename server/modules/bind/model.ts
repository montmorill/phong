import { t } from 'elysia'

export const confirmBody = t.Object({
  qq: t.String({ pattern: '^\\d{5,12}$' }),
  code: t.String({ minLength: 6, maxLength: 6 }),
})
export type ConfirmBody = typeof confirmBody.static
