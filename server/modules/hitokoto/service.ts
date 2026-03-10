import { eq, sql } from 'drizzle-orm'
import { db, hitokoto } from 'server/db'

export function random(username: string) {
  const result = db
    .select({
      id: hitokoto.id,
      content: hitokoto.content,
      from: hitokoto.from,
      fromWho: hitokoto.fromWho,
      creator: hitokoto.creator,
      createdAt: hitokoto.createdAt,
    })
    .from(hitokoto)
    .where(eq(hitokoto.creator, username))
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .get()
  if (result) {
    return {
      ...result,
      createdAt: Number(result.createdAt),
    }
  }
}

export function push(creator: string, content: string, from: string, fromWho?: string): number {
  const result = db
    .insert(hitokoto)
    .values({ creator, content, from, fromWho })
    .returning({ id: hitokoto.id })
    .get()
  return result!.id
}

export function listUsers(): string[] {
  return db
    .selectDistinct({ creator: hitokoto.creator })
    .from(hitokoto)
    .all()
    .map(r => r.creator)
}

export function remove(id: number, creator: string): 'ok' | 'not_found' | 'forbidden' {
  const row = db
    .select({ creator: hitokoto.creator })
    .from(hitokoto)
    .where(eq(hitokoto.id, id))
    .get()
  if (!row)
    return 'not_found'
  if (row.creator !== creator)
    return 'forbidden'
  db.delete(hitokoto).where(eq(hitokoto.id, id)).run()
  return 'ok'
}
