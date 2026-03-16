import type { Awaitable } from '@/types'
import { eq } from 'drizzle-orm'
import { simpleParser } from 'mailparser'
import { db, users } from 'server/database'
import { SMTPServer } from 'smtp-server'
import { deliverMailToUser } from './service'

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

function getUsernameFromAddress(address: string) {
  const normalizedAddress = address.trim().toLowerCase()
  const [username, domain] = normalizedAddress.split('@')

  if (!username || domain !== 'pbhh.net')
    return null

  return username
}

export const mailServer = new SMTPServer({
  authOptional: true,
  onRcptTo(address, _session, callback) {
    const username = getUsernameFromAddress(address.address)

    if (!username) {
      callback(new Error('Only existing @pbhh.net recipients are accepted'))
      return
    }

    const user = db.select({ username: users.username })
      .from(users)
      .where(eq(users.username, username))
      .get()

    if (!user) {
      callback(new Error(`Recipient ${address.address} does not exist`))
      return
    }

    callback()
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
  const username = getUsernameFromAddress(toAddress)
  if (!username)
    return

  await deliverMailToUser(username, fromAddress, subject, text, html)
})
