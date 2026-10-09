import './style.css'

type Category = 'Pizza' | 'Burger' | 'Momo' | 'Chowmein' | 'Maggi' | 'Roll' | 'Chicken' | 'Pasta' | 'Biryani' | 'Sides' | 'Drinks'

type MenuItem = {
  id: number
  name: string
  category: Category
  description: string
  price: number
  rating: number
  image: string
  badge: string
  vegetarian?: boolean
}

type OrderSummary = {
  id: string
  type: string
  name: string
  phone: string
  address: string
  items: string
  total: number
  status?: string
  paymentMethod?: string
  paymentStatus?: string
  transactionId?: string
  createdAt: string
}

type BookingSummary = {
  id: string
  name: string
  email: string
  date: string
  time: string
  guests: string
  occasion: string
  status?: string
  createdAt?: string
}

type SiteSection = {
  id: string
  label: string
  title: string
  subtitle: string
  buttonText: string
  buttonHref: string
  updatedAt?: string
}

type AdminDashboard = {
  menu: MenuItem[]
  orders: OrderSummary[]
  reservations: BookingSummary[]
  subscribers: Array<{ id?: string; email: string; createdAt?: string }>
  sections: SiteSection[]
  stats: {
    menuItems: number
    orders: number
    reservations: number
    subscribers: number
    revenue: number
  }
}

type ApiError = { error?: string }

type CategoryDetail = {
  category: string
  total: number
  veg: number
  nonVeg: number
  averagePrice: number
}

