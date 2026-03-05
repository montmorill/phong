import { desc } from 'drizzle-orm'
import { db, notifications, postLikes, posts, userBindings, userCapabilities, users } from 'server/db'

const TABLES = {
  users: () => db.select().from(users).orderBy(desc(users.createdAt)).limit(200).all(),
  posts: () => db.select().from(posts).orderBy(desc(posts.createdAt)).limit(200).all(),
  user_capabilities: () => db.select().from(userCapabilities).all(),
  user_bindings: () => db.select().from(userBindings).all(),
  post_likes: () => db.select().from(postLikes).all(),
  notifications: () => db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(200).all(),
} as const

export const tableNames = Object.keys(TABLES)

export function queryTable(name: string) {
  const fn = TABLES[name as keyof typeof TABLES]
  if (!fn)
    return null
  return { rows: fn() }
}
