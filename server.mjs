import { createServer } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { addMenuItem, addOrder, addReservation, addSubscriber, deleteMenuItem, getDashboardData, updateMenuItem, updateOrderStatus, updateReservationStatus, getMenu, getOrders, getReservations, getSiteSections, updateSiteSection, saveAdminRecord, deleteAdminRecord, savePayment, getPayment, getPaymentByTransaction, markPaymentVerified } from './resto/server/database.mjs'
import { getStoreSettings, updateStoreSettings, getCoupons, saveCoupon, deleteCoupon, setMenuAvailability, updateOrderPayment, deleteSubscriber, getAdminRecords } from './resto/server/database.mjs'

const port = Number(process.env.PORT || 3001)
const adminEmail = String(process.env.ADMIN_EMAIL || 'karansingh972002@gmail').trim().toLowerCase()
const adminTokenPath = new URL('./resto/server/admin-token.txt', import.meta.url)
const adminToken = (process.env.ADMIN_TOKEN || (process.env.NODE_ENV !== 'production' && existsSync(adminTokenPath) ? readFileSync(adminTokenPath, 'utf8') : '')).trim()
const distDir = resolve(process.env.DIST_DIR || fileURLToPath(new URL('./dist/', import.meta.url)))
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || ''
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || ''
const demoPaymentsEnabled = process.env.ENABLE_DEMO_PAYMENTS === 'true' || process.env.NODE_ENV !== 'production'

const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
}

const jsonHeaders = {
  ...securityHeaders,
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
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
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 4 * 1024 * 1024) throw requestError('Request body is too large.', 413)
    chunks.push(chunk)
  }
  try {
    const raw = Buffer.concat(chunks).toString('utf8')
    const body = raw ? JSON.parse(raw) : {}
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
    return body
  } catch {
    throw requestError('Send a valid JSON object.')
  }
}

function requestError(message, status = 400) {
  return Object.assign(new Error(message), { status })
}

