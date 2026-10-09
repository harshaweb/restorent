import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import proxy from '../api/proxy.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const admin = { 'x-admin-email': 'test@example.com', 'x-admin-token': 'integration-test-token' }
let tempDir
let backend
let production
let firstItem
let orderId
let reservationId

async function startServer(demo, filename) {
  const child = spawn(process.execPath, ['scripts/start-prod.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: '0', DATABASE_PATH: join(tempDir, filename), ADMIN_EMAIL: admin['x-admin-email'],
      ADMIN_TOKEN: admin['x-admin-token'], ENABLE_DEMO_PAYMENTS: String(demo), RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  let errors = ''
  child.stderr.on('data', (chunk) => { errors += chunk })
  const origin = await new Promise((resolveOrigin, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Backend startup timed out: ' + errors)) }, 10000)
    child.stdout.on('data', (chunk) => {
      output += chunk
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/)
      if (match) { clearTimeout(timer); resolveOrigin(match[0]) }
    })
    child.once('error', (error) => { clearTimeout(timer); reject(error) })
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Backend exited: ' + errors)) })
  })
  return { child, origin }
}

async function request(path, body, headers = {}) {
  const response = await fetch(backend.origin + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, data: await response.json() }
}

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'resto-integration-'))
  backend = await startServer(true, 'test.sqlite')
  production = await startServer(false, 'production.sqlite')
  firstItem = (await request('/api/menu')).data.menu[0]
})

after(async () => {
  for (const running of [backend, production]) {
    if (!running || running.child.exitCode !== null) continue
    const exited = once(running.child, 'exit')
    running.child.kill()
    await exited
  }
  if (tempDir?.startsWith(join(tmpdir(), 'resto-integration-'))) await rm(tempDir, { recursive: true, force: true })
})

test('backend starts, seeds the menu, serves both pages and rejects missing assets', async () => {
  assert.equal((await request('/api/health')).data.ok, true)
  assert.ok(firstItem?.price > 0)
  for (const path of ['/', '/admin', '/admin/', '/admin.html', '/admin/index.html']) {
    const response = await fetch(backend.origin + path)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, path === '/' ? /Restaurant/ : /Admin Panel/)
    for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) {
      assert.equal((await fetch(backend.origin + asset)).status, 200)
    }
  }
  assert.equal((await fetch(backend.origin + '/missing.js')).status, 404)
  assert.equal((await fetch(backend.origin + '/index.html', { method: 'HEAD' })).status, 200)
  assert.equal((await fetch(backend.origin + '/%2e%2e%5cpackage.json')).status, 403)
})

test('customer records and admin routes require authentication', async () => {
  for (const path of ['/api/admin/dashboard', '/api/orders', '/api/reservations']) assert.equal((await request(path)).status, 401)
  const dashboard = await request('/api/admin/dashboard', undefined, admin)
  assert.equal(dashboard.status, 200)
  assert.ok(Array.isArray(dashboard.data.records))
})

test('bad JSON and invalid menu inputs return client errors', async () => {
  const malformed = await fetch(backend.origin + '/api/subscribers', { method: 'POST', body: '{' })
  assert.equal(malformed.status, 400)
  const item = { name: 'Test dish', description: 'Test', category: 'Sides', price: -1 }
  assert.equal((await request('/api/admin/menu', item, admin)).status, 400)
  assert.equal((await request('/api/admin/menu/update', { ...item, id: 999999, price: 99 }, admin)).status, 404)
})

test('admin menu changes persist and missing items return 404', async () => {
  const payload = { name: 'Integration dish', description: 'Test dish', category: 'Sides', price: 75, rating: 4.5 }
  const added = await request('/api/admin/menu', payload, admin)
  assert.equal(added.status, 201)
  const updated = await request('/api/admin/menu/update', { ...payload, id: added.data.item.id, price: 80 }, admin)
  assert.equal(updated.data.item.price, 80)
  assert.equal((await request('/api/admin/menu/delete', { id: added.data.item.id }, admin)).status, 200)
})

test('section updates return frontend field names and persist', async () => {
  const result = await request('/api/admin/sections', { id: 'home', title: 'Integration title', subtitle: 'Test copy', buttonText: 'Menu', buttonHref: '#menu' }, admin)
  assert.equal(result.status, 200)
  assert.equal(result.data.section.id, 'home')
  assert.equal(result.data.section.buttonHref, '#menu')
  assert.equal((await request('/api/site-content')).data.sections.find((section) => section.id === 'home').title, 'Integration title')
  assert.equal((await request('/api/admin/sections', { id: 'home', title: 'Title', buttonHref: 'javascript:alert(1)' }, admin)).status, 400)
})

