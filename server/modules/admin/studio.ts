const STUDIO_ORIGIN = 'https://local.drizzle.studio'

export async function proxyStudio(request: Request, path: string) {
  const url = new URL(request.url)
  const target = new URL(path.startsWith('/') ? path : `/${path}`, STUDIO_ORIGIN)
  target.search = url.search

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('authorization')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (!['GET', 'HEAD'].includes(request.method))
    init.body = await request.arrayBuffer()

  try {
    const response = await fetch(target, init)
    const proxyHeaders = new Headers(response.headers)
    proxyHeaders.delete('content-encoding')
    proxyHeaders.delete('content-length')
    proxyHeaders.delete('transfer-encoding')
    proxyHeaders.delete('connection')
    return new Response(response.body, {
      status: response.status,
      headers: proxyHeaders,
    })
  }
  catch {
    return new Response(JSON.stringify({ message: 'error.drizzleStudioUnavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
}
