import type { SQL } from 'drizzle-orm'
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db, postLikes, posts, users } from 'server/db'

function query(where?: SQL, order: 'asc' | 'desc' = 'desc') {
  return db
    .select({
      id: posts.id,
      parentId: posts.parentId,
      title: posts.title,
      content: posts.content,
      username: posts.username,
      nickname: users.nickname,
      avatar: users.avatar,
      createdAt: posts.createdAt,
      likeCount: count(postLikes.username),
      replyCount: sql`(
        WITH RECURSIVE tree(id) AS (
          SELECT c.id FROM posts c WHERE c.parent_id = ${posts.id}
          UNION ALL
          SELECT p.id FROM posts p INNER JOIN tree ON p.parent_id = tree.id
        )
        SELECT COUNT(*) FROM tree
      )` as SQL<number>,
    })
    .from(posts)
    .leftJoin(users, eq(posts.username, users.username))
    .leftJoin(postLikes, eq(posts.id, postLikes.postId))
    .where(where)
    .groupBy(posts.id)
    .orderBy(order === 'asc' ? asc(posts.createdAt) : desc(posts.createdAt))
    .all()
}

function getLikedIds(viewerUsername?: string): Set<number> {
  if (!viewerUsername)
    return new Set()
  const rows = db.select({ postId: postLikes.postId }).from(postLikes).where(eq(postLikes.username, viewerUsername)).all()
  return new Set(rows.map(r => r.postId))
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
  const rows = query(and(
    filterUsername ? undefined : isNull(posts.parentId),
    filterUsername ? eq(posts.username, filterUsername) : undefined,
  ))
  const likedIds = getLikedIds(viewerUsername)
  const items = rows.map(r => toItem(r, likedIds))

  if (!filterUsername)
    return items

  const parentIds = [...new Set(items.filter(i => i.parentId).map(i => i.parentId!))]
  if (!parentIds.length)
    return items

  const parentRows = db
    .select({ id: posts.id, content: posts.content, nickname: users.nickname })
    .from(posts)
    .leftJoin(users, eq(posts.username, users.username))
    .where(inArray(posts.id, parentIds))
    .all()
  const parentMap = new Map(parentRows.map(r => [r.id, r]))

  return items.map((item) => {
    if (!item.parentId)
      return item
    const parent = parentMap.get(item.parentId)
    return { ...item, parentNickname: parent?.nickname ?? undefined, parentContent: parent?.content }
  })
}

function findRoot(id: number): number {
  let current = id
  while (true) {
    const row = db.select({ parentId: posts.parentId }).from(posts).where(eq(posts.id, current)).get()
    if (!row?.parentId)
      return current
    current = row.parentId
  }
}

export function get(id: number, viewerUsername?: string) {
  const row = query(eq(posts.id, id))[0]
  if (!row)
    return null
  return { ...toItem(row, getLikedIds(viewerUsername)), rootId: findRoot(id) }
}

export function listThread(rootId: number, viewerUsername?: string) {
  const treeIds = db.all<{ id: number }>(sql`
    WITH RECURSIVE tree(id) AS (
      SELECT id FROM ${posts} WHERE parent_id = ${rootId}
      UNION ALL
      SELECT p.id FROM ${posts} p INNER JOIN tree ON p.parent_id = tree.id
    )
    SELECT id FROM tree
  `).map(r => r.id)

  if (!treeIds.length)
    return []

  const likedIds = getLikedIds(viewerUsername)

  const rows = db
    .select({
      id: posts.id,
      parentId: posts.parentId,
      content: posts.content,
      username: posts.username,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(inArray(posts.id, treeIds))
    .orderBy(asc(posts.createdAt))
    .all()

  const rootRow = db
    .select({ id: posts.id, content: posts.content, username: posts.username })
    .from(posts)
    .where(eq(posts.id, rootId))
    .get()

  const usernames = [...new Set([...rows.map(r => r.username), ...(rootRow ? [rootRow.username] : [])])]
  const userMap = new Map(
    db.select({ username: users.username, nickname: users.nickname, avatar: users.avatar })
      .from(users)
      .where(inArray(users.username, usernames))
      .all()
      .map(u => [u.username, u]),
  )

  const likeCountMap = new Map(
    db.select({ postId: postLikes.postId, n: count() })
      .from(postLikes)
      .where(inArray(postLikes.postId, treeIds))
      .groupBy(postLikes.postId)
      .all()
      .map(r => [r.postId, r.n]),
  )

  const postMap = new Map(rows.map(r => [r.id, r]))
  if (rootRow)
    postMap.set(rootId, rootRow)

  return rows.map((r) => {
    const user = userMap.get(r.username)
    const parent = postMap.get(r.parentId!)
    const parentUser = parent ? userMap.get(parent.username) : undefined
    return {
      id: r.id,
      parentId: r.parentId!,
      content: r.content,
      username: r.username,
      nickname: user?.nickname ?? '',
      avatar: user?.avatar ?? '',
      createdAt: r.createdAt!.getTime(),
      likeCount: likeCountMap.get(r.id) ?? 0,
      liked: likedIds.has(r.id),
      parentUsername: parent?.username,
      parentNickname: parentUser?.nickname ?? undefined,
      parentContent: parent?.content,
    }
  })
}

export function listReplies(parentId: number, viewerUsername?: string) {
  const rows = query(eq(posts.parentId, parentId), 'asc')
  return rows.map(r => toItem(r, getLikedIds(viewerUsername)))
}

export function create(username: string, content: string, title?: string, parentId?: number): number {
  const result = db.insert(posts).values({ username, title: title || null, content, parentId: parentId ?? null }).returning({ id: posts.id }).get()
  return result!.id
}

export function remove(id: number, username: string): 'ok' | 'not_found' | 'forbidden' {
  const post = db.select({ username: posts.username }).from(posts).where(eq(posts.id, id)).get()
  if (!post)
    return 'not_found'
  if (post.username !== username)
    return 'forbidden'
  db.delete(postLikes).where(eq(postLikes.postId, id)).run()
  db.delete(posts).where(eq(posts.id, id)).run()
  return 'ok'
}

export function toggleLike(postId: number, username: string): boolean | null {
  if (!db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).get())
    return null
  const existing = db.select().from(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.username, username))).get()
  if (existing) {
    db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.username, username))).run()
    return false
  }
  db.insert(postLikes).values({ postId, username }).run()
  return true
}
