import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { gravatarAccounts } from '../../schema'
import { onEmail } from '../mail/server'

function extractUrls(text: string): string[] {
  const pattern = /https?:\/\/[^\s"'<>)]+/g
  return [...text.matchAll(pattern)].map(m => m[0])
}

const WP_CLIENT_ID = Bun.env.WP_CLIENT_ID!
const WP_CLIENT_SECRET = Bun.env.WP_CLIENT_SECRET!

function generatePassword() {
  return `${crypto.randomUUID().replace(/-/g, '')}Aa1!`
}

/** 等待指定邮箱收到邮件并返回邮件正文中第一个匹配的 URL */
function waitForEmail(
  toAddress: string,
  urlPattern: RegExp,
  timeoutMs = 60_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[gravatar] email timeout for ${toAddress}`)), timeoutMs)

    onEmail(({ toAddress: to, html, text }) => {
      if (to !== toAddress)
        return
      const urls = extractUrls(html || text)
      const match = urls.find(u => urlPattern.test(u))
      if (match) {
        clearTimeout(timer)
        resolve(match)
      }
    })
  })
}

/** 注册 WordPress.com 账户 */
async function registerWordPressAccount(email: string, username: string, password: string) {
  const res = await fetch('https://public-api.wordpress.com/rest/v1.1/users/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: WP_CLIENT_ID,
      client_secret: WP_CLIENT_SECRET,
      email,
      username,
      password,
      validate: '0',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[gravatar] WP registration failed: ${body}`)
  }
}

/** 用密码换取 OAuth token */
async function fetchToken(email: string, password: string) {
  const res = await fetch('https://public-api.wordpress.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: WP_CLIENT_ID,
      client_secret: WP_CLIENT_SECRET,
      grant_type: 'password',
      username: email,
      password,
    }),
  })
  if (!res.ok)
    throw new Error('[gravatar] token fetch failed')
  const data = await res.json() as { access_token: string, refresh_token: string, expires_in: number }
  return data
}

/** 刷新 access token */
async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://public-api.wordpress.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: WP_CLIENT_ID,
      client_secret: WP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok)
    throw new Error('[gravatar] token refresh failed')
  return res.json() as Promise<{ access_token: string, refresh_token: string, expires_in: number }>
}

/** 获取有效的 access token（自动续期） */
async function getValidToken(username: string): Promise<string> {
  const account = await db.select().from(gravatarAccounts).where(eq(gravatarAccounts.username, username)).get()
  if (!account)
    throw new Error(`[gravatar] no account for ${username}`)

  const now = new Date()
  if (account.accessToken && account.tokenExpiresAt && account.tokenExpiresAt > now) {
    return account.accessToken
  }

  // token 过期，用 refreshToken 续期
  if (account.refreshToken) {
    const data = await refreshAccessToken(account.refreshToken)
    const expiresAt = new Date(Date.now() + data.expires_in * 1000)
    await db.update(gravatarAccounts).set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: expiresAt,
    }).where(eq(gravatarAccounts.username, username))
    return data.access_token
  }

  // 无法续期，用密码重新获取
  const email = `${username}@pbhh.net`
  const data = await fetchToken(email, account.wpPassword)
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)
  await db.update(gravatarAccounts).set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: expiresAt,
  }).where(eq(gravatarAccounts.username, username))
  return data.access_token
}

/** 用户注册后自动创建 Gravatar 账户（后台异步执行，不阻塞注册） */
export async function registerForUser(username: string) {
  const email = `${username}@pbhh.net`
  const password = generatePassword()

  try {
    await registerWordPressAccount(email, username, password)

    // 等待验证邮件并自动点击验证链接
    const verifyUrl = await waitForEmail(email, /wordpress\.com\/activate/i)
    await fetch(verifyUrl)

    // 获取 OAuth token
    const data = await fetchToken(email, password)
    const expiresAt = new Date(Date.now() + data.expires_in * 1000)

    await db.insert(gravatarAccounts).values({
      username,
      wpPassword: password,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: expiresAt,
    })

    console.log(`[gravatar] account created for ${username}`)
  }
  catch (err) {
    console.error(`[gravatar] failed for ${username}:`, err)
  }
}

/** 用授权码换取 token 并绑定账户 */
export async function connectWithCode(username: string, code: string) {
  const redirectUri = `${Bun.env.SITE_ORIGIN}/gravatar/callback`
  console.log('[gravatar] token exchange: client_id=%s redirect_uri=%s code=%s...', WP_CLIENT_ID, redirectUri, code.slice(0, 6))
  const res = await fetch('https://public-api.wordpress.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: WP_CLIENT_ID,
      client_secret: WP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[gravatar] token exchange failed: ${body}`)
  }
  const data = await res.json() as { access_token: string, refresh_token: string, expires_in: number }
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  await db.insert(gravatarAccounts)
    .values({
      username,
      wpPassword: '',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: expiresAt,
    })
    .onConflictDoUpdate({
      target: gravatarAccounts.username,
      set: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: expiresAt,
      },
    })
}

/** 检查用户是否已连接 Gravatar */
export function isConnected(username: string) {
  const account = db.select({ username: gravatarAccounts.username })
    .from(gravatarAccounts)
    .where(eq(gravatarAccounts.username, username))
    .get()
  return !!account
}

/** 上传头像到 Gravatar */
export async function uploadAvatar(username: string, imageBuffer: ArrayBuffer, mimeType: string) {
  const token = await getValidToken(username)

  const form = new FormData()
  form.append('image', new Blob([imageBuffer], { type: mimeType }), 'avatar')

  const res = await fetch('https://api.gravatar.com/v3/me/avatars?select_avatar=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[gravatar] upload failed: ${body}`)
  }

  return res.json()
}
