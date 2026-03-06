import { eq } from 'drizzle-orm'
import { db, notificationPrefs, NOTIFICATION_TYPES } from 'server/db'
import type { NotificationType } from 'server/db'

export type NotificationPrefs = Record<NotificationType, boolean>

export function getPrefs(username: string): NotificationPrefs {
  const rows = db
    .select({ type: notificationPrefs.type, enabled: notificationPrefs.enabled })
    .from(notificationPrefs)
    .where(eq(notificationPrefs.username, username))
    .all()

  const result = Object.fromEntries(NOTIFICATION_TYPES.map(t => [t, true])) as NotificationPrefs
  for (const row of rows)
    result[row.type as NotificationType] = row.enabled
  return result
}

export function setPrefs(username: string, prefs: Partial<NotificationPrefs>) {
  for (const [type, enabled] of Object.entries(prefs) as [NotificationType, boolean][]) {
    db.insert(notificationPrefs)
      .values({ username, type, enabled })
      .onConflictDoUpdate({ target: [notificationPrefs.username, notificationPrefs.type], set: { enabled } })
      .run()
  }
}

export function isPrefEnabled(username: string, type: NotificationType): boolean {
  return getPrefs(username)[type]
}
