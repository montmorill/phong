import type { SQL } from 'drizzle-orm'
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm'
import { db, sqlite, tibiLikes, tibis, users } from 'server/db'

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
      replyCount: sql<number>`(WITH RECURSIVE tree(id) AS (SELECT id FROM tibis WHERE parent_id = ${tibis.id} UNION ALL SELECT t.id FROM tibis t INNER JOIN tree ON t.parent_id = tree.id) SELECT COUNT(*) FROM tree)`,
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
    replyCount: row.replyCount,
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

function findRoot(id: number): number {
  let current = id
  while (true) {
    const row = db.select({ parentId: tibis.parentId }).from(tibis).where(eq(tibis.id, current)).get()
    if (!row?.parentId)
      return current
    current = row.parentId
  }
}

export function get(id: number, viewerUsername?: string) {
  const rows = query(eq(tibis.id, id))
  const row = rows[0]
  if (!row)
    return null
  return { ...toItem(row, getLikedIds(viewerUsername)), rootId: findRoot(id) }
}

interface ThreadRow {
  id: number
  parentId: number
  content: string
  username: string
  nickname: string
  avatar: string
  createdAt: number
  likeCount: number
  liked: number
  parentUsername: string | null
  parentNickname: string | null
  parentContent: string | null
}

export function listThread(rootId: number, viewerUsername?: string) {
  const rows = sqlite.query<ThreadRow, [number, string | null, string | null]>(`
    WITH RECURSIVE tree(id) AS (
      SELECT id FROM tibis WHERE parent_id = ?
      UNION ALL
      SELECT t.id FROM tibis t INNER JOIN tree ON t.parent_id = tree.id
    )
    SELECT
      t.id,
      t.parent_id AS parentId,
      t.content,
      t.username,
      COALESCE(u.nickname, '') AS nickname,
      COALESCE(u.avatar, '') AS avatar,
      CASE WHEN t.created_at < 1e10 THEN t.created_at * 1000 ELSE t.created_at END AS createdAt,
      (SELECT COUNT(*) FROM tibi_likes WHERE tibi_id = t.id) AS likeCount,
      CASE WHEN ? IS NOT NULL AND EXISTS(SELECT 1 FROM tibi_likes WHERE tibi_id = t.id AND username = ?) THEN 1 ELSE 0 END AS liked,
      p.username AS parentUsername,
      pu.nickname AS parentNickname,
      SUBSTR(p.content, 1, 60) AS parentContent
    FROM tibis t
    JOIN tree ON t.id = tree.id
    JOIN users u ON t.username = u.username
    LEFT JOIN tibis p ON t.parent_id = p.id
    LEFT JOIN users pu ON p.username = pu.username
    ORDER BY t.created_at ASC
  `).all(rootId, viewerUsername ?? null, viewerUsername ?? null)

  return rows.map(r => ({
    id: r.id,
    parentId: r.parentId,
    content: r.content,
    username: r.username,
    nickname: r.nickname,
    avatar: r.avatar,
    createdAt: r.createdAt,
    likeCount: r.likeCount,
    liked: r.liked !== 0,
    parentUsername: r.parentId !== rootId ? (r.parentUsername ?? undefined) : undefined,
    parentNickname: r.parentId !== rootId ? (r.parentNickname ?? undefined) : undefined,
    parentContent: r.parentId !== rootId ? (r.parentContent ?? undefined) : undefined,
  }))
}

export function listReplies(parentId: number, viewerUsername?: string) {
  const rows = query(eq(tibis.parentId, parentId), 'asc')
  const likedIds = getLikedIds(viewerUsername)
  return rows.map(r => toItem(r, likedIds))
}

export function create(username: string, content: string, title?: string, parentId?: number): number {
  const result = db.insert(tibis).values({ username, title: title || null, content, parentId: parentId ?? null }).returning({ id: tibis.id }).get()
  return result!.id
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
