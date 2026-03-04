import { and, asc, count, desc, eq, isNull, SQL } from 'drizzle-orm'
import { db, tibiLikes, tibis, users } from 'server/db'

function query(where?: SQL, order: 'asc' | 'desc' = 'desc') {
  return db
    .select({
      id: tibis.id,
      parentId: tibis.parentId,
      title: tibis.title,
      content: tibis.content,
      username: tibis.username,
      nickname: users.nickname,
      avatar: users.avatar,
      createdAt: tibis.createdAt,
      likeCount: count(tibiLikes.username),
    })
    .from(tibis)
    .leftJoin(users, eq(tibis.username, users.username))
    .leftJoin(tibiLikes, eq(tibis.id, tibiLikes.tibiId))
    .where(where)
    .groupBy(tibis.id)
    .orderBy(order === 'asc' ? asc(tibis.createdAt) : desc(tibis.createdAt))
    .all()
}

function getLikedIds(viewerUsername?: string): Set<number> {
  if (!viewerUsername)
    return new Set()
  const liked = db
    .select({ tibiId: tibiLikes.tibiId })
    .from(tibiLikes)
    .where(eq(tibiLikes.username, viewerUsername))
    .all()
  return new Set(liked.map(r => r.tibiId))
}

type Row = ReturnType<typeof query>[number]
function toItem(row: Row, likedIds: Set<number>) {
  return {
    id: row.id,
    parentId: row.parentId ?? undefined,
    title: row.title ?? undefined,
    content: row.content,
    username: row.username,
    nickname: row.nickname ?? '',
    avatar: row.avatar ?? '',
    createdAt: row.createdAt!.getTime(),
    likeCount: row.likeCount,
    liked: likedIds.has(row.id),
  }
}

export function list(viewerUsername?: string, filterUsername?: string) {
  const rows = query(
    and(
      filterUsername ? eq(tibis.username, filterUsername) : undefined,
      isNull(tibis.parentId),
    ),
  )
  const likedIds = getLikedIds(viewerUsername)
  return rows.map(r => toItem(r, likedIds))
}

export function get(id: number, viewerUsername?: string) {
  const rows = query(eq(tibis.id, id))
  const row = rows[0]
  if (!row)
    return null
  return toItem(row, getLikedIds(viewerUsername))
}

export function listReplies(parentId: number, viewerUsername?: string) {
  const rows = query(eq(tibis.parentId, parentId), 'asc')
  const likedIds = getLikedIds(viewerUsername)
  return rows.map(r => toItem(r, likedIds))
}

export function create(username: string, content: string, title?: string, parentId?: number) {
  db.insert(tibis).values({ username, title: title || null, content, parentId: parentId ?? null }).run()
}

export function remove(id: number, username: string): 'ok' | 'not_found' | 'forbidden' {
  const tibi = db.select({ username: tibis.username }).from(tibis).where(eq(tibis.id, id)).get()
  if (!tibi)
    return 'not_found'
  if (tibi.username !== username)
    return 'forbidden'
  db.delete(tibiLikes).where(eq(tibiLikes.tibiId, id)).run()
  db.delete(tibis).where(eq(tibis.id, id)).run()
  return 'ok'
}

export function toggleLike(tibiId: number, username: string): boolean | null {
  const tibiExists = db.select({ id: tibis.id }).from(tibis).where(eq(tibis.id, tibiId)).get()
  if (!tibiExists)
    return null
  const existing = db
    .select()
    .from(tibiLikes)
    .where(and(eq(tibiLikes.tibiId, tibiId), eq(tibiLikes.username, username)))
    .get()
  if (existing) {
    db.delete(tibiLikes)
      .where(and(eq(tibiLikes.tibiId, tibiId), eq(tibiLikes.username, username)))
      .run()
    return false
  }
  else {
    db.insert(tibiLikes).values({ tibiId, username }).run()
    return true
  }
}
