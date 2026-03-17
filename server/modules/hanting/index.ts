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
  .get('/hanting/random', ({ query, status }) => {
    const word = HantingService.random(toFilters(query))
    if (!word)
      return status(404, { message: 'not found' })

    return new Response(null, {
      status: 307,
      headers: {
        Location: `/api/hanting/${word.id}`,
      },
    })
  }, { query: filterQuery })
  .get('/hanting/count', ({ query }) => {
    return { count: HantingService.count(toFilters(query)) }
  }, { query: filterQuery })
  .get('/hanting/competitions', () => {
    return HantingService.competitions()
  })
  .use(optionalAuth)
  .get('/hanting/:id', ({ params, status, username }) => {
    const word = HantingService.getById(Number(params.id))
    return word && {
      ...word,
      feedback: HantingService.getFeedback(word.id),
      userFeedback: username ? HantingService.getUserFeedback(word.id, username) : [],
    } || status(404, { message: 'not found' })
  })
  .use(requireAuth)
  .post('/hanting/:id/feedback', ({ params, body, status, username }) => {
    const result = HantingService.toggleFeedback(Number(params.id), username, body.type)
    if (result === 'not_found')
      return status(404, { message: 'not found' })
    return { action: result }
  }, {
    body: t.Object({ type: feedbackType }),
  })
