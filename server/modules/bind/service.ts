import { and, eq } from 'drizzle-orm'
import { db, userBindings } from 'server/db'

// In-memory pending codes: code -> { username, expiresAt }
const pendingCodes = new Map<string, { username: string, expiresAt: number }>()

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function generateCode(username: string): string {
  // Remove any existing pending code for this user
  for (const [code, entry] of pendingCodes) {
    if (entry.username === username)
      pendingCodes.delete(code)
  }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  pendingCodes.set(code, { username, expiresAt: Date.now() + CODE_TTL_MS })
  return code
}

// Called by the bot: given a code and QQ number, complete the binding
export function confirmByCode(code: string, qq: string): boolean {
  const pending = pendingCodes.get(code)
  if (!pending || Date.now() > pending.expiresAt) {
    pendingCodes.delete(code)
    return false
  }
  pendingCodes.delete(code)
  setQQBinding(pending.username, qq)
  return true
}

export function getQQBinding(username: string): string | null {
  const row = db.select({ platformId: userBindings.platformId })
    .from(userBindings)
    .where(and(eq(userBindings.username, username), eq(userBindings.platform, 'qq')))
    .get()
  return row?.platformId ?? null
}

export function setQQBinding(username: string, qq: string) {
  db.insert(userBindings)
    .values({ username, platform: 'qq', platformId: qq })
    .onConflictDoUpdate({
      target: [userBindings.username, userBindings.platform],
      set: { platformId: qq },
    })
    .run()
}

export function deleteQQBinding(username: string) {
  db.delete(userBindings)
    .where(and(eq(userBindings.username, username), eq(userBindings.platform, 'qq')))
    .run()
}
