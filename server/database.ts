import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema'

const dataPath = resolve(import.meta.dir, '../data')
if (!existsSync(dataPath)) {
  mkdirSync(dataPath)
}

export const sqlite = new Database(resolve(dataPath, 'sqlite.db'))
sqlite.run('PRAGMA journal_mode = WAL;')
sqlite.run('PRAGMA foreign_keys = ON;')

export const db = drizzle({ schema })

migrate(db, { migrationsFolder: resolve(import.meta.dir, 'drizzle') })

export * from './schema'
