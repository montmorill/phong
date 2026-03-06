import type { AppEvent, AppEventMap } from '../events/bus'
import { and, count, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db, notifications, posts, userBindings, users } from 'server/db'
import { bus } from '../events/bus'
import * as FollowService from '../follow/service'

function getActor(username: string) {
  return db
    .select({ nickname: users.nickname, avatar: users.avatar })
    .from(users)
    .where(eq(users.username, username))
    .get()
}

function getBindings(username: string): Record<string, string> {
  return Object.fromEntries(
    db
      .select({ platform: userBindings.platform, platformId: userBindings.platformId })
      .from(userBindings)
      .where(eq(userBindings.username, username))
      .all()
      .map(r => [r.platform, r.platformId]),
  )
}

function onPostLiked({ postId, actorUsername, liked }: AppEventMap['post.liked']) {
  if (!liked)
    return
  const post = db.select({ username: posts.username, content: posts.content }).from(posts).where(eq(posts.id, postId)).get()
  if (!post || post.username === actorUsername)
    return
  const actor = getActor(actorUsername)
  db.insert(notifications).values({ username: post.username, type: 'like', actorUsername, postId }).run()
  bus.publish('notify.post.liked', {
    recipientUsername: post.username,
    recipientBindings: getBindings(post.username),
    actorUsername,
    actorNickname: actor?.nickname ?? actorUsername,
    actorAvatar: actor?.avatar,
    postId,
    postContent: post.content,
  })
}

function onPostCreated({ username: actorUsername, postId }: AppEventMap['post.created']) {
  const actor = getActor(actorUsername)
  const post = db.select({ content: posts.content }).from(posts).where(eq(posts.id, postId)).get()
  for (const username of FollowService.getFollowers(actorUsername)) {
    db.insert(notifications).values({ username, type: 'post', actorUsername, postId }).run()
    bus.publish('notify.post.created', {
      recipientUsername: username,
      recipientBindings: getBindings(username),
      actorUsername,
      actorNickname: actor?.nickname ?? actorUsername,
      actorAvatar: actor?.avatar,
      postId,
      postContent: post?.content,
    })
  }
}

function onPostReplied({ parentId, actorUsername, replyId }: AppEventMap['post.replied']) {
  const post = db.select({ username: posts.username, content: posts.content }).from(posts).where(eq(posts.id, parentId)).get()
  if (!post || post.username === actorUsername)
    return
  const actor = getActor(actorUsername)
  const reply = db.select({ content: posts.content }).from(posts).where(eq(posts.id, replyId)).get()
  db.insert(notifications).values({ username: post.username, type: 'reply', actorUsername, postId: parentId, replyId }).run()
  bus.publish('notify.post.replied', {
    recipientUsername: post.username,
    recipientBindings: getBindings(post.username),
    actorUsername,
    actorNickname: actor?.nickname ?? actorUsername,
    actorAvatar: actor?.avatar,
    postId: parentId,
    postContent: post.content,
    replyId,
    replyContent: reply?.content,
  })
}

bus.on('event', (event: AppEvent) => {
  if (event.topic === 'post.liked')
    onPostLiked(event.payload)
  else if (event.topic === 'post.created')
    onPostCreated(event.payload)
  else if (event.topic === 'post.replied')
    onPostReplied(event.payload)
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

  return rows.map(row => ({
    ...row,
    createdAt: row.createdAt.getTime(),
  }))
}

export function markRead(id: number, username: string) {
  db.update(notifications).set({ read: true }).where(and(
    eq(notifications.id, id),
    eq(notifications.username, username),
  )).run()
}

export function markAllRead(username: string) {
  db.update(notifications).set({ read: true }).where(and(
    eq(notifications.username, username),
    eq(notifications.read, false),
  )).run()
}

export function unreadCount(username: string): number {
  const result = db
    .select({ count: count() })
    .from(notifications)
    .where(and(
      eq(notifications.username, username),
      eq(notifications.read, false),
    ))
    .get()
  return result?.count ?? 0
}