function orderPayload() {
  return { type: 'Pickup', name: 'Test customer', phone: '9876543210', address: 'Pickup', cartItems: [{ id: firstItem.id, quantity: 2 }],
    coupon: 'AMIT10', total: 1, paymentMethod: 'Cash', paymentStatus: 'Paid' }
}

test('checkout calculates totals from the database and cash remains pending', async () => {
  const result = await request('/api/orders', orderPayload())
  assert.equal(result.status, 201)
  orderId = result.data.order.id
  assert.equal(result.data.order.total, Math.round(firstItem.price * 2 * 0.9 * 1.05))
  assert.equal(result.data.order.paymentStatus, 'Pending')
  assert.equal((await request('/api/orders', { ...orderPayload(), cartItems: [{ id: firstItem.id, quantity: -1 }] })).status, 400)
  assert.equal((await request('/api/orders', { ...orderPayload(), cartItems: [null] })).status, 400)
})

test('unknown, reused and incorrect-amount payments cannot confirm an order', async () => {
  assert.equal((await request('/api/payments/razorpay/verify', { razorpayOrderId: 'order_demo_fake', razorpayPaymentId: 'fake' })).status, 400)
  const payload = orderPayload()
  const gateway = await request('/api/payments/razorpay/order', payload)
  assert.equal(gateway.status, 201)
  const transactionId = 'DEMO-' + gateway.data.order.id
  assert.equal((await request('/api/payments/razorpay/verify', { razorpayOrderId: gateway.data.order.id, razorpayPaymentId: transactionId })).status, 200)
  const paid = { ...payload, paymentMethod: 'Razorpay', transactionId }
  assert.equal((await request('/api/orders', { ...paid, coupon: '' })).status, 400)
  assert.equal((await request('/api/orders', paid)).status, 201)
  assert.equal((await request('/api/orders', paid)).status, 400)
})

test('production does not silently fall back to demo payments', async () => {
  const response = await fetch(production.origin + '/api/payments/razorpay/order', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(orderPayload()),
  })
  assert.equal(response.status, 503)
})

test('reservation validation and admin status changes work', async () => {
  const payload = { name: 'Test customer', email: 'test@example.com', date: '2099-10-09', time: '18:30', guests: '2', occasion: 'Dinner' }
  assert.equal((await request('/api/reservations', { ...payload, date: 'invalid' })).status, 400)
  assert.equal((await request('/api/reservations', { ...payload, date: '2099-02-30' })).status, 400)
  const result = await request('/api/reservations', payload)
  assert.equal(result.status, 201)
  reservationId = result.data.reservation.id
  assert.equal((await request('/api/admin/reservations/status', { id: reservationId, status: 'Confirmed' }, admin)).data.reservation.status, 'Confirmed')
  assert.equal((await request('/api/admin/orders/status', { id: orderId, status: 'Preparing' }, admin)).data.order.status, 'Preparing')
})

test('admin records and duplicate subscriptions persist correctly', async () => {
  const record = await request('/api/admin/records', { kind: 'offer', title: 'Test offer' }, admin)
  assert.equal(record.status, 200)
  assert.ok((await request('/api/admin/dashboard', undefined, admin)).data.records.some((entry) => entry.id === record.data.record.id))
  assert.equal((await request('/api/admin/records/delete', { id: record.data.record.id }, admin)).status, 200)
  for (let i = 0; i < 2; i++) assert.equal((await request('/api/subscribers', { email: 'subscriber@example.com' })).status, 201)
  assert.equal((await request('/api/admin/dashboard', undefined, admin)).data.subscribers.length, 1)
})

test('Vercel proxy returns JSON errors and forwards admin credentials and bodies', async () => {
  const previous = process.env.RESTO_BACKEND_URL
  try {
    delete process.env.RESTO_BACKEND_URL
    assert.equal((await proxy.fetch(new Request('https://frontend.example/api/proxy?path=health'))).status, 503)
    process.env.RESTO_BACKEND_URL = backend.origin
    const dashboard = await proxy.fetch(new Request('https://frontend.example/api/proxy?path=admin/dashboard', { headers: admin }))
    assert.equal(dashboard.status, 200)
    assert.ok((await dashboard.json()).menu.length > 0)
    const post = await proxy.fetch(new Request('https://frontend.example/api/proxy?path=subscribers', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'proxy@example.com' }),
    }))
    assert.equal(post.status, 201)
    assert.equal((await proxy.fetch(new Request('https://frontend.example/api/proxy?path=../package.json'))).status, 400)
  } finally {
    if (previous === undefined) delete process.env.RESTO_BACKEND_URL
    else process.env.RESTO_BACKEND_URL = previous
  }
})