const categories: Category[] = ['Pizza', 'Burger', 'Momo', 'Chowmein', 'Maggi', 'Roll', 'Chicken', 'Pasta', 'Biryani', 'Sides', 'Drinks']
const formatPrice = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available'

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = (await response.json().catch(() => ({}))) as ApiError
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data as T
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="site-header admin-page-header">
    <a class="brand" href="/" aria-label="Back to Amit's Food Hub website"><img src="/amit-food-hub-logo.jpeg" alt="Amit's Food Hub logo" /><span>Amit's Food Hub</span></a>
    <nav class="site-nav admin-page-nav" aria-label="Admin navigation">
      <a href="/">Website</a>
      <a href="/#menu">Menu</a>
      <a href="/#cart">Cart</a>
    </nav>
  </header>

  <main>
    <section class="admin-section admin-page" id="admin" aria-labelledby="admin-title">
      <div class="section-heading wide">
        <div class="admin-title-copy">
          <p class="eyebrow">Owner dashboard</p>
          <h1 id="admin-title">Admin command center</h1>
          <p>Manage Amit's Food Hub menu, live orders, reservations, subscribers, revenue, offers, and customer-facing website sections from one separate protected page.</p>
          <div class="admin-owner-details" aria-label="Admin panel details">
            <article>
              <span>Access</span>
              <strong>Protected owner login</strong>
              <p>Use the registered admin email and private token before viewing business data or changing the menu.</p>
            </article>
            <article>
              <span>Operations</span>
              <strong>Menu, orders, bookings</strong>
              <p>Add new dishes, remove unavailable items, review latest customer orders, and track table reservations.</p>
            </article>
            <article>
              <span>Business view</span>
              <strong>Revenue and growth</strong>
              <p>See total orders, reservation count, subscriber list size, and all-time sales in INR.</p>
            </article>
          </div>
          <div class="admin-quick-notes" aria-label="Shop quick details">
            <span>Open daily 12pm-12am</span>
            <span>Veg and non veg menu</span>
            <span>Pickup and delivery orders</span>
            <span>Coupon AMIT10 active</span>
          </div>
        </div>
        <aside class="admin-hero-panel" aria-label="Admin page summary">
          <span>Live control</span>
          <strong>Amit's Food Hub</strong>
          <p>Separate owner-only page for menu updates, order tracking, bookings, section review, and sales overview.</p>
          <button class="admin-refresh" id="admin-refresh" type="button">Refresh dashboard</button>
        </aside>
      </div>
      <div class="admin-login">
        <div class="admin-login-title">
          <span>Secure access</span>
          <strong>Owner login</strong>
        </div>
        <label><span>Admin email</span><input id="admin-email" type="email" value="karansingh972002@gmail" /></label>
        <label><span>Admin token</span><input id="admin-token" type="password" placeholder="Enter admin token" /></label>
        <button id="admin-login-button" type="button">Load admin panel</button>
      </div>
      <div class="admin-status" id="admin-status">Enter the admin token to view and manage the restaurant.</div>
      <div class="admin-workspace" id="admin-workspace" hidden>
        <section class="admin-section-editor admin-card" aria-labelledby="admin-section-editor-title">
          <div class="admin-card-head">
            <div>
              <h2 id="admin-section-editor-title">Edit website sections</h2>
              <p>Update public section titles, descriptions, and main buttons from admin.</p>
            </div>
            <span id="admin-section-count">0 sections</span>
          </div>
          <div class="admin-section-edit-grid" id="admin-section-edit-grid"></div>
        </section>
        <div class="admin-stats" id="admin-stats"></div>
        <section class="admin-menu-section-panel admin-card" aria-labelledby="admin-menu-section-title">
          <div class="admin-card-head">
            <div>
              <h2 id="admin-menu-section-title">Edit menu section</h2>
              <p>Control the public menu heading, description, and main customer action from admin.</p>
            </div>
            <a href="/#menu">View live menu</a>
          </div>
          <form class="admin-menu-section-form" id="admin-menu-section-form">
            <label><span>Menu title</span><input name="title" required /></label>
            <label><span>Menu description</span><textarea name="subtitle" required></textarea></label>
            <div class="form-row">
              <label><span>Button text</span><input name="buttonText" placeholder="View full menu" /></label>
              <label><span>Button link</span><input name="buttonHref" placeholder="#menu" /></label>
            </div>
            <button type="submit">Save menu section</button>
          </form>
        </section>
        <div class="admin-detail-grid" id="admin-detail-grid">
          <section class="admin-card admin-detail-card">
            <div class="admin-card-head">
              <h3>Menu details</h3>
              <span id="admin-category-count">0 categories</span>
            </div>
            <div class="admin-category-list" id="admin-category-list"></div>
          </section>
          <section class="admin-card admin-detail-card">
            <div class="admin-card-head">
              <h3>Operations details</h3>
              <span>Live summary</span>
            </div>
            <div class="admin-business-details" id="admin-business-details"></div>
          </section>
          <section class="admin-card admin-detail-card">
            <div class="admin-card-head">
              <h3>Subscribers</h3>
              <span id="admin-subscriber-count">0 customers</span>
            </div>
            <div class="admin-list admin-subscriber-list" id="admin-subscriber-list"></div>
          </section>
        </div>
        <div class="admin-grid">
          <form class="admin-menu-form" id="admin-menu-form">
            <h3>Add menu item</h3>
            <p class="admin-form-note">Use this form to update the live customer menu. New dishes appear on the main website after saving.</p>
            <div class="form-row">
              <label><span>Dish name</span><input name="name" required placeholder="Chicken Cheese Roll" /></label>
              <label><span>Category</span><select name="category">${categories.map((category) => `<option value="${category}">${category}</option>`).join('')}</select></label>
            </div>
            <label class="admin-wide"><span>Description</span><textarea name="description" required placeholder="Short dish description"></textarea></label>
            <div class="form-row">
              <label><span>Price in INR</span><input name="price" type="number" min="1" required placeholder="120" /></label>
              <label><span>Badge</span><input name="badge" placeholder="Best seller" /></label>
            </div>
            <label class="admin-wide"><span>Image URL</span><input name="image" placeholder="https://images.unsplash.com/..." /></label>
            <label class="admin-wide admin-file-label"><span>Upload image</span><input name="imageFile" type="file" accept="image/*" /></label>
            <label class="admin-check"><input name="vegetarian" type="checkbox" /> Vegetarian item</label>
            <button type="submit">Add dish</button>
          </form>
          <div class="admin-card">
            <div class="admin-card-head">
              <h3>Menu manager</h3>
              <span id="admin-menu-count">0 dishes</span>
            </div>
            <div class="admin-list" id="admin-menu-list"></div>
          </div>
          <div class="admin-card">
            <div class="admin-card-head">
              <h3>Latest orders</h3>
              <span id="admin-order-count">0 orders</span>
            </div>
            <div class="admin-list" id="admin-order-list"></div>
          </div>
          <div class="admin-card">
            <div class="admin-card-head">
              <h3>Reservations</h3>
              <span id="admin-reservation-count">0 bookings</span>
            </div>
            <div class="admin-list" id="admin-reservation-list"></div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`

const adminEmailInput = document.querySelector<HTMLInputElement>('#admin-email')!
const adminTokenInput = document.querySelector<HTMLInputElement>('#admin-token')!
const adminLoginButton = document.querySelector<HTMLButtonElement>('#admin-login-button')!
const adminRefreshButton = document.querySelector<HTMLButtonElement>('#admin-refresh')!
const adminStatus = document.querySelector<HTMLDivElement>('#admin-status')!
const adminWorkspace = document.querySelector<HTMLDivElement>('#admin-workspace')!
const adminStats = document.querySelector<HTMLDivElement>('#admin-stats')!
const adminMenuForm = document.querySelector<HTMLFormElement>('#admin-menu-form')!
const adminMenuSectionForm = document.querySelector<HTMLFormElement>('#admin-menu-section-form')!
const adminMenuList = document.querySelector<HTMLDivElement>('#admin-menu-list')!
const adminCategoryCount = document.querySelector<HTMLSpanElement>('#admin-category-count')!
const adminCategoryList = document.querySelector<HTMLDivElement>('#admin-category-list')!
const adminBusinessDetails = document.querySelector<HTMLDivElement>('#admin-business-details')!
const adminSubscriberCount = document.querySelector<HTMLSpanElement>('#admin-subscriber-count')!
const adminSubscriberList = document.querySelector<HTMLDivElement>('#admin-subscriber-list')!
const adminOrderList = document.querySelector<HTMLDivElement>('#admin-order-list')!
const adminReservationList = document.querySelector<HTMLDivElement>('#admin-reservation-list')!
const adminMenuCount = document.querySelector<HTMLSpanElement>('#admin-menu-count')!
const adminOrderCount = document.querySelector<HTMLSpanElement>('#admin-order-count')!
const adminReservationCount = document.querySelector<HTMLSpanElement>('#admin-reservation-count')!
const adminSectionEditGrid = document.querySelector<HTMLDivElement>('#admin-section-edit-grid')!
const adminSectionCount = document.querySelector<HTMLSpanElement>('#admin-section-count')!
const toast = document.querySelector<HTMLDivElement>('#toast')!

function showToast(message: string) {
  toast.textContent = message
  toast.classList.add('visible')
  window.setTimeout(() => toast.classList.remove('visible'), 2600)
}

function adminErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Admin action failed. Try again.'
}

async function runAdminAction(button: HTMLButtonElement | null, loadingText: string, action: () => Promise<void>) {
  const originalText = button?.textContent || ''
  if (button) {
    button.disabled = true
    button.textContent = loadingText
  }
  try {
    await action()
  } catch (error) {
    const message = adminErrorMessage(error)
    adminStatus.textContent = message
    showToast(message)
  } finally {
    if (button) {
      button.disabled = false
      button.textContent = originalText
    }
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] || character)
}

function imageFileFrom(data: FormData, fieldName: string) {
  const file = data.get(fieldName)
  return file instanceof File && file.size > 0 ? file : null
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read selected image.'))
    reader.readAsDataURL(file)
  })
}

async function imageValueFrom(data: FormData, urlFieldName = 'image', fileFieldName = 'imageFile') {
  const file = imageFileFrom(data, fileFieldName)
  if (file) return fileToDataUrl(file)
  return String(data.get(urlFieldName) || '')
}

function adminHeaders() {
  return {
    'x-admin-email': adminEmailInput.value.trim().toLowerCase(),
    'x-admin-token': adminTokenInput.value.trim(),
  }
}

function renderMenuSectionEditor(sections: SiteSection[]) {
  const menuSection = sections.find((section) => section.id === 'menu')
  if (!menuSection) return
  adminMenuSectionForm.dataset.sectionId = menuSection.id
  adminMenuSectionForm.querySelector<HTMLInputElement>('[name="title"]')!.value = menuSection.title || ''
  adminMenuSectionForm.querySelector<HTMLTextAreaElement>('[name="subtitle"]')!.value = menuSection.subtitle || ''
  adminMenuSectionForm.querySelector<HTMLInputElement>('[name="buttonText"]')!.value = menuSection.buttonText || ''
  adminMenuSectionForm.querySelector<HTMLInputElement>('[name="buttonHref"]')!.value = menuSection.buttonHref || '#menu'
}
function getCategoryDetails(menu: MenuItem[]) {
  return categories
    .map<CategoryDetail>((category) => {
      const items = menu.filter((item) => item.category === category)
      const totalPrice = items.reduce((sum, item) => sum + Number(item.price || 0), 0)
      return {
        category,
        total: items.length,
        veg: items.filter((item) => item.vegetarian).length,
        nonVeg: items.filter((item) => !item.vegetarian).length,
        averagePrice: items.length ? totalPrice / items.length : 0,
      }
    })
    .filter((detail) => detail.total > 0)
}

function renderAdminDetails(data: AdminDashboard) {
  const categoryDetails = getCategoryDetails(data.menu)
  const vegItems = data.menu.filter((item) => item.vegetarian).length
  const nonVegItems = data.menu.length - vegItems
  const averageOrder = data.orders.length ? data.stats.revenue / data.orders.length : 0
  const lastOrder = data.orders[0]
  const topCategory = categoryDetails.slice().sort((a, b) => b.total - a.total)[0]

  adminCategoryCount.textContent = `${categoryDetails.length} categories`
  adminCategoryList.innerHTML = categoryDetails.length
    ? categoryDetails.map((detail) => `
        <article class="admin-category-detail">
          <strong>${detail.category}</strong>
          <span>${detail.total} items</span>
          <small>Veg ${detail.veg} · Non veg ${detail.nonVeg} · Avg ${formatPrice(detail.averagePrice)}</small>
        </article>
      `).join('')
    : '<p class="empty-state">No category details yet.</p>'

  adminBusinessDetails.innerHTML = `
    <article><span>Veg items</span><strong>${vegItems}</strong><small>Non veg: ${nonVegItems}</small></article>
    <article><span>Average order</span><strong>${formatPrice(averageOrder)}</strong><small>Based on all confirmed orders</small></article>
    <article><span>Top category</span><strong>${topCategory?.category || 'No menu'}</strong><small>${topCategory ? topCategory.total + ' live items' : 'Add menu items first'}</small></article>
    <article><span>Last order</span><strong>${lastOrder ? formatPrice(lastOrder.total) : 'No orders'}</strong><small>${lastOrder ? formatDateTime(lastOrder.createdAt) : 'Waiting for first order'}</small></article>
  `

  adminSubscriberCount.textContent = `${data.subscribers.length} customers`
  adminSubscriberList.innerHTML = data.subscribers.length
    ? data.subscribers.map((subscriber) => `
        <div class="admin-line admin-line-text admin-subscriber-line">
          <div>
            <strong>${escapeHtml(subscriber.email)}</strong>
            <small>Joined ${formatDateTime(subscriber.createdAt)}</small>
          </div>
        </div>
      `).join('')
    : '<p class="empty-state">No subscribers yet.</p>'
}
function renderSectionEditor(sections: SiteSection[]) {
  adminSectionCount.textContent = `${sections.length} sections`
  adminSectionEditGrid.innerHTML = sections.map((section) => `
    <form class="admin-section-edit-card" data-section-id="${section.id}">
      <div class="admin-section-edit-top">
        <span>${escapeHtml(section.label)}</span>
        <button type="submit">Save</button>
      </div>
      <label><span>Title</span><input name="title" value="${escapeHtml(section.title)}" required /></label>
      <label><span>Description</span><textarea name="subtitle">${escapeHtml(section.subtitle)}</textarea></label>
      <div class="form-row">
        <label><span>Button text</span><input name="buttonText" value="${escapeHtml(section.buttonText || '')}" /></label>
        <label><span>Button link</span><input name="buttonHref" value="${escapeHtml(section.buttonHref || '')}" /></label>
      </div>
    </form>
  `).join('')
}

function renderAdminDashboard(data: AdminDashboard) {
  adminWorkspace.hidden = false
  adminStatus.textContent = 'Admin panel loaded. Data is connected to the backend.'
  renderSectionEditor(data.sections || [])
  renderMenuSectionEditor(data.sections || [])
  renderAdminDetails(data)
  adminStats.innerHTML = `
    <article><strong>${data.stats.menuItems}</strong><span>Menu items</span></article>
    <article><strong>${data.stats.orders}</strong><span>Total orders</span></article>
    <article><strong>${data.stats.reservations}</strong><span>Reservations</span></article>
    <article><strong>${formatPrice(data.stats.revenue)}</strong><span>Revenue</span></article>
  `
  adminMenuCount.textContent = `${data.menu.length} dishes`
  adminOrderCount.textContent = `${data.orders.length} orders`
  adminReservationCount.textContent = `${data.reservations.length} bookings`
  adminMenuList.innerHTML = data.menu.length
    ? data.menu.map((item) => `
        <form class="admin-food-edit-line" data-menu-id="${item.id}">
          <div class="admin-food-preview">
            <img src="${item.image}" alt="" />
            <div>
              <strong>${item.name}</strong>
              <small>${item.category} · ${formatPrice(item.price)} · ${item.vegetarian ? 'Veg' : 'Non veg'} · Rating ${item.rating}</small>
            </div>
          </div>
          <div class="admin-food-edit-fields">
            <label><span>Dish name</span><input name="name" value="${escapeHtml(item.name)}" required /></label>
            <label><span>Category</span><select name="category">${categories.map((category) => `<option value="${category}" ${category === item.category ? 'selected' : ''}>${category}</option>`).join('')}</select></label>
            <label><span>Price</span><input name="price" type="number" min="1" value="${item.price}" required /></label>
            <label><span>Rating</span><input name="rating" type="number" min="1" max="5" step="0.1" value="${item.rating}" /></label>
            <label><span>Badge</span><input name="badge" value="${escapeHtml(item.badge)}" /></label>
            <label><span>Image URL</span><input name="image" value="${escapeHtml(item.image)}" /></label>
            <label><span>Upload image</span><input name="imageFile" type="file" accept="image/*" /></label>
            <label class="admin-food-description"><span>Description</span><textarea name="description" required>${escapeHtml(item.description)}</textarea></label>
            <label class="admin-food-check"><input name="vegetarian" type="checkbox" ${item.vegetarian ? 'checked' : ''} /> Veg item</label>
          </div>
          <div class="admin-food-meta">
            <span>ID #${item.id}</span>
            <span>${escapeHtml(item.badge || 'New')}</span>
            <span>${item.image.startsWith('data:') ? 'Uploaded image' : 'Image URL'}</span>
          </div>
          <div class="admin-food-actions">
            <button type="submit">Save food</button>
            <button class="admin-danger-button" type="button" data-admin-delete="${item.id}">Delete</button>
          </div>
        </form>
      `).join('')
    : '<p class="empty-state">No menu items yet.</p>'
  adminOrderList.innerHTML = data.orders.length
    ? data.orders.map((order) => `
        <div class="admin-line admin-line-text admin-detail-line">
          <div>
            <strong>#${order.id} · ${formatPrice(order.total)}</strong>
            <small>${order.type} for ${escapeHtml(order.name)} · ${escapeHtml(order.phone)} · ${order.status || 'Confirmed'}</small>
            <small>${escapeHtml(order.items)}</small>
            <small>Address: ${escapeHtml(order.address || 'Not added')}</small>
            <small>Payment: ${order.paymentMethod || 'Not selected'} · ${order.paymentStatus || 'Pending'}${order.transactionId ? ' · Txn ' + escapeHtml(order.transactionId) : ''}</small>
            <small>Created: ${formatDateTime(order.createdAt)}</small>
          </div>
        </div>
      `).join('')
    : '<p class="empty-state">No orders yet.</p>'
  adminReservationList.innerHTML = data.reservations.length
    ? data.reservations.map((reservation) => `
        <div class="admin-line admin-line-text admin-detail-line">
          <div>
            <strong>${escapeHtml(reservation.name)} · ${reservation.guests} guests</strong>
            <small>${reservation.date} at ${reservation.time} · ${reservation.status || 'Reserved'}</small>
            <small>${escapeHtml(reservation.email)} · ${escapeHtml(reservation.occasion)}</small>
            <small>Created: ${formatDateTime(reservation.createdAt)}</small>
          </div>
        </div>
      `).join('')
    : '<p class="empty-state">No reservations yet.</p>'
}

async function loadAdminDashboard() {
  if (!adminEmailInput.value.trim() || !adminTokenInput.value.trim()) {
    adminStatus.textContent = 'Enter admin email and token first.'
    return
  }
  adminStatus.textContent = 'Loading admin dashboard...'
  try {
    const data = await apiRequest<AdminDashboard>('/api/admin/dashboard', {
      headers: adminHeaders(),
    })
    localStorage.setItem('resto-admin-email', adminEmailInput.value.trim())
    localStorage.setItem('resto-admin-token', adminTokenInput.value.trim())
    renderAdminDashboard(data)
  } catch (error) {
    adminWorkspace.hidden = true
    adminStatus.textContent = error instanceof Error ? error.message : 'Could not load admin panel.'
  }
}

adminEmailInput.value = localStorage.getItem('resto-admin-email') || adminEmailInput.value
adminTokenInput.value = localStorage.getItem('resto-admin-token') || ''
adminLoginButton.addEventListener('click', () => runAdminAction(adminLoginButton, 'Loading...', loadAdminDashboard))
adminRefreshButton.addEventListener('click', () => runAdminAction(adminRefreshButton, 'Refreshing...', loadAdminDashboard))


adminMenuSectionForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null
  await runAdminAction(submitter, 'Saving...', async () => {
    const sectionId = adminMenuSectionForm.dataset.sectionId || 'menu'
    const data = new FormData(adminMenuSectionForm)
    await apiRequest('/api/admin/sections', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        id: sectionId,
        title: String(data.get('title') || ''),
        subtitle: String(data.get('subtitle') || ''),
        buttonText: String(data.get('buttonText') || ''),
        buttonHref: String(data.get('buttonHref') || ''),
      }),
    })
    showToast('Menu section updated.')
    await loadAdminDashboard()
  })
})

adminMenuForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null
  await runAdminAction(submitter, 'Adding...', async () => {
    const data = new FormData(adminMenuForm)
    const payload = {
      name: String(data.get('name')),
      category: String(data.get('category')),
      description: String(data.get('description')),
      price: Number(data.get('price')),
      badge: String(data.get('badge') || 'New'),
      image: await imageValueFrom(data),
      vegetarian: data.get('vegetarian') === 'on',
    }
    await apiRequest('/api/admin/menu', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    })
    adminMenuForm.reset()
    showToast('Dish added to menu.')
    await loadAdminDashboard()
  })
})

adminMenuList.addEventListener('change', async (event) => {
  const input = (event.target as HTMLElement).closest<HTMLInputElement>('input[name="image"], input[name="imageFile"]')
  if (!input) return
  const form = input.closest<HTMLFormElement>('.admin-food-edit-line')
  const preview = form?.querySelector<HTMLImageElement>('.admin-food-preview img')
  if (!preview) return
  if (input.name === 'imageFile') {
    const file = input.files?.[0]
    if (file) preview.src = await fileToDataUrl(file)
    return
  }
  if (input.value.trim()) preview.src = input.value.trim()
})

adminMenuList.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-admin-delete]')
  if (!button) return
  await runAdminAction(button, 'Deleting...', async () => {
    await apiRequest('/api/admin/menu/delete', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ id: Number(button.dataset.adminDelete) }),
    })
    showToast('Dish removed from menu.')
    await loadAdminDashboard()
  })
})

adminMenuList.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.target as HTMLFormElement
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null
  const menuId = form.dataset.menuId
  if (!menuId) return
  await runAdminAction(submitter, 'Saving...', async () => {
    const data = new FormData(form)
    await apiRequest('/api/admin/menu/update', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        id: Number(menuId),
        name: String(data.get('name') || ''),
        category: String(data.get('category') || ''),
        description: String(data.get('description') || ''),
        price: Number(data.get('price')),
        rating: Number(data.get('rating')) || 4.5,
        image: await imageValueFrom(data),
        badge: String(data.get('badge') || 'New'),
        vegetarian: data.get('vegetarian') === 'on',
      }),
    })
    showToast('Food item updated.')
    await loadAdminDashboard()
  })
})


adminSectionEditGrid.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.target as HTMLFormElement
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null
  const sectionId = form.dataset.sectionId
  if (!sectionId) return
  await runAdminAction(submitter, 'Saving...', async () => {
    const data = new FormData(form)
    await apiRequest('/api/admin/sections', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        id: sectionId,
        title: String(data.get('title') || ''),
        subtitle: String(data.get('subtitle') || ''),
        buttonText: String(data.get('buttonText') || ''),
        buttonHref: String(data.get('buttonHref') || ''),
      }),
    })
    showToast('Website section updated.')
    await loadAdminDashboard()
  })
})