import { Elysia, t } from 'elysia'
import { adminAuth } from '../admin/guard'
import { requireAuth } from '../auth/guard'
import { connectWithCode, isConnected, registerForUser } from './service'

const REDIRECT_URI = `${Bun.env.SITE_ORIGIN}/gravatar/callback`

export default new Elysia()
  .use(requireAuth)
  .get('/me/gravatar', ({ username }) => ({
    connected: isConnected(username),
    authorizeUrl: `https://public-api.wordpress.com/oauth2/authorize?client_id=${Bun.env.WP_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=global`,
  }))
  .post('/me/gravatar/connect', async ({ username, body, status }) => {
    try {
      await connectWithCode(username, body.code)
      return {}
    }
    catch (err) {
      return status(400, { message: String(err) })
    }
  }, {
    body: t.Object({ code: t.String() }),
  })
  .use(adminAuth)
  .get('/gravatar/register/:username', ({ params: { username } }) => {
    registerForUser(username)
  })
