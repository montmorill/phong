import { and, desc, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db, emails, notifications } from 'server/database'
import { requireAuth } from '../auth/guard'
import { deliverMailToUser } from './service'

export default new Elysia()
  .use(requireAuth)
  .post('/mail/send', async ({ username, body, status }) => {
    if (body.recipientUsername === username)
      return status(400, { message: 'error.badRequest' })

    const email = await deliverMailToUser(
      body.recipientUsername,
      `${username}@pbhh.net`,
      body.subject.trim(),
      body.text.trim(),
    )

    if (!email)
      return status(404, { message: 'error.userNotFound' })

    return { ok: true, id: email.id }
  }, {
    body: t.Object({
      recipientUsername: t.String({ minLength: 3, maxLength: 20 }),
      subject: t.String({ minLength: 1, maxLength: 120 }),
      text: t.String({ minLength: 1, maxLength: 5000 }),
    }),
  })
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
    const id = Number(params.id)
    const email = await db.select().from(emails).where(and(
      eq(emails.id, id),
      eq(emails.username, username),
    )).get()

    if (!email)
      return status(404)

    await db.update(emails).set({ read: true }).where(and(
      eq(emails.id, id),
      eq(emails.username, username),
    )).run()

    await db.update(notifications).set({ read: true }).where(and(
      eq(notifications.username, username),
      eq(notifications.emailId, id),
    )).run()

    return email
  })
  .delete('/mail/:id', async ({ username, params }) => {
    await db.delete(emails).where(and(
      eq(emails.id, Number(params.id)),
      eq(emails.username, username),
    ))
  })
