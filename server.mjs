import { createServer } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createHmac } from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { addMenuItem, addOrder, addReservation, addSubscriber, deleteMenuItem, getDashboardData, updateMenuItem, updateOrderStatus, updateReservationStatus, getMenu, getOrders, getReservations, getSiteSections, updateSiteSection, saveAdminRecord, deleteAdminRecord } from './server/database.mjs'

const port = Number(process.env.PORT || 3001)
const adminEmail = String(process.env.ADMIN_EMAIL || 'karansingh972002@gmail').trim().toLowerCase()
const adminTokenPath = new URL('./server/admin-token.txt', import.meta.url)
const adminToken = (process.env.ADMIN_TOKEN || (existsSync(adminTokenPath) ? readFileSync(adminTokenPath, 'utf8') : '')).trim()
const distDir = new URL('./dist/', import.meta.url)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || ''
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || ''

const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
}

const jsonHeaders = {
  ...securityHeaders,
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-admin-token,x-admin-email',
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

async function readBody(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

function sendJson(res, status, body) {
  res.writeHead(status, jsonHeaders)
  res.end(JSON.stringify(body))
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-6)}`
}

function validateRequired(body, fields) {
  return fields.filter((field) => !String(body[field] ?? '').trim())
}

function isAdmin(req) {
  return req.headers['x-admin-token'] === adminToken && String(req.headers['x-admin-email'] || '').toLowerCase() === adminEmail
}

function createRazorpayOrder({ amount, receipt, notes }) {
  const amountInPaise = Math.max(100, Math.round(Number(amount) * 100))
  if (!razorpayKeyId || !razorpayKeySecret) {
    return Promise.resolve({
      id: `order_demo_${Date.now().toString().slice(-8)}`,
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      keyId: 'demo_mode',
      demo: true,
    })
  }

  const payload = JSON.stringify({ amount: amountInPaise, currency: 'INR', receipt, notes })
  const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')

  return new Promise((resolve, reject) => {
    const req = httpsRequest({
      hostname: 'api.razorpay.com',
      path: '/v1/orders',
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let raw = ''
      res.on('data', (chunk) => raw += chunk)
      res.on('end', () => {
        const data = raw ? JSON.parse(raw) : {}
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(data.error?.description || 'Could not create Razorpay order'))
          return
        }
        resolve({ ...data, keyId: razorpayKeyId, demo: false })
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

function verifyRazorpayPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (String(razorpayOrderId || '').startsWith('order_demo_')) return true
  if (!razorpayKeySecret) return false
  const expected = createHmac('sha256', razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  return expected === razorpaySignature
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, jsonHeaders)
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'resto-backend' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/site-content') {
    sendJson(res, 200, { sections: getSiteSections() })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/payments/razorpay/order') {
    const body = await readBody(req)
    const amount = Number(body.amount)
    if (!amount || amount < 1) {
      sendJson(res, 400, { error: 'Payment amount is required.' })
      return
    }
    const order = await createRazorpayOrder({
      amount,
      receipt: `rcpt_${Date.now().toString().slice(-8)}`,
      notes: {
        customerName: String(body.name || '').trim(),
        customerPhone: String(body.phone || '').trim(),
        source: 'Amit Food Hub website',
      },
    })
    sendJson(res, 201, { order })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/payments/razorpay/verify') {
    const body = await readBody(req)
    const verified = verifyRazorpayPayment({
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    })
    if (!verified) {
      sendJson(res, 400, { error: 'Payment verification failed.' })
      return
    }
    sendJson(res, 200, { verified: true, transactionId: body.razorpayPaymentId || body.razorpayOrderId })
    return
  }

  if (url.pathname.startsWith('/api/admin/') && !isAdmin(req)) {
    sendJson(res, 401, { error: 'Invalid admin token' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/dashboard') {
    sendJson(res, 200, getDashboardData())
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/sections') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['id', 'title'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const section = updateSiteSection(body)
    if (!section) {
      sendJson(res, 404, { error: 'Section not found' })
      return
    }
    sendJson(res, 200, { section })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/menu') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['name', 'category', 'description', 'price'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const item = addMenuItem({
      name: String(body.name).trim(),
      category: String(body.category).trim(),
      description: String(body.description).trim(),
      price: Number(body.price),
      rating: Number(body.rating) || 4.5,
      image: String(body.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'),
      badge: String(body.badge || 'New'),
      vegetarian: Boolean(body.vegetarian),
    })
    sendJson(res, 201, { item })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/menu/update') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['id', 'name', 'category', 'description', 'price'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const item = updateMenuItem({
      id: Number(body.id),
      name: String(body.name).trim(),
      category: String(body.category).trim(),
      description: String(body.description).trim(),
      price: Number(body.price),
      rating: Number(body.rating) || 4.5,
      image: String(body.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'),
      badge: String(body.badge || 'New'),
      vegetarian: Boolean(body.vegetarian),
    })
    if (!item) {
      sendJson(res, 404, { error: 'Menu item not found' })
      return
    }
    sendJson(res, 200, { item })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/menu/delete') {
    const body = await readBody(req)
    const id = Number(body.id)
    deleteMenuItem(id)
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/orders/status') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['id', 'status'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const order = updateOrderStatus(body.id, body.status)
    if (!order) {
      sendJson(res, 404, { error: 'Order not found' })
      return
    }
    sendJson(res, 200, { order })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/reservations/status') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['id', 'status'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const reservation = updateReservationStatus(body.id, body.status)
    if (!reservation) {
      sendJson(res, 404, { error: 'Reservation not found' })
      return
    }
    sendJson(res, 200, { reservation })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/records') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['kind', 'title'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const record = saveAdminRecord(body)
    sendJson(res, 200, { record })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/records/delete') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['id'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    deleteAdminRecord(body.id)
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/menu') {
    sendJson(res, 200, { menu: getMenu() })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/orders') {
    sendJson(res, 200, { orders: getOrders() })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/reservations') {
    sendJson(res, 200, { reservations: getReservations() })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['type', 'name', 'phone', 'address', 'items', 'total'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    if (!/^\+?[0-9 ]{10,15}$/.test(String(body.phone).trim())) {
      sendJson(res, 400, { error: 'Enter a valid phone number.' })
      return
    }
    const order = addOrder({ ...body, id: createId('ORD'), status: 'Confirmed', createdAt: new Date().toISOString() })
    sendJson(res, 201, { order })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/reservations') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['name', 'email', 'date', 'time', 'guests', 'occasion'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const selectedDate = new Date(`${body.date}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      sendJson(res, 400, { error: 'Choose today or a future date.' })
      return
    }
    const reservation = addReservation({ ...body, id: createId('RSV'), status: 'Reserved', createdAt: new Date().toISOString() })
    sendJson(res, 201, { reservation })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/subscribers') {
    const body = await readBody(req)
    const email = String(body.email ?? '').trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      sendJson(res, 400, { error: 'Enter a valid email address.' })
      return
    }
    const subscriber = addSubscriber({ id: createId('SUB'), email, createdAt: new Date().toISOString() })
    sendJson(res, 201, { subscriber })
    return
  }

  sendJson(res, 404, { error: 'API route not found' })
}

function serveStatic(req, res, url) {
  const pathname = url.pathname === '/' ? '/index.html' : (url.pathname === '/admin' ? '/admin/index.html' : url.pathname)
  const normalized = normalize(decodeURIComponent(pathname)).replace(/^\.\.(\/|\\|$)/, '')
  let filePath = join(distDir.pathname, normalized)
  if (!existsSync(filePath)) filePath = join(distDir.pathname, 'index.html')
  res.writeHead(200, { ...securityHeaders, 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' })
  createReadStream(filePath).pipe(res)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url)
      return
    }
    serveStatic(req, res, url)
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Server error' })
  }
})

server.listen(port, () => {
  const mode = process.env.NODE_ENV === 'production' ? 'Production' : 'Backend API'
  console.log(`${mode} running on http://127.0.0.1:${port}`)
})
