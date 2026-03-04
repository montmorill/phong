import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  username: text('username').notNull().unique().primaryKey(),
  nickname: text('nickname').notNull(),
  password: text('password').notNull(),
  avatar: text('avatar').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const userCapabilities = sqliteTable('user_capabilities', {
  username: text('username').notNull().references(() => users.username),
  capability: text('capability').notNull(),
}, table => [
  primaryKey({ columns: [table.username, table.capability] }),
])

export const tibis = sqliteTable('tibis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id'),
  title: text('title'),
  content: text('content').notNull(),
  username: text('username').notNull().references(() => users.username),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const tibiLikes = sqliteTable('tibi_likes', {
  tibiId: integer('tibi_id').notNull().references(() => tibis.id),
  username: text('username').notNull().references(() => users.username),
}, table => [
  primaryKey({ columns: [table.tibiId, table.username] }),
])