function sendJson(res, status, body) {
  res.writeHead(status, jsonHeaders)
  res.end(JSON.stringify(body))
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`
}

function validateRequired(body, fields) {
  return fields.filter((field) => !['string', 'number'].includes(typeof body[field]) || !String(body[field] ?? '').trim())
}

function isAdmin(req) {
  const supplied = Buffer.from(String(req.headers['x-admin-token'] || ''))
  const expected = Buffer.from(adminToken)
  return expected.length > 0 && supplied.length === expected.length && timingSafeEqual(supplied, expected)
    && String(req.headers['x-admin-email'] || '').trim().toLowerCase() === adminEmail
}

function calculateOrder(body) {
  const settings = getStoreSettings()
  if (!settings.acceptingOrders) throw requestError('The restaurant is not accepting orders right now.', 503)
  if (!Array.isArray(body.cartItems) || !body.cartItems.length || body.cartItems.length > 100) {
    throw requestError('Add at least one valid dish to the cart.')
  }
  const menu = getMenu()
  const used = new Set()
  const items = body.cartItems.map((entry) => {
    if (!entry || typeof entry !== 'object') throw requestError('The cart contains an invalid dish.')
    const { id, quantity } = entry
    const item = menu.find((entry) => entry.id === Number(id))
    if (!item || used.has(item.id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw requestError('The cart contains an invalid dish or quantity.')
    }
    used.add(item.id)
    return { ...item, quantity }
  })
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const couponCode = String(body.coupon || '').trim().toUpperCase()
  const coupon = couponCode ? getCoupons(true).find((entry) => entry.code === couponCode) : null
  if (couponCode && (!coupon || subtotal < coupon.minOrder)) throw requestError('This coupon is unavailable or its minimum order value has not been reached.')
  const discount = coupon ? subtotal * coupon.percent / 100 : 0
  const deliveryFee = (body.type || 'Delivery') === 'Delivery' ? settings.deliveryFee : 0
  return { total: Math.round((subtotal - discount) * (1 + settings.taxRate / 100) + deliveryFee), items: items.map((item) => `${item.quantity} x ${item.name}`).join(', ') }
}

function validateMenu(body) {
  const price = Number(body.price)
  const rating = body.rating == null ? 4.5 : Number(body.rating)
  if (!Number.isFinite(price) || price < 1 || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw requestError('Price must be positive and rating must be between 1 and 5.')
  }
  if (body.image && !/^(https?:\/\/|\/[^/]|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(String(body.image))) {
    throw requestError('Use an HTTP image URL or a PNG, JPEG, WebP, or GIF upload.')
  }
}

function createRazorpayOrder({ amount, receipt, notes }) {
  const amountInPaise = Math.max(100, Math.round(Number(amount) * 100))
  if (!razorpayKeyId || !razorpayKeySecret) {
    if (!demoPaymentsEnabled) throw requestError('Online payments are unavailable. Choose cash payment.', 503)
    return Promise.resolve({
      id: `order_demo_${randomUUID()}`,
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
        let data
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch {
          reject(new Error('The payment gateway returned an invalid response.'))
          return
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(data.error?.description || 'Could not create Razorpay order'))
          return
        }
        resolve({ ...data, keyId: razorpayKeyId, demo: false })
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => req.destroy(new Error('Payment gateway timed out.')))
    req.write(payload)
    req.end()
  })
}

function verifyRazorpayPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const payment = getPayment(String(razorpayOrderId || ''))
  if (!payment || payment.consumed || !razorpayPaymentId) return false
  if (payment.demo) return demoPaymentsEnabled && razorpayPaymentId === `DEMO-${payment.id}`
  if (!razorpayKeySecret) return false
  const expected = createHmac('sha256', razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  const signature = String(razorpaySignature || '')
  return /^[a-f0-9]{64}$/i.test(signature) && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
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

  if (req.method === 'GET' && url.pathname === '/api/store-settings') {
    sendJson(res, 200, { settings: getStoreSettings(), coupons: getCoupons(true), offers: getAdminRecords().filter((record) => record.kind === 'offer' && record.active !== false) })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/payments/razorpay/order') {
    const body = await readBody(req)
    const { total: amount } = calculateOrder(body)
    const order = await createRazorpayOrder({
      amount,
      receipt: `rcpt_${Date.now().toString().slice(-8)}`,
      notes: {
        customerName: String(body.name || '').trim(),
        customerPhone: String(body.phone || '').trim(),
        source: 'Amit Food Hub website',
      },
    })
    savePayment(order)
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
    const previousPayment = getPayment(body.razorpayOrderId)
    if (previousPayment.verified && previousPayment.transaction_id !== body.razorpayPaymentId) {
      throw requestError('Payment has already been verified with a different transaction.')
    }
    markPaymentVerified(body.razorpayOrderId, body.razorpayPaymentId)
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

  if (req.method === 'POST' && url.pathname === '/api/admin/settings') {
    const body = await readBody(req)
    const settings = {}
    for (const field of ['restaurantName', 'phone', 'whatsapp', 'address', 'openingHours', 'heroImage', 'logoImage']) {
      if (field in body) {
        if (typeof body[field] !== 'string' || body[field].length > 2000) throw requestError('Enter valid restaurant details.')
        settings[field] = body[field].trim()
      }
    }
    if ('restaurantName' in settings && !settings.restaurantName) throw requestError('Restaurant name is required.')
    for (const field of ['heroImage', 'logoImage']) {
      if (settings[field] && !/^(https?:\/\/|\/[^/])/i.test(settings[field])) throw requestError('Use an HTTP image URL or local image path.')
    }
    for (const field of ['phone', 'whatsapp']) {
      if (settings[field] && !/^\+?[\d ]{7,16}$/.test(settings[field])) throw requestError('Enter a valid phone number.')
    }
    for (const field of ['deliveryFee', 'taxRate']) {
      if (field in body) {
        const value = Number(body[field])
        if (!Number.isFinite(value) || value < 0 || value > (field === 'taxRate' ? 100 : 10000)) throw requestError('Enter a valid fee and tax percentage.')
        settings[field] = value
      }
    }
    for (const field of ['acceptingOrders', 'acceptingReservations']) {
      if (field in body) {
        if (typeof body[field] !== 'boolean') throw requestError('Enter a valid availability setting.')
        settings[field] = body[field]
      }
    }
    sendJson(res, 200, { settings: updateStoreSettings(settings) })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/menu/availability') {
    const body = await readBody(req)
    if (!Number.isInteger(Number(body.id)) || typeof body.available !== 'boolean') throw requestError('A valid dish and availability are required.')
    const item = setMenuAvailability(Number(body.id), body.available)
    sendJson(res, item ? 200 : 404, item ? { item } : { error: 'Menu item not found' })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/orders/payment') {
    const body = await readBody(req)
    if (typeof body.id !== 'string' || !['Pending', 'Paid'].includes(body.paymentStatus)) throw requestError('Choose a valid payment status.')
    if (getOrders().find((order) => order.id === body.id)?.paymentMethod === 'Razorpay') throw requestError('Gateway payments are managed through payment verification.')
    const order = updateOrderPayment(body.id, body.paymentStatus)
    sendJson(res, order ? 200 : 404, order ? { order } : { error: 'Order not found' })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/coupons') {
    const body = await readBody(req)
    const code = String(body.code || '').trim().toUpperCase()
    const percent = Number(body.percent)
    const minOrder = Number(body.minOrder || 0)
    if (!/^[A-Z0-9_-]{2,30}$/.test(code) || !Number.isFinite(percent) || percent <= 0 || percent > 100
      || !Number.isFinite(minOrder) || minOrder < 0 || typeof body.active !== 'boolean') throw requestError('Enter a valid code, discount, minimum order, and active status.')
    sendJson(res, 200, { coupon: saveCoupon({ code, percent, minOrder, active: body.active }) })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/coupons/delete') {
    const body = await readBody(req)
    const deleted = deleteCoupon(String(body.code || '').trim().toUpperCase())
    sendJson(res, deleted ? 200 : 404, deleted ? { ok: true } : { error: 'Coupon not found' })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/subscribers/delete') {
    const body = await readBody(req)
    const deleted = deleteSubscriber(String(body.id || ''))
    sendJson(res, deleted ? 200 : 404, deleted ? { ok: true } : { error: 'Subscriber not found' })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/sections') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['id', 'title'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    if (body.buttonHref && !/^(#[\w-]*|\/(?!\/)|https?:\/\/)/i.test(String(body.buttonHref))) {
      throw requestError('Use a section anchor, local path, or HTTP link.')
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
    validateMenu(body)
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
    validateMenu(body)
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
    if (!Number.isInteger(id) || id < 1) throw requestError('A valid menu item ID is required.')
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
    if (!['Confirmed', 'Preparing', 'Ready', 'Out for delivery', 'Delivered', 'Completed', 'Cancelled'].includes(body.status)) {
      throw requestError('Choose a valid order status.')
    }
    const order = updateOrderStatus(String(body.id), body.status)
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
    if (!['Reserved', 'Confirmed', 'Seated', 'Completed', 'Cancelled'].includes(body.status)) throw requestError('Choose a valid reservation status.')
    const reservation = updateReservationStatus(String(body.id), body.status)
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
    if (body.kind === 'offer') {
      if (typeof body.description !== 'string' && body.description !== undefined) throw requestError('Enter a valid offer description.')
      if (body.link && !/^(#[\w-]*|\/(?!\/)|https?:\/\/)/i.test(String(body.link))) throw requestError('Use a local or HTTP offer link.')
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
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Invalid admin token' })
    sendJson(res, 200, { orders: getOrders() })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/reservations') {
    if (!isAdmin(req)) return sendJson(res, 401, { error: 'Invalid admin token' })
    sendJson(res, 200, { reservations: getReservations() })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const body = await readBody(req)
    const missing = validateRequired(body, ['type', 'name', 'phone', 'address'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    if (!/^\+?[0-9 ]{10,15}$/.test(String(body.phone).trim())) {
      sendJson(res, 400, { error: 'Enter a valid phone number.' })
      return
    }
    if (!['Delivery', 'Pickup', 'Dine-in'].includes(body.type)) throw requestError('Choose a valid order type.')
    const calculated = calculateOrder(body)
    const paymentMethod = body.paymentMethod || 'Cash'
    if (!['Cash', 'Razorpay', 'UPI', 'Card', 'Bank transfer'].includes(paymentMethod)) throw requestError('Choose a valid payment method.')
    let paymentStatus = 'Pending'
    let transactionId = ''
    if (paymentMethod === 'Razorpay') {
      const payment = getPaymentByTransaction(String(body.transactionId || ''))
      if (!payment || !payment.verified || payment.consumed || payment.amount !== calculated.total * 100 || (payment.demo && !demoPaymentsEnabled)) {
        throw requestError('Verify a payment matching the current cart before placing the order.')
      }
      paymentStatus = payment.demo ? 'Demo paid' : 'Paid'
      transactionId = payment.transaction_id
    }
    const order = addOrder({ type: body.type, name: String(body.name).trim(), phone: String(body.phone).trim(), address: String(body.address).trim(), ...calculated,
      paymentMethod, paymentStatus, transactionId, id: createId('ORD'), status: 'Confirmed', createdAt: new Date().toISOString() })
    sendJson(res, 201, { order })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/reservations') {
    if (!getStoreSettings().acceptingReservations) throw requestError('Table reservations are paused. Please contact the restaurant.', 503)
    const body = await readBody(req)
    const missing = validateRequired(body, ['name', 'email', 'date', 'time', 'guests', 'occasion'])
    if (missing.length) {
      sendJson(res, 400, { error: `Missing fields: ${missing.join(', ')}` })
      return
    }
    const selectedDate = new Date(`${body.date}T00:00:00Z`)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) || !Number.isFinite(selectedDate.getTime())
      || selectedDate.toISOString().slice(0, 10) !== body.date || body.date < today
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time)) || !/^\S+@\S+\.\S+$/.test(String(body.email))
      || !Number.isInteger(Number(body.guests)) || Number(body.guests) < 1 || Number(body.guests) > 100) {
      sendJson(res, 400, { error: 'Enter a valid email, future date, time, and guest count.' })
      return
    }
    const reservation = addReservation({ ...body, guests: String(body.guests), id: createId('RSV'), status: 'Reserved', createdAt: new Date().toISOString() })
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
  if (!['GET', 'HEAD'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed' })
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    throw requestError('Invalid URL encoding.')
  }
  if (pathname === '/') pathname = '/index.html'
  if (['/admin', '/admin/', '/admin/index.html'].includes(pathname)) pathname = '/admin.html'
  const filePath = resolve(distDir, `.${pathname}`)
  if (filePath !== distDir && !filePath.startsWith(distDir + sep)) return sendJson(res, 403, { error: 'Forbidden' })
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return sendJson(res, 404, { error: 'File not found' })
  res.writeHead(200, { ...securityHeaders, 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' })
  if (req.method === 'HEAD') return res.end()
  const stream = createReadStream(filePath)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
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
    const status = error.status || 500
    if (status === 500) console.error(error)
    sendJson(res, status, { error: status === 500 ? 'Server error. Please try again.' : error.message })
  }
})

server.listen(port, () => {
  const mode = process.env.NODE_ENV === 'production' ? 'Production' : 'Backend API'
  console.log(`${mode} running on http://127.0.0.1:${server.address().port}`)
})
