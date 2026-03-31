import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema'

export const db = drizzle({ schema })

migrate(db, { migrationsFolder: resolve(import.meta.dir, 'drizzle') })

export * from './schema'
