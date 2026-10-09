import { DatabaseSync } from 'node:sqlite'
import { existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const databasePath = `${here}/resto.sqlite`
const legacyJsonPath = `${here}/db.json`

export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA journal_mode = WAL')
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
`)

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
  if (countMenu.get().count > 0 || !existsSync(legacyJsonPath)) return

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

export function getMenu() {
  return db.prepare('SELECT * FROM menu_items ORDER BY id').all().map(rowToMenuItem)
}

export function addMenuItem(item) {
  const result = db.prepare(`
    INSERT INTO menu_items (name, category, description, price, rating, image, badge, vegetarian)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.name, item.category, item.description, Number(item.price), Number(item.rating) || 4.5, item.image, item.badge || 'New', item.vegetarian ? 1 : 0)
  return rowToMenuItem(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid))
}

export function updateMenuItem(item) {
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
  db.prepare(`
    INSERT INTO orders (id, type, name, phone, address, items, total, status, payment_method, payment_status, transaction_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(order.id, order.type, order.name, order.phone, order.address, order.items, Number(order.total), order.status || 'Confirmed', order.paymentMethod || null, order.paymentStatus || null, order.transactionId || null, order.createdAt)
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
  const menu = getMenu()
  const orders = getOrders()
  const reservations = getReservations()
  const subscribers = getSubscribers()
  return {
    menu,
    orders,
    reservations,
    subscribers,
    sections: getSiteSections(),
    stats: {
      menuItems: menu.length,
      orders: orders.length,
      reservations: reservations.length,
      subscribers: subscribers.length,
      revenue: orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    },
  }
}


const defaultSections = [
  ['home', 'Home hero', "Fresh food, made fast.", 'Order hot pizza, burgers, momos, rolls, biryani, pasta, chicken, sides, and drinks from one simple local restaurant menu.', 'Explore menu', '#menu'],
  ['popular', 'Popular section', 'What are you craving?', 'Highlight the most popular food categories on the homepage.', 'Explore menu', '#menu'],
  ['features', 'Features section', 'Everything ready for online ordering', 'Show customer-friendly ordering features and payment options.', '', ''],
  ['options', 'Restaurant options', 'Everything customers need', 'Delivery, pickup, dine-in, reservations, bulk orders, menu, payment, and offers.', 'Order now', '#cart'],
  ['offers', 'Offers section', "Today's food deals", 'Promote coupons, pickup convenience, and party orders.', 'View full menu', '#menu'],
  ['menu', 'Menu section', "Amit's Food Hub menu", 'Browse all food categories and add dishes to cart.', '', ''],
  ['about', 'About section', 'Your neighborhood food shop for quick, tasty meals.', "Amit's Food Hub serves fast food favorites from our local shop, with online ordering, table booking, and fresh INR-priced menu options.", '', ''],
  ['reviews', 'Reviews section', 'Customers love the taste', 'Highlight customer trust and food quality.', '', ''],
  ['booking', 'Reservation section', 'Book your table', 'Choose visit time and group size, then we will hold a spot for you.', '', ''],
  ['contact', 'Contact section', "Amit's Food Hub", 'Open daily from 11:00 AM to 11:00 PM for orders, pickup, and fast food cravings.', '', ''],
  ['cart', 'Cart page', 'Cart and checkout', 'Review your food, apply coupon, and place order from a separate cart page.', 'Continue shopping', '#menu'],
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

const rowToSiteSection = (row) => ({
  id: row.section_id,
  label: row.label,
  title: row.title,
  subtitle: row.subtitle,
  buttonText: row.button_text,
  buttonHref: row.button_href,
  updatedAt: row.updated_at,
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
  return db.prepare('SELECT * FROM site_sections WHERE section_id = ?').get(String(section.id || '').trim())
}
