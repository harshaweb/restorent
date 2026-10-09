export default {
  async fetch(request) {
    const backendUrl = process.env.RESTO_BACKEND_URL
    const json = (status, error) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } })
    if (!backendUrl) return json(503, 'The restaurant backend is not configured. Set RESTO_BACKEND_URL in Vercel.')
    try {
      const incoming = new URL(request.url)
      const backend = new URL(backendUrl)
      if (!['http:', 'https:'].includes(backend.protocol) || backend.origin === incoming.origin) {
        return json(503, 'The restaurant backend URL is invalid.')
      }
      const path = incoming.searchParams.get('path') || incoming.pathname.replace(/^\/api\//, '')
      const decodedPath = decodeURIComponent(path)
      if (!path || decodedPath.split(/[\/\\]/).some((part) => part === '.' || part === '..')) return json(400, 'Invalid API path.')
      const target = new URL(`/api/${path}`, backend)
      if (!target.pathname.startsWith('/api/')) return json(400, 'Invalid API path.')
      incoming.searchParams.delete('path')
      target.search = incoming.searchParams.toString()
      const headers = new Headers()
      for (const name of ['content-type', 'x-admin-token', 'x-admin-email']) {
        const value = request.headers.get(name)
        if (value) headers.set(name, value)
      }
      const response = await fetch(target, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
        redirect: 'manual',
        signal: AbortSignal.timeout(20000),
      })
      if (response.status >= 300 && response.status < 400) return json(502, 'The backend returned an unexpected redirect.')
      if (request.method !== 'HEAD' && response.status !== 204 && !response.headers.get('content-type')?.includes('application/json')) {
        return json(502, 'The backend returned an invalid API response.')
      }
      return new Response(response.body, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' },
      })
    } catch {
      return json(502, 'The restaurant backend is unavailable. Please try again.')
    }
  },
}
