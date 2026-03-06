import type { AppEvent } from '../events/bus'
import { and, count, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db, notifications, posts, users } from 'server/db'
import { bus } from '../events/bus'

bus.on('event', (event: AppEvent) => {
  if (event.topic === 'post.liked') {
    const { postId, actorUsername, liked } = event.payload as { postId: number, actorUsername: string, liked: boolean }
    if (!liked)
      return
    const post = db.select({ username: posts.username, content: posts.content }).from(posts).where(eq(posts.id, postId)).get()
    if (!post || post.username === actorUsername)
      return
    const actor = db.select({ nickname: users.nickname }).from(users).where(eq(users.username, actorUsername)).get()
    db.insert(notifications).values({ username: post.username, type: 'like', actorUsername, postId }).run()
    bus.publish('notify.post.liked', {
      recipientUsername: post.username,
      actorUsername,
      actorNickname: actor?.nickname ?? actorUsername,
      postId,
      postContent: post.content,
    })
  }
  else if (event.topic === 'post.replied') {
    const { parentId, actorUsername, replyId } = event.payload as { parentId: number, actorUsername: string, replyId: number }
    const post = db.select({ username: posts.username, content: posts.content }).from(posts).where(eq(posts.id, parentId)).get()
    if (!post || post.username === actorUsername)
      return
    const actor = db.select({ nickname: users.nickname }).from(users).where(eq(users.username, actorUsername)).get()
    const reply = db.select({ content: posts.content }).from(posts).where(eq(posts.id, replyId)).get()
    db.insert(notifications).values({ username: post.username, type: 'reply', actorUsername, postId: parentId, replyId }).run()
    bus.publish('notify.post.replied', {
      recipientUsername: post.username,
      actorUsername,
      actorNickname: actor?.nickname ?? actorUsername,
      postId: parentId,
      postContent: post.content,
      replyId,
      replyContent: reply?.content,
    })
  }
})

const replyPost = alias(posts, 'reply_post')

export function list(username: string) {
  const rows = db
    .select({
      id: notifications.id,
      type: notifications.type,
      actorUsername: notifications.actorUsername,
      actorNickname: users.nickname,
      actorAvatar: users.avatar,
      postId: notifications.postId,
      postContent: posts.content,
      replyId: notifications.replyId,
      replyContent: replyPost.content,
      read: notifications.read,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorUsername, users.username))
    .leftJoin(posts, eq(notifications.postId, posts.id))
    .leftJoin(replyPost, eq(notifications.replyId, replyPost.id))
    .where(eq(notifications.username, username))
    .orderBy(desc(notifications.createdAt))
    .all()

  return rows.map(r => ({
    id: r.id,
    type: r.type as 'like' | 'reply',
    actorUsername: r.actorUsername,
    actorNickname: r.actorNickname ?? '',
    actorAvatar: r.actorAvatar ?? '',
    postId: r.postId,
    postContent: r.postContent ?? '',
    replyId: r.replyId ?? undefined,
    replyContent: r.replyContent ?? undefined,
    read: r.read,
    createdAt: r.createdAt!.getTime(),
  }))
}

export function markRead(id: number, username: string) {
  db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.username, username))).run()
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
