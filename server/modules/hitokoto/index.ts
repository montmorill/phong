import { Elysia, t } from 'elysia'
import { requireAuth } from '../auth/guard'
import * as HitokotoService from './service'

type HitokotoType = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l'
const HITOKOTO_CN_TYPES = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'])

async function fetchFromHitokotoCn(type: HitokotoType) {
  const res = await fetch(`https://v1.hitokoto.cn/?c=${type}&encode=json`)
  if (res.ok) {
    const data = await res.json() as {
      id: number
      uuid: string
      hitokoto: string
      type: HitokotoType
      from: string
      from_who: string | null
      creator: string
      creator_uid: number
      reviewer: number
      commit_from: 'web' | string
      created_at: `${number}`
      length: number
    }
    return {
      content: data.hitokoto,
      from: data.from,
      fromWho: data.from_who,
      creator: data.creator,
      createdAt: Number(data.created_at) * 1000,
    }
  }
}

export default new Elysia()
  .get('/hitokoto/users', () => {
    return HitokotoService.listUsers()
  })
  .get('/hitokoto', async ({ query, status }) => {
    const provider = query.provider

    if (provider && HITOKOTO_CN_TYPES.has(provider)) {
      const item = await fetchFromHitokotoCn(provider as HitokotoType)
      if (!item)
        return status(502, { message: 'error.upstreamError' })
      return item
    }

    if (!provider || !provider.startsWith('@'))
      return status(400, { message: 'error.invalidProvider' })
    const filterUsername = provider.slice(1)
    if (!filterUsername)
      return status(400, { message: 'error.invalidProvider' })
    const item = HitokotoService.random(filterUsername)
    return item || status(404, { message: 'error.hitokotoNotFound' })
  }, {
    query: t.Object({
      provider: t.Optional(t.String()),
    }),
  })
  .use(requireAuth)
  .post('/hitokoto', ({ body, status, username }) => {
    const id = HitokotoService.push(username, body.content, body.from, body.fromWho)
    return status(201, { id })
  }, {
    body: t.Object({
      content: t.String({ minLength: 1, maxLength: 1000 }),
      from: t.String({ maxLength: 100 }),
      fromWho: t.Optional(t.String({ maxLength: 100 })),
    }),
  })
  .delete('/hitokoto/:id', ({ params, status, username }) => {
    const result = HitokotoService.remove(Number(params.id), username)
    if (result === 'not_found')
      return status(404, { message: 'error.hitokotoNotFound' })
    if (result === 'forbidden')
      return status(403, { message: 'error.forbidden' })
    return {}
  })