test('Vercel API routing precedes admin aliases and has no homepage catchall', async () => {
  const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))
  assert.equal(config.rewrites[0].source, '/api/:path*')
  assert.ok(!config.rewrites.some((rule) => rule.source === '/(.*)'))
})

test('availability keeps paused dishes in admin but removes them from public checkout', async () => {
 assert.equal((await request('/api/admin/menu/availability',{id:firstItem.id,available:false},admin)).status,200)
 assert.ok(!(await request('/api/menu')).data.menu.some(item=>item.id===firstItem.id))
 assert.ok((await request('/api/admin/dashboard',undefined,admin)).data.menu.some(item=>item.id===firstItem.id&&!item.available))
 assert.equal((await request('/api/orders',orderPayload())).status,400)
 await request('/api/admin/menu/availability',{id:firstItem.id,available:true},admin)
})

test('manual payments update paid revenue and gateway payments cannot be overwritten', async () => {
 const result=await request('/api/admin/orders/payment',{id:orderId,paymentStatus:'Paid'},admin)
 assert.equal(result.status,200)
 assert.equal(result.data.order.paymentStatus,'Paid')
 assert.equal((await request('/api/admin/dashboard',undefined,admin)).data.stats.revenue,result.data.order.total)
 const gateway=(await request('/api/admin/dashboard',undefined,admin)).data.orders.find(order=>order.paymentMethod==='Razorpay')
 assert.equal((await request('/api/admin/orders/payment',{id:gateway.id,paymentStatus:'Paid'},admin)).status,400)
})

test('settings persist and control ordering, delivery fees, tax, and reservations', async () => {
 assert.equal((await request('/api/admin/settings',{deliveryFee:-1},admin)).status,400)
 await request('/api/admin/settings',{deliveryFee:25,taxRate:10,restaurantName:'Test Food Hub'},admin)
 const publicSettings=(await request('/api/store-settings')).data
 assert.equal(publicSettings.settings.restaurantName,'Test Food Hub')
 const delivery=await request('/api/orders',{...orderPayload(),type:'Delivery',coupon:''})
 assert.equal(delivery.data.order.total,Math.round(firstItem.price*2*1.1+25))
 await request('/api/admin/settings',{acceptingOrders:false,acceptingReservations:false},admin)
 assert.equal((await request('/api/orders',orderPayload())).status,503)
 assert.equal((await request('/api/reservations',{})).status,503)
 await request('/api/admin/settings',{deliveryFee:49,taxRate:5,acceptingOrders:true,acceptingReservations:true},admin)
})

test('coupons enforce discount, minimum order, active status, and deletion', async () => {
 assert.equal((await request('/api/admin/coupons',{code:'LIMIT20',percent:20,minOrder:99999,active:true},admin)).status,200)
 assert.equal((await request('/api/orders',{...orderPayload(),coupon:'LIMIT20'})).status,400)
 await request('/api/admin/coupons',{code:'LIMIT20',percent:20,minOrder:0,active:true},admin)
 const order=await request('/api/orders',{...orderPayload(),coupon:'LIMIT20'})
 assert.equal(order.data.order.total,Math.round(firstItem.price*2*.8*1.05))
 await request('/api/admin/coupons',{code:'LIMIT20',percent:20,minOrder:0,active:false},admin)
 assert.equal((await request('/api/orders',{...orderPayload(),coupon:'LIMIT20'})).status,400)
 assert.equal((await request('/api/admin/coupons/delete',{code:'LIMIT20'},admin)).status,200)
})

test('section visibility and subscriber removal persist', async () => {
 await request('/api/admin/sections',{id:'reviews',title:'Reviews',visible:false},admin)
 assert.equal((await request('/api/site-content')).data.sections.find(section=>section.id==='reviews').visible,false)
 await request('/api/admin/sections',{id:'reviews',title:'Reviews',visible:true},admin)
 await request('/api/subscribers',{email:'remove@example.com'})
 const subscriber=(await request('/api/admin/dashboard',undefined,admin)).data.subscribers.find(item=>item.email==='remove@example.com')
 assert.equal((await request('/api/admin/subscribers/delete',{id:subscriber.id},admin)).status,200)
 assert.ok(!(await request('/api/admin/dashboard',undefined,admin)).data.subscribers.some(item=>item.id===subscriber.id))
})
