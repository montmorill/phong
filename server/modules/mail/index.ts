import { and, desc, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db, emails } from 'server/database'
import { requireAuth } from '../auth/guard'

export default new Elysia()
  .use(requireAuth)
  .get('/mail/inbox', async ({ username }) => {
    return db.select({
      id: emails.id,
      fromAddress: emails.fromAddress,
      subject: emails.subject,
      read: emails.read,
      createdAt: emails.createdAt,
    })
      .from(emails)
      .where(eq(emails.username, username))
      .orderBy(desc(emails.createdAt))
  })
  .get('/mail/:id', async ({ username, params, status }) => {
    return await db.select().from(emails).where(and(
      eq(emails.id, Number(params.id)),
      eq(emails.username, username),
    )).get() || status(404)
  })
  .delete('/mail/:id', async ({ username, params }) => {
    await db.delete(emails).where(and(
      eq(emails.id, Number(params.id)),
      eq(emails.username, username),
    ))
  })
