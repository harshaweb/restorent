export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const response = await fetch(path, { ...options, headers })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The server returned an invalid response. Check the backend connection.')
  }
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data as T
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

export function safeImageUrl(value: string): string {
  return /^(https?:\/\/|\/[^/]|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(value)
    ? value : '/amit-food-hub-logo.jpeg'
}
