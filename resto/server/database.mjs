import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const databasePath = process.env.DATABASE_PATH || `${here}/resto.sqlite`
const legacyJsonPath = `${here}/db.json`

if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true })
export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA busy_timeout = 5000')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    rating REAL NOT NULL DEFAULT 4.5,
    image TEXT NOT NULL,
    badge TEXT NOT NULL DEFAULT 'New',
    vegetarian INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    payment_method TEXT,
    payment_status TEXT,
    transaction_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    guests TEXT NOT NULL,
    occasion TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Reserved',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_sections (
    section_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    button_text TEXT NOT NULL DEFAULT '',
    button_href TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_records (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0,
    transaction_id TEXT UNIQUE,
    verified INTEGER NOT NULL DEFAULT 0,
    consumed INTEGER NOT NULL DEFAULT 0
  );
`)

for (const [table, column, definition] of [
  ['menu_items', 'available', 'INTEGER NOT NULL DEFAULT 1'],
  ['site_sections', 'visible', 'INTEGER NOT NULL DEFAULT 1'],
]) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((field) => field.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

db.exec(`CREATE TABLE IF NOT EXISTS store_settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS coupons (code TEXT PRIMARY KEY, percent REAL NOT NULL, min_order REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);`)

const defaultSettings = {
  restaurantName: "Amit's Food Hub", phone: '8420431593', whatsapp: '918420431593', address: '',
  openingHours: 'Open daily from 11:00 AM to 11:00 PM', heroImage: '/food-plaza-hero.jpeg', logoImage: '/amit-food-hub-logo.jpeg',
  deliveryFee: 49, taxRate: 5, acceptingOrders: true, acceptingReservations: true,
}
const initialized = db.prepare('INSERT OR IGNORE INTO store_settings (id, data) VALUES (1, ?)').run(JSON.stringify(defaultSettings))
if (initialized.changes) {
  db.prepare('INSERT OR IGNORE INTO coupons (code, percent) VALUES (?, ?)').run('AMIT10', 10)
  for (const offer of [
    { id: 'default-coupon', title: 'AMIT10', description: 'Get 10% off with AMIT10 at checkout.', link: '#cart' },
    { id: 'default-pickup', title: 'Fast pickup', description: 'Order online and collect fresh food from the shop.', link: '#menu' },
    { id: 'default-party', title: 'Party orders', description: 'Contact the restaurant for bulk food orders and group meals.', link: '#contact' },
  ]) saveAdminRecord({ ...offer, kind: 'offer', active: true })
}

const rowToMenuItem = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  description: row.description,
  price: row.price,
  rating: row.rating,
  image: row.image,
  badge: row.badge,
  vegetarian: Boolean(row.vegetarian),
  available: Boolean(row.available),
})

const rowToOrder = (row) => ({
  id: row.id,
  type: row.type,
  name: row.name,
  phone: row.phone,
  address: row.address,
  items: row.items,
  total: row.total,
  status: row.status,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  transactionId: row.transaction_id,
  createdAt: row.created_at,
})

const rowToReservation = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  date: row.date,
  time: row.time,
  guests: row.guests,
  occasion: row.occasion,
  status: row.status,
  createdAt: row.created_at,
})

const rowToSubscriber = (row) => ({
  id: row.id,
  email: row.email,
  createdAt: row.created_at,
})

const countMenu = db.prepare('SELECT COUNT(*) AS count FROM menu_items')

function migrateLegacyJson() {
  if (process.env.DATABASE_PATH || countMenu.get().count > 0 || !existsSync(legacyJsonPath)) return

  const legacy = JSON.parse(readFileSync(legacyJsonPath, 'utf8'))
  const insertMenu = db.prepare(`
    INSERT INTO menu_items (id, name, category, description, price, rating, image, badge, vegetarian)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertOrder = db.prepare(`
    INSERT INTO orders (id, type, name, phone, address, items, total, status, payment_method, payment_status, transaction_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertReservation = db.prepare(`
    INSERT INTO reservations (id, name, email, date, time, guests, occasion, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertSubscriber = db.prepare(`
    INSERT OR IGNORE INTO subscribers (id, email, created_at)
    VALUES (?, ?, ?)
  `)

  db.exec('BEGIN')
  try {
    for (const item of legacy.menu || []) {
      insertMenu.run(item.id, item.name, item.category, item.description, Number(item.price), Number(item.rating) || 4.5, item.image, item.badge || 'New', item.vegetarian ? 1 : 0)
    }
    for (const order of legacy.orders || []) {
      insertOrder.run(order.id, order.type, order.name, order.phone, order.address, order.items, Number(order.total), order.status || 'Confirmed', order.paymentMethod || null, order.paymentStatus || null, order.transactionId || null, order.createdAt || new Date().toISOString())
    }
    for (const reservation of legacy.reservations || []) {
      insertReservation.run(reservation.id, reservation.name, reservation.email, reservation.date, reservation.time, reservation.guests, reservation.occasion, reservation.status || 'Reserved', reservation.createdAt || new Date().toISOString())
    }
    for (const subscriber of legacy.subscribers || []) {
      insertSubscriber.run(subscriber.id, subscriber.email, subscriber.createdAt || new Date().toISOString())
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

migrateLegacyJson()

if (countMenu.get().count === 0) {
  const seed = JSON.parse(readFileSync(new URL('./seed-menu.json', import.meta.url), 'utf8'))
  db.exec('BEGIN')
  try {
    for (const item of seed) addMenuItem(item)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function getMenu(includeUnavailable = false) {
  return db.prepare(`SELECT * FROM menu_items ${includeUnavailable ? '' : 'WHERE available = 1'} ORDER BY id`).all().map(rowToMenuItem)
}

export function addMenuItem(item) {
  const result = db.prepare(`
    INSERT INTO menu_items (name, category, description, price, rating, image, badge, vegetarian)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.name, item.category, item.description, Number(item.price), Number(item.rating) || 4.5, item.image, item.badge || 'New', item.vegetarian ? 1 : 0)
  return rowToMenuItem(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid))
}

export function updateMenuItem(item) {
  if (!db.prepare('SELECT id FROM menu_items WHERE id = ?').get(Number(item.id))) return null
  db.prepare(`
    UPDATE menu_items
    SET name = ?, category = ?, description = ?, price = ?, rating = ?, image = ?, badge = ?, vegetarian = ?
    WHERE id = ?
  `).run(
    String(item.name || '').trim(),
    String(item.category || '').trim(),
    String(item.description || '').trim(),
    Number(item.price),
    Number(item.rating) || 4.5,
    String(item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80').trim(),
    String(item.badge || 'New').trim(),
    item.vegetarian ? 1 : 0,
    Number(item.id),
  )
  return rowToMenuItem(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(Number(item.id)))
}

export function deleteMenuItem(id) {
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(Number(id))
}

export function getOrders() {
  return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(rowToOrder)
}

export function addOrder(order) {
  db.exec('BEGIN IMMEDIATE')
  try {
    if (order.paymentMethod === 'Razorpay') {
      const result = db.prepare('UPDATE payments SET consumed = 1 WHERE transaction_id = ? AND verified = 1 AND consumed = 0 AND amount = ?')
        .run(order.transactionId, Math.round(Number(order.total) * 100))
      if (result.changes !== 1) throw new Error('Payment is invalid, already used, or does not match the order total.')
    }
  db.prepare(`
    INSERT INTO orders (id, type, name, phone, address, items, total, status, payment_method, payment_status, transaction_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(order.id, order.type, order.name, order.phone, order.address, order.items, Number(order.total), order.status || 'Confirmed', order.paymentMethod || null, order.paymentStatus || null, order.transactionId || null, order.createdAt)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return order
}

export function getReservations() {
  return db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all().map(rowToReservation)
}

export function addReservation(reservation) {
  db.prepare(`
    INSERT INTO reservations (id, name, email, date, time, guests, occasion, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reservation.id, reservation.name, reservation.email, reservation.date, reservation.time, reservation.guests, reservation.occasion, reservation.status || 'Reserved', reservation.createdAt)
  return reservation
}

export function getSubscribers() {
  return db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all().map(rowToSubscriber)
}

export function addSubscriber(subscriber) {
  db.prepare('INSERT OR IGNORE INTO subscribers (id, email, created_at) VALUES (?, ?, ?)').run(subscriber.id, subscriber.email, subscriber.createdAt)
  return db.prepare('SELECT * FROM subscribers WHERE email = ?').get(subscriber.email)
}

export function getDashboardData() {
  const menu = getMenu(true)
  const orders = getOrders()
  const reservations = getReservations()
  const subscribers = getSubscribers()
  return {
    menu,
    orders,
    reservations,
    subscribers,
    sections: getSiteSections(),
    records: getAdminRecords(),
    settings: getStoreSettings(),
    coupons: getCoupons(),
    stats: {
      menuItems: menu.length,
      orders: orders.length,
      reservations: reservations.length,
      subscribers: subscribers.length,
      revenue: orders.filter((order) => order.paymentStatus === 'Paid' && order.status !== 'Cancelled').reduce((sum, order) => sum + (Number(order.total) || 0), 0),
      orderValue: orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + Number(order.total), 0),
      pendingPayments: orders.filter((order) => order.paymentStatus === 'Pending' && order.status !== 'Cancelled').reduce((sum, order) => sum + Number(order.total), 0),
    },
  }
}


const defaultSections = [
  ['home', 'Home hero', "Fresh food, made fast.", 'Order hot pizza, burgers, momos, rolls, biryani, pasta, chicken, sides, and drinks from one simple local restaurant menu.', 'Explore menu', '#menu'],
  ['popular', 'Popular section', 'What are you craving?', 'Find your favorite pizzas, burgers, momos, and more.', 'Explore menu', '#menu'],
  ['features', 'Features section', 'Everything ready for online ordering', 'Browse dishes, plan your order, and choose a convenient way to pay.', '', ''],
  ['options', 'Restaurant options', 'Everything customers need', 'Delivery, pickup, dine-in, reservations, bulk orders, menu, payment, and offers.', 'Order now', '#cart'],
  ['offers', 'Offers section', "Today's food deals", 'Enjoy restaurant deals, convenient pickup, and food for every gathering.', 'View full menu', '#menu'],
  ['menu', 'Menu section', "Amit's Food Hub menu", 'Browse all food categories and add dishes to cart.', '', ''],
  ['about', 'About section', 'Your neighborhood food shop for quick, tasty meals.', "Amit's Food Hub serves fast food favorites from our local shop, with online ordering, table booking, and fresh INR-priced menu options.", '', ''],
  ['reviews', 'Reviews section', 'Customers love the taste', 'See why our customers keep coming back for fresh food.', '', ''],
  ['booking', 'Reservation section', 'Book your table', 'Choose visit time and group size, then we will hold a spot for you.', '', ''],
  ['contact', 'Contact section', "Amit's Food Hub", 'Open daily from 11:00 AM to 11:00 PM for orders, pickup, and fast food cravings.', '', ''],
  ['cart', 'Cart page', 'Cart and checkout', 'Your favorites, one step closer. Review your order and choose how to enjoy it.', 'Continue shopping', '#menu'],
]

function seedDefaultSections() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO site_sections (section_id, label, title, subtitle, button_text, button_href, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const now = new Date().toISOString()
  for (const section of defaultSections) insert.run(...section, now)
}

seedDefaultSections()

// Replace former editor hints only when the restaurant has not customized them.
for (const [id, previous] of [
  ['popular', 'Highlight the most popular food categories on the homepage.'],
  ['features', 'Show customer-friendly ordering features and payment options.'],
  ['offers', 'Promote coupons, pickup convenience, and party orders.'],
  ['reviews', 'Highlight customer trust and food quality.'],
  ['cart', 'Review your food, apply coupon, and place order from a separate cart page.'],
]) {
  db.prepare('UPDATE site_sections SET subtitle = ? WHERE section_id = ? AND subtitle = ?')
    .run(defaultSections.find((section) => section[0] === id)[3], id, previous)
}

const rowToSiteSection = (row) => ({
  id: row.section_id,
  label: row.label,
  title: row.title,
  subtitle: row.subtitle,
  buttonText: row.button_text,
  buttonHref: row.button_href,
  updatedAt: row.updated_at,
  visible: Boolean(row.visible),
})

export function getSiteSections() {
  return db.prepare('SELECT * FROM site_sections ORDER BY rowid').all().map(rowToSiteSection)
}

export function updateSiteSection(section) {
  db.prepare(`
    UPDATE site_sections
    SET title = ?, subtitle = ?, button_text = ?, button_href = ?, updated_at = ?
    WHERE section_id = ?
  `).run(
    String(section.title || '').trim(),
    String(section.subtitle || '').trim(),
    String(section.buttonText || '').trim(),
    String(section.buttonHref || '').trim(),
    new Date().toISOString(),
    String(section.id || '').trim(),
  )
  if (typeof section.visible === 'boolean') db.prepare('UPDATE site_sections SET visible = ? WHERE section_id = ?').run(section.visible ? 1 : 0, String(section.id))
  const row = db.prepare('SELECT * FROM site_sections WHERE section_id = ?').get(String(section.id || '').trim())
  return row ? rowToSiteSection(row) : null
}

export function updateOrderStatus(id, status) {
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id)
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  return row ? rowToOrder(row) : null
}

export function updateReservationStatus(id, status) {
  db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, id)
  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id)
  return row ? rowToReservation(row) : null
}

export function getAdminRecords() {
  return db.prepare('SELECT data FROM admin_records ORDER BY updated_at DESC').all().map((row) => JSON.parse(row.data))
}

export function saveAdminRecord(record) {
  const saved = { ...record, id: String(record.id || randomUUID()), updatedAt: new Date().toISOString() }
  db.prepare(`INSERT INTO admin_records (id, kind, title, data, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, title = excluded.title, data = excluded.data, updated_at = excluded.updated_at`)
    .run(saved.id, String(saved.kind), String(saved.title), JSON.stringify(saved), saved.updatedAt)
  return saved
}

export function deleteAdminRecord(id) {
  return db.prepare('DELETE FROM admin_records WHERE id = ?').run(id).changes > 0
}

export function savePayment(payment) {
  db.prepare('INSERT INTO payments (id, amount, demo) VALUES (?, ?, ?)').run(payment.id, payment.amount, payment.demo ? 1 : 0)
}

export function getPayment(id) {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id)
}

export function getPaymentByTransaction(id) {
  return db.prepare('SELECT * FROM payments WHERE transaction_id = ?').get(id)
}

export function markPaymentVerified(id, transactionId) {
  db.prepare('UPDATE payments SET verified = 1, transaction_id = ? WHERE id = ? AND verified = 0 AND consumed = 0').run(transactionId, id)
}

export function setMenuAvailability(id, available) {
  db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(available ? 1 : 0, id)
  const row = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id)
  return row ? rowToMenuItem(row) : null
}

export function getStoreSettings() {
  return { ...defaultSettings, ...JSON.parse(db.prepare('SELECT data FROM store_settings WHERE id = 1').get().data) }
}

export function updateStoreSettings(settings) {
  const saved = { ...getStoreSettings(), ...settings }
  db.prepare('UPDATE store_settings SET data = ? WHERE id = 1').run(JSON.stringify(saved))
  return saved
}

export function getCoupons(activeOnly = false) {
  return db.prepare(`SELECT * FROM coupons ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY code`).all()
    .map((row) => ({ code: row.code, percent: row.percent, minOrder: row.min_order, active: Boolean(row.active) }))
}

export function saveCoupon(coupon) {
  db.prepare(`INSERT INTO coupons (code, percent, min_order, active) VALUES (?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET percent = excluded.percent, min_order = excluded.min_order, active = excluded.active`)
    .run(coupon.code, coupon.percent, coupon.minOrder, coupon.active ? 1 : 0)
  return coupon
}

export function deleteCoupon(code) {
  return db.prepare('DELETE FROM coupons WHERE code = ?').run(code).changes > 0
}

export function updateOrderPayment(id, paymentStatus) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (!order) return null
  if (order.payment_method === 'Razorpay') throw new Error('Gateway payments are managed through payment verification.')
  db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(paymentStatus, id)
  return rowToOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id))
}

export function deleteSubscriber(id) {
  return db.prepare('DELETE FROM subscribers WHERE id = ?').run(id).changes > 0
}
