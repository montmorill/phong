import { eq } from 'drizzle-orm'
import { db, emails, notifications, users } from 'server/database'
import { bus } from '../events/bus'
import { isPrefEnabled } from '../notification/prefs'

export async function deliverMailToUser(username: string, fromAddress: string, subject: string, text: string, html = '') {
  const user = await db.select({ username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .get()

  if (!user)
    return null

  const [email] = await db.insert(emails).values({ username, fromAddress, subject, html, text }).returning({
    id: emails.id,
    subject: emails.subject,
    fromAddress: emails.fromAddress,
  })

  if (!email)
    return null

  if (!isPrefEnabled(username, 'mail'))
    return email

  await db.insert(notifications).values({
    username,
    type: 'mail',
    actorLabel: email.fromAddress,
    emailId: email.id,
  })

  bus.publish('notify.mail.received', {
    recipientUsername: username,
    emailId: email.id,
    fromAddress: email.fromAddress,
    subject: email.subject,
  })

  return email
}