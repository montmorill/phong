import type { SQL } from 'drizzle-orm'
import { and, eq, sql } from 'drizzle-orm'
import { t } from 'elysia'
import { pinyin } from 'pinyin-pro'
import { db, hantingFeedback, hantingWords } from 'server/database'

export const feedbackType = t.Union([
  t.Literal('pinyin'),
  t.Literal('definition'),
  t.Literal('example'),
  t.Literal('duplicate'),
  t.Literal('other'),
])
export type FeedbackType = typeof feedbackType.static

export interface WordKey {
  wordId: number
  variant: number
}

export interface Filters {
  flag?: number
  level?: number
  competition?: string
}

function buildWhere(filters: Filters): SQL | undefined {
  const conditions: SQL[] = []
  if (filters.flag !== undefined)
    conditions.push(eq(hantingWords.flag, filters.flag))
  if (filters.level !== undefined)
    conditions.push(eq(hantingWords.level, filters.level))
  if (filters.competition)
    conditions.push(eq(hantingWords.competition, filters.competition))
  return conditions.length ? and(...conditions) : undefined
}

function wordKeyWhere(key: WordKey) {
  return and(
    eq(hantingWords.wordId, key.wordId),
    eq(hantingWords.variant, key.variant),
  )
}

function feedbackKeyWhere(key: WordKey) {
  return and(
    eq(hantingFeedback.wordId, key.wordId),
    eq(hantingFeedback.variant, key.variant),
  )
}

export function getByKey(key: WordKey) {
  return db
    .select()
    .from(hantingWords)
    .where(wordKeyWhere(key))
    .get()
}

export function getByWordId(wordId: number) {
  return db
    .select()
    .from(hantingWords)
    .where(eq(hantingWords.wordId, wordId))
    .all()
}

export function random(filters: Filters) {
  return db
    .select({ wordId: hantingWords.wordId, variant: hantingWords.variant })
    .from(hantingWords)
    .where(buildWhere(filters))
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .get()
}

export function count(filters: Filters) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(hantingWords)
    .where(buildWhere(filters))
    .get()
  return result?.count ?? 0
}

export function toggleFeedback(key: WordKey, username: string, type: FeedbackType) {
  const word = getByKey(key)
  if (!word)
    return 'not_found' as const
  const condition = and(
    feedbackKeyWhere(key),
    eq(hantingFeedback.username, username),
    eq(hantingFeedback.type, type),
  )
  const existing = db.select().from(hantingFeedback).where(condition).get()
  if (existing) {
    db.delete(hantingFeedback).where(condition).run()
    return 'removed' as const
  }
  db.insert(hantingFeedback).values({ wordId: key.wordId, variant: key.variant, username, type }).run()
  return 'added' as const
}

export function getFeedback(key: WordKey) {
  return db
    .select({
      type: hantingFeedback.type,
      count: sql<number>`count(*)`,
    })
    .from(hantingFeedback)
    .where(feedbackKeyWhere(key))
    .groupBy(hantingFeedback.type)
    .all()
}

export function getUserFeedback(key: WordKey, username: string) {
  return db
    .select({ type: hantingFeedback.type })
    .from(hantingFeedback)
    .where(and(
      feedbackKeyWhere(key),
      eq(hantingFeedback.username, username),
    ))
    .all()
    .map(r => r.type)
}

export function competitions() {
  return db
    .selectDistinct({ competition: hantingWords.competition })
    .from(hantingWords)
    .all()
    .map(r => r.competition)
    .sort()
}

/**
 * Replace characters in text that are the answer or homophones of the answer with their pinyin.
 */
export function censorText(text: string, answerChars: string[], answerPinyins: Set<string>): string {
  return [...text].map((char) => {
    if (/\s/.test(char))
      return char
    const charPinyin = pinyin(char, { toneType: 'symbol' })
    if (charPinyin === char)
      return char // not a Chinese character
    if (answerChars.includes(char) || answerPinyins.has(charPinyin))
      return ` ${charPinyin} `
    return char
  }).join('').replace(/ {2,}/g, ' ').trim()
}

export function buildCensorMap(word: typeof hantingWords.$inferSelect): Record<string, string> {
  const answerChars = [...word.word]
  const answerPinyins = new Set(word.pinyin.normalize('NFC').split(/\s+/))
  const map: Record<string, string> = {}
  const allText = word.definition + word.example
  for (const char of new Set([...allText])) {
    if (/\s/.test(char))
      continue
    const charPinyin = pinyin(char, { toneType: 'symbol' }).normalize('NFC')
    if (charPinyin === char)
      continue
    if (answerChars.includes(char) || answerPinyins.has(charPinyin))
      map[char] = charPinyin
  }
  return map
}
