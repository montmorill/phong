import type { Awaitable } from '@/types'
import { eq } from 'drizzle-orm'
import { simpleParser } from 'mailparser'
import { db, emails, users } from 'server/database'
import { SMTPServer } from 'smtp-server'

type EmailHandler = (data: {
  toAddress: string
  subject: string
  html: string
  text: string
  fromAddress: string
}) => Awaitable<void>

const handlers: EmailHandler[] = []

export function onEmail(handler: EmailHandler) {
  handlers.push(handler)
}

export const mailServer = new SMTPServer({
  authOptional: true,
  onRcptTo(address, _session, callback) {
    if (address.address.endsWith('@pbhh.net')) {
      callback()
    }
    else {
      callback(new Error('Only @pbhh.net addresses accepted'))
    }
  },
  async onData(stream, session, callback) {
    try {
      const parsed = await simpleParser(stream)
      const toAddress = session.envelope.rcptTo[0]?.address ?? ''
      const subject = parsed.subject ?? ''
      const html = typeof parsed.html === 'string' ? parsed.html : ''
      const text = typeof parsed.text === 'string' ? parsed.text : ''
      const fromAddress = parsed.from?.text ?? ''

      for (const handler of handlers) {
        await handler({ toAddress, subject, html, text, fromAddress })
      }

      callback()
    }
    catch (err) {
      callback(err as Error)
    }
  },
})

onEmail(async ({ toAddress, subject, html, text, fromAddress }) => {
  const username = toAddress.split('@')[0] ?? ''

  const user = await db.select({ username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .get()

  if (user) {
    await db.insert(emails).values({ username, fromAddress, subject, html, text })
  }
})
