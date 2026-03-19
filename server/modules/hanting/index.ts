import type { Filters } from './service'
import { Elysia, t } from 'elysia'
import { optionalAuth, requireAuth } from '../auth/guard'
import { feedbackType } from './service'
import * as HantingService from './service'

const filterQuery = t.Object({
  flag: t.Optional(t.Numeric()),
  level: t.Optional(t.Numeric()),
  competition: t.Optional(t.String()),
})

function toFilters(query: { flag?: number, level?: number, competition?: string }): Filters {
  return {
    flag: query.flag,
    level: query.level,
    competition: query.competition || undefined,
  }
}

export default new Elysia()
  .use(optionalAuth)
  .get('/hanting/random', ({ query, status, username }) => {
    const pick = HantingService.random(toFilters(query))
    if (!pick)
      return status(404, { message: 'not found' })
    const key = { wordId: pick.wordId, variant: pick.variant }
    const word = HantingService.getByKey(key)!
    return {
      ...word,
      pinyin: word.pinyin.normalize('NFC'),
      censorMap: HantingService.buildCensorMap(word),
      feedback: HantingService.getFeedback(key),
      userFeedback: username ? HantingService.getUserFeedback(key, username) : [],
    }
  }, { query: filterQuery })
  .get('/hanting/count', ({ query }) => {
    return { count: HantingService.count(toFilters(query)) }
  }, { query: filterQuery })
  .get('/hanting/competitions', () => {
    return HantingService.competitions()
  })
  .get('/hanting/:wordId', ({ params, status, username }) => {
    const wordId = Number(params.wordId)
    const words = HantingService.getByWordId(wordId)
    if (!words.length)
      return status(404, { message: 'not found' })
    return words.map((word) => {
      const key = { wordId: word.wordId, variant: word.variant }
      return {
        ...word,
        pinyin: word.pinyin.normalize('NFC'),
        censorMap: HantingService.buildCensorMap(word),
        feedback: HantingService.getFeedback(key),
        userFeedback: username ? HantingService.getUserFeedback(key, username) : [],
      }
    })
  })
  .use(requireAuth)
  .post('/hanting/:wordId/:variant/feedback', ({ params, body, status, username }) => {
    const key = { wordId: Number(params.wordId), variant: Number(params.variant) }
    const result = HantingService.toggleFeedback(key, username, body.type)
    if (result === 'not_found')
      return status(404, { message: 'not found' })
    return { action: result }
  }, {
    params: t.Object({ wordId: t.String(), variant: t.String() }),
    body: t.Object({ type: feedbackType }),
  })
