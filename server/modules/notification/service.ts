import type { AppEvent } from '../event/bus'
import { and, count, desc, eq } from 'drizzle-orm'
import { db, notifications, tibis, users } from 'server/db'
import { bus } from '../event/bus'

bus.on('event', (event: AppEvent) => {
  if (event.topic === 'tibi.liked') {
    const { tibiId, actorUsername, liked } = event.payload as { tibiId: number, actorUsername: string, liked: boolean }
    if (!liked)
      return
    const tibi = db.select({ username: tibis.username }).from(tibis).where(eq(tibis.id, tibiId)).get()
    if (!tibi || tibi.username === actorUsername)
      return
    db.insert(notifications).values({ username: tibi.username, type: 'like', actorUsername, tibiId }).run()
  }
  else if (event.topic === 'tibi.replied') {
    const { parentId, actorUsername, replyId } = event.payload as { parentId: number, actorUsername: string, replyId: number }
    const tibi = db.select({ username: tibis.username }).from(tibis).where(eq(tibis.id, parentId)).get()
    if (!tibi || tibi.username === actorUsername)
      return
    db.insert(notifications).values({ username: tibi.username, type: 'reply', actorUsername, tibiId: parentId, replyId }).run()
  }
})

export function list(username: string) {
  const rows = db
    .select({
      id: notifications.id,
      type: notifications.type,
      actorUsername: notifications.actorUsername,
      actorNickname: users.nickname,
      actorAvatar: users.avatar,
      tibiId: notifications.tibiId,
      tibiContent: tibis.content,
      replyId: notifications.replyId,
      read: notifications.read,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorUsername, users.username))
    .leftJoin(tibis, eq(notifications.tibiId, tibis.id))
    .where(eq(notifications.username, username))
    .orderBy(desc(notifications.createdAt))
    .all()

  return rows.map(r => ({
    id: r.id,
    type: r.type as 'like' | 'reply',
    actorUsername: r.actorUsername,
    actorNickname: r.actorNickname ?? '',
    actorAvatar: r.actorAvatar ?? '',
    tibiId: r.tibiId,
    tibiContent: (r.tibiContent ?? '').slice(0, 80),
    replyId: r.replyId ?? undefined,
    read: r.read,
    createdAt: r.createdAt!.getTime(),
  }))
}

export function markAllRead(username: string) {
  db.update(notifications).set({ read: true }).where(and(eq(notifications.username, username), eq(notifications.read, false))).run()
}

export function unreadCount(username: string): number {
  const result = db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.username, username), eq(notifications.read, false)))
    .get()
  return result?.count ?? 0
}
