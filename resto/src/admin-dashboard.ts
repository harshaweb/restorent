import './style.css'
import './admin.css'
import { apiRequest, escapeHtml as h, safeImageUrl } from './api'
import { type StoreSettings, type Coupon, type Offer } from './store'

type Dish = { id: number; name: string; category: string; description: string; price: number; rating: number; image: string; badge: string; vegetarian: boolean; available: boolean }
type Order = { id: string; type: string; name: string; phone: string; address: string; items: string; total: number; status: string; paymentMethod: string; paymentStatus: string; transactionId?: string; createdAt: string }
type Booking = { id: string; name: string; email: string; date: string; time: string; guests: string; occasion: string; status: string; createdAt: string }
type Subscriber = { id: string; email: string; createdAt: string }
type Section = { id: string; label: string; title: string; subtitle: string; buttonText: string; buttonHref: string; visible: boolean }
type Dashboard = { menu: Dish[]; orders: Order[]; reservations: Booking[]; subscribers: Subscriber[]; sections: Section[]; records: Offer[]; settings: StoreSettings; coupons: Coupon[]; stats: { revenue: number; orderValue: number; pendingPayments: number } }
type View = 'overview' | 'menu' | 'orders' | 'reservations' | 'website' | 'offers' | 'customers' | 'settings'
const nav: Array<[View,string]> = [['overview','Overview'],['menu','Menu manager'],['orders','Orders & payments'],['reservations','Reservations'],['website','Website content'],['offers','Offers & coupons'],['customers','Customers'],['settings','Restaurant settings']]
const orderStatuses = ['Confirmed','Preparing','Ready','Out for delivery','Delivered','Completed','Cancelled']
const bookingStatuses = ['Reserved','Confirmed','Seated','Completed','Cancelled']
const defaults = ['Pizza','Burger','Momo','Chowmein','Maggi','Roll','Chicken','Pasta','Biryani','Sides','Drinks']
const money = (amount: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount || 0)
const date = (value: string) => new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})
const options = (values: string[], selected: string) => values.map(value => `<option value="${h(value)}" ${value===selected?'selected':''}>${h(value)}</option>`).join('')
const badge = (value: string) => `<span class="md-badge ${['Paid','Completed','Delivered','Confirmed','Active','Seated'].includes(value)?'good':['Cancelled','Paused'].includes(value)?'quiet':'warm'}">${h(value)}</span>`
const app = document.querySelector<HTMLDivElement>('#app')!
document.body.classList.add('admin-app')
let data: Dashboard | null = null
let view: View = 'overview'
let query = ''
let statusFilter = ''
let editing: number | null = null
let refreshTimer: number | undefined
let lastUpdated = ''
function saved(key: string) { try { return sessionStorage.getItem(key) || '' } catch { return '' } }
let credentials = { email: saved('resto-admin-email'), token: saved('resto-admin-token') }
function remember() { try { sessionStorage.setItem('resto-admin-email',credentials.email); sessionStorage.setItem('resto-admin-token',credentials.token); localStorage.removeItem('resto-admin-token') } catch {} }
function notice(message: string, error = false) {
 const element = document.querySelector<HTMLElement>('#md-notice')!
 element.textContent = message; element.classList.toggle('error',error); element.hidden = false
}
function headers() { return { 'x-admin-email': credentials.email, 'x-admin-token': credentials.token } }
async function mutation(path: string, payload: unknown) { return apiRequest(path,{method:'POST',headers:headers(),body:JSON.stringify(payload)}) }
async function reload(render = true) {
 const token = credentials.token
 const result = await apiRequest<Dashboard>('/api/admin/dashboard',{headers:headers()})
 if (!token || token !== credentials.token) return
 data = result
 lastUpdated = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
 if (!document.querySelector('#md-shell')) renderShell()
 else if (render) renderPanel()
 document.querySelector<HTMLElement>('#md-updated')!.textContent = `Updated ${lastUpdated}`
 document.querySelector<HTMLImageElement>('.md-brand img')!.src = safeImageUrl(data.settings.logoImage)
 document.querySelector<HTMLElement>('.md-brand span')!.innerHTML = `${h(data.settings.restaurantName)}<small>OWNER WORKSPACE</small>`
}
async function action(button: HTMLButtonElement | null, task: () => Promise<void>) {
 const label = button?.textContent
 if (button) { button.disabled = true; button.textContent = 'Saving…' }
 try { await task() } catch(error) { notice(error instanceof Error ? error.message : 'Action failed. Please try again.',true) }
 finally { if (button?.isConnected) { button.disabled=false; button.textContent=label || 'Save' } }
}
function renderLogin() {
 app.innerHTML = `<main class="md-login-screen"><a class="md-back" href="/">← Back to website</a><section class="md-login-card"><img src="/amit-food-hub-logo.jpeg" alt="Amit's Food Hub"/><p class="md-eyebrow">RESTAURANT MANAGEMENT</p><h1>Your restaurant,<br/>under control.</h1><p>Manage dishes, customer orders, table bookings, payments, offers, and your website.</p><form id="md-login"><label>Admin email<input name="email" type="email" autocomplete="username" required value="${h(credentials.email || 'karansingh972002@gmail')}"/></label><label>Private admin token<input name="token" type="password" autocomplete="current-password" required placeholder="Enter your admin token"/></label><button type="submit" class="md-primary">Sign in to dashboard →</button></form><div id="md-notice" class="md-notice" role="status" hidden></div><small>Use the admin email and token configured for your restaurant.</small></section></main>`
}
function renderShell() {
 app.innerHTML = `<div id="md-shell" class="md-shell"><aside class="md-sidebar"><a class="md-brand" href="/"><img src="${h(safeImageUrl(data!.settings.logoImage))}" alt=""/><span>${h(data!.settings.restaurantName)}<small>OWNER WORKSPACE</small></span></a><p class="md-nav-label">MANAGE YOUR RESTAURANT</p><nav aria-label="Dashboard sections">${nav.map(([id,label],index)=>`<button type="button" data-view="${id}" class="${view===id?'active':''}"><span>0${index+1}</span>${label}</button>`).join('')}</nav><div class="md-sidebar-foot"><span class="md-live-dot"></span> Connected to your restaurant<a href="/" target="_blank" rel="noreferrer">Open website ↗</a><button data-logout type="button">Sign out</button></div></aside><main class="md-main"><header class="md-topbar"><span>Restaurant / <strong id="md-breadcrumb">Overview</strong></span><div><small id="md-updated">Updated ${lastUpdated}</small><label class="md-auto"><input id="md-auto-refresh" type="checkbox"/>Live refresh</label><button data-refresh type="button" class="md-outline">↻ Refresh</button><button data-logout type="button" class="md-outline md-mobile-logout">Sign out</button></div></header><div id="md-notice" class="md-notice" role="status" hidden></div><section id="md-panel" class="md-panel"></section></main></div>`
 renderPanel()
}
function sectionTitle(title: string, description: string, actions = '') { return `<div class="md-page-heading"><div><p class="md-eyebrow">OWNER DASHBOARD</p><h1>${title}</h1><p>${description}</p></div>${actions}</div>` }
function toolbar(placeholder: string, filters: string[] = []) { return `<div class="md-toolbar"><label class="md-search"><span>Search</span><input data-search type="search" placeholder="${placeholder}" value="${h(query)}"/></label>${filters.length?`<label class="md-filter">Status<select data-filter><option value="">All statuses</option>${options(filters,statusFilter)}</select></label>`:''}</div>` }
function empty(title: string, description: string) { return `<div class="md-empty"><span>◇</span><h3>${title}</h3><p>${description}</p></div>` }
function matches(...values: unknown[]) { return values.join(' ').toLowerCase().includes(query.toLowerCase()) }
function renderPanel() {
 if (!data) return
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>{button.classList.toggle('active',button.dataset.view===view);button.setAttribute('aria-current',button.dataset.view===view?'page':'false')})
 document.querySelector('#md-breadcrumb')!.textContent = nav.find(entry=>entry[0]===view)![1]
 const panel = document.querySelector<HTMLElement>('#md-panel')!
 if (view==='overview') panel.innerHTML = overview()
 if (view==='menu') panel.innerHTML = sectionTitle('Menu manager','Add dishes, update prices and photos, and pause unavailable food.')+`<div class="md-menu-layout"><section class="md-card">${toolbar('Search dishes or categories')}<div id="md-results"></div></section><section class="md-card md-editor">${dishEditor()}</section></div>`
 if (view==='orders') panel.innerHTML = sectionTitle('Orders & payments','Manage preparation and confirm payments received at the counter.',`<button type="button" data-export="orders" class="md-outline">Export orders ↓</button>`)+toolbar('Search customer, phone, dish, or order ID',orderStatuses)+`<div id="md-results"></div>`
 if (view==='reservations') panel.innerHTML = sectionTitle('Reservations','Confirm bookings, seat guests, and close or cancel reservations.',`<button type="button" data-export="reservations" class="md-outline">Export bookings ↓</button>`)+toolbar('Search guests, notes, or dates',bookingStatuses)+`<div id="md-results"></div>`
 if (view==='website') panel.innerHTML = sectionTitle('Website content','Edit each section and control what customers can see.')+`<div class="md-content-grid">${data.sections.map(section=>`<form class="md-card md-form" data-section="${h(section.id)}"><div class="md-card-title"><h3>${h(section.label)}</h3><label class="md-check"><input name="visible" type="checkbox" ${section.visible?'checked':''}/>Visible</label></div><label>Heading<input name="title" required value="${h(section.title)}"/></label><label>Description<textarea name="subtitle">${h(section.subtitle)}</textarea></label><label>Button text<input name="buttonText" value="${h(section.buttonText)}"/></label><label>Button link<input name="buttonHref" value="${h(section.buttonHref)}" placeholder="#menu"/></label><button type="submit" class="md-primary">Save section</button></form>`).join('')}</div>`
 if (view==='offers') panel.innerHTML = offersPanel()
 if (view==='customers') panel.innerHTML = sectionTitle('Customers & subscribers','Review customer history and manage newsletter subscribers.',`<button type="button" data-export="customers" class="md-outline">Export customers ↓</button>`)+toolbar('Search customer names, phones, or emails')+`<div id="md-results"></div>`
 if (view==='settings') panel.innerHTML = settingsPanel()
 if (['menu','orders','reservations','customers'].includes(view)) renderResults()
}
function overview() {
 const d=data!
 const active=d.orders.filter(order=>!['Delivered','Completed','Cancelled'].includes(order.status))
 const bookings=d.reservations.filter(booking=>!['Completed','Cancelled'].includes(booking.status))
 const cards=[['Paid revenue',money(d.stats.revenue),'Payments received, excluding demos'],['Active orders',String(active.length),'Orders needing attention'],['Pending payments',money(d.stats.pendingPayments),'Unpaid, non-cancelled orders'],['Open bookings',String(bookings.length),'Open table reservations'],['Available dishes',String(d.menu.filter(item=>item.available).length),`${d.menu.length} dishes in your menu`],['Subscribers',String(d.subscribers.length),'Customers subscribed to updates']]
 const values=Array.from({length:7},(_,index)=>{const day=new Date();day.setDate(day.getDate()-(6-index));const label=day.toLocaleDateString('en-IN',{weekday:'short'});const amount=d.orders.filter(order=>order.paymentStatus==='Paid'&&order.status!=='Cancelled'&&new Date(order.createdAt).toDateString()===day.toDateString()).reduce((sum,order)=>sum+order.total,0);return {label,amount}})
 const maximum=Math.max(1,...values.map(value=>value.amount))
 return sectionTitle('A good day starts here.','Your restaurant at a glance. Choose a section to manage the details.',`<span class="md-store-state ${d.settings.acceptingOrders?'open':'closed'}">● ${d.settings.acceptingOrders?'Accepting orders':'Orders paused'}</span>`)+`<div class="md-metrics">${cards.map(([label,value,note])=>`<article class="md-metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('')}</div><div class="md-overview-grid"><section class="md-card"><div class="md-card-title"><div><h2>Payments this week</h2><p>Real payments recorded as received</p></div><strong>${money(values.reduce((sum,value)=>sum+value.amount,0))}</strong></div><div class="md-chart">${values.map(value=>`<div title="${h(value.label)}: ${money(value.amount)}"><small>${money(value.amount)}</small><div class="md-bar-track"><span style="height:${value.amount?Math.max(5,value.amount/maximum*100):0}%"></span></div><strong>${value.label}</strong></div>`).join('')}</div></section><section class="md-card"><h2>Quick actions</h2><p>Keep things moving.</p><div class="md-quick-actions"><button data-view="orders">Review ${active.length} active orders →</button><button data-view="menu">Update your menu →</button><button data-view="reservations">Manage ${bookings.length} open bookings →</button><button data-view="settings">Set ordering availability →</button></div></section></div><section class="md-card"><div class="md-card-title"><div><h2>Latest orders</h2><p>Customer requests, newest first</p></div><button class="md-outline" data-view="orders">View all orders →</button></div>${d.orders.length?orderRows(d.orders.slice(0,5),false):empty('Your first order is on its way','Orders placed on the website will appear here.')}</section>`
}
function dishEditor() {
 const item=data!.menu.find(item=>item.id===editing)
 const categories=[...new Set([...defaults,...data!.menu.map(item=>item.category)])]
 return `<div class="md-card-title"><div><h2>${item?'Edit dish':'Add a new dish'}</h2><p>${item?`Editing #${item.id}`:'Bring something new to the menu.'}</p></div>${item?'<button data-new-dish type="button" class="md-outline">+ New</button>':''}</div><form id="md-dish-form" class="md-form" data-dish="${item?.id||''}"><label>Dish name<input name="name" required value="${h(item?.name)}" placeholder="Chicken cheese roll"/></label><label>Category<input name="category" required list="md-categories" value="${h(item?.category||'Pizza')}"/><datalist id="md-categories">${categories.map(category=>`<option value="${h(category)}"></option>`).join('')}</datalist></label><label>Description<textarea name="description" required placeholder="What makes it delicious?">${h(item?.description)}</textarea></label><div class="md-form-row"><label>Price (₹)<input name="price" type="number" min="1" step="0.01" required value="${item?.price||''}"/></label><label>Rating<input name="rating" type="number" min="1" max="5" step="0.1" value="${item?.rating||4.5}"/></label></div><label>Badge<input name="badge" value="${h(item?.badge||'New')}"/></label><label>Image URL<input name="image" value="${h(item?.image)}" placeholder="https://…"/></label><label>Or upload an image<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"/></label>${item?`<img class="md-dish-preview" src="${h(safeImageUrl(item.image))}" alt="${h(item.name)}"/>`:''}<label class="md-check"><input name="vegetarian" type="checkbox" ${item?.vegetarian?'checked':''}/>Vegetarian dish</label><button class="md-primary" type="submit">${item?'Save dish':'Add dish'}</button></form>`
}
function renderResults() {
 const target=document.querySelector<HTMLElement>('#md-results')
 if (!target||!data)return
 if(view==='menu') {
  const items=data.menu.filter(item=>matches(item.name,item.category))
  target.innerHTML=items.length?`<div class="md-dishes">${items.map(item=>`<article class="md-dish"><img src="${h(safeImageUrl(item.image))}" alt=""/><div><h3>${h(item.name)}</h3><p>${h(item.category)} · ${money(item.price)} · ${item.vegetarian?'Veg':'Non veg'}</p>${badge(item.available?'Active':'Paused')}</div><div class="md-dish-actions"><button type="button" data-edit-dish="${item.id}">Edit</button><button type="button" data-availability="${item.id}">${item.available?'Pause':'Activate'}</button><button type="button" class="md-danger" data-delete-dish="${item.id}">Delete</button></div></article>`).join('')}</div>`:empty('No matching dishes','Try another search, or add your first dish.')
 }
 if(view==='orders') {const rows=data.orders.filter(order=>matches(order.id,order.name,order.phone,order.items)&&(!statusFilter||order.status===statusFilter));target.innerHTML=rows.length?orderRows(rows):empty('No orders here','Orders will appear when customers check out.')}
 if(view==='reservations') {const rows=data.reservations.filter(booking=>matches(booking.name,booking.email,booking.date,booking.occasion)&&(!statusFilter||booking.status===statusFilter));target.innerHTML=rows.length?`<div class="md-operation-list">${rows.map(booking=>`<article class="md-card md-operation"><div class="md-operation-head"><div><h3>${h(booking.name)}</h3><p>${h(booking.date)} at ${h(booking.time)} · ${h(booking.guests)} guests</p></div>${badge(booking.status)}</div><p>${h(booking.email)}</p><p>${h(booking.occasion)}</p><small>Booked ${date(booking.createdAt)}</small><form class="md-operation-controls" data-booking="${h(booking.id)}"><label>Booking status<select name="status">${options(bookingStatuses,booking.status)}</select></label><button type="submit" class="md-primary">Update booking</button></form></article>`).join('')}</div>`:empty('No matching reservations','Customer bookings will appear here.')}
 if(view==='customers')target.innerHTML=customerPanel()
}
function orderRows(rows: Order[], controls = true) {
 return `<div class="md-operation-list">${rows.map(order=>`<article class="md-card md-operation"><div class="md-operation-head"><div><small>${h(order.id)}</small><h3>${h(order.name)} <span>${money(order.total)}</span></h3><p>${h(order.type)} · ${h(order.phone)} · ${date(order.createdAt)}</p></div>${badge(order.status)}</div><p class="md-order-items">${h(order.items)}</p><p>${h(order.address)}</p><div class="md-payment-note">${badge(order.paymentStatus||'Pending')}<span>${h(order.paymentMethod||'Cash')}${order.transactionId?` · ${h(order.transactionId)}`:''}</span></div>${controls?`<form class="md-operation-controls" data-order="${h(order.id)}"><label>Order status<select name="status">${options(orderStatuses,order.status)}</select></label><label>Payment received<select name="paymentStatus" ${order.paymentMethod==='Razorpay'?'disabled':''}>${options(order.paymentMethod==='Razorpay'?[order.paymentStatus]:['Pending','Paid'],order.paymentStatus||'Pending')}</select></label><button type="submit" class="md-primary">Save order</button></form>${order.paymentMethod==='Razorpay'?'<small>Gateway payment status comes from verified transactions.</small>':''}`:''}</article>`).join('')}</div>`
}
function offersPanel() {
 const offers=data!.records.filter(record=>record.kind==='offer')
 const offerForm=(offer?:Offer)=>`<form class="md-card md-form" data-offer="${h(offer?.id)}"><div class="md-card-title"><h3>${offer?'Edit offer':'New offer'}</h3>${offer?`<button type="button" class="md-danger" data-delete-offer="${h(offer.id)}">Delete</button>`:''}</div><label>Title<input name="title" required value="${h(offer?.title)}"/></label><label>Description<textarea name="description">${h(offer?.description)}</textarea></label><label>Customer link<input name="link" value="${h(offer?.link||'#menu')}"/></label><label class="md-check"><input name="active" type="checkbox" ${offer?.active===false?'':'checked'}/>Show on website</label><button type="submit" class="md-primary">Save offer</button></form>`
 const couponForm=(coupon?:Coupon)=>`<form class="md-coupon-row md-form" data-coupon><label>Code<input name="code" required pattern="[A-Za-z0-9_-]{2,30}" value="${h(coupon?.code)}" ${coupon?'readonly':''} placeholder="WELCOME15"/></label><label>Discount %<input name="percent" type="number" min="0.1" max="100" step="0.1" required value="${coupon?.percent||''}"/></label><label>Minimum order ₹<input name="minOrder" type="number" min="0" step="0.01" value="${coupon?.minOrder||0}"/></label><label class="md-check"><input name="active" type="checkbox" ${coupon?.active===false?'':'checked'}/>Active</label><button type="submit" class="md-primary">${coupon?'Save':'Add code'}</button>${coupon?`<button type="button" class="md-danger" data-delete-coupon="${h(coupon.code)}">Delete</button>`:''}</form>`
 return sectionTitle('Offers & coupons','Publish homepage offers and manage discount codes used at checkout.')+`<section class="md-card md-coupons"><h2>Discount codes</h2><p>Discounts apply to food subtotal before tax and delivery.</p>${data!.coupons.map(coupon=>couponForm(coupon)).join('')}${couponForm()}</section><h2 class="md-subheading">Homepage offers</h2><div class="md-content-grid">${offers.map(offer=>offerForm(offer)).join('')}${offerForm()}</div>`
}
function customers() {
 const result=new Map<string,{name:string;phone:string;orders:number;total:number;lastOrder:string}>()
 for(const order of data!.orders) {const customer=result.get(order.phone)||{name:order.name,phone:order.phone,orders:0,total:0,lastOrder:order.createdAt};customer.orders++;if(order.status!=='Cancelled')customer.total+=order.total;result.set(order.phone,customer)}
 return [...result.values()]
}
function customerPanel() {
 const rows=customers().filter(customer=>matches(customer.name,customer.phone))
 const subscribers=data!.subscribers.filter(subscriber=>matches(subscriber.email))
 return `<section class="md-card"><div class="md-card-title"><h2>Customer history</h2><span>${rows.length} customers</span></div>${rows.length?`<div class="md-table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Order value</th><th>Last order</th></tr></thead><tbody>${rows.map(customer=>`<tr><td>${h(customer.name)}</td><td>${h(customer.phone)}</td><td>${customer.orders}</td><td>${money(customer.total)}</td><td>${date(customer.lastOrder)}</td></tr>`).join('')}</tbody></table></div>`:empty('No customer history yet','Customer details are collected when an order is placed.')}</section><section class="md-card md-subscriber-card"><div class="md-card-title"><h2>Newsletter subscribers</h2><button type="button" class="md-outline" data-export="subscribers">Export subscribers ↓</button></div>${subscribers.length?subscribers.map(subscriber=>`<div class="md-subscriber"><div><strong>${h(subscriber.email)}</strong><small>Joined ${date(subscriber.createdAt)}</small></div><button type="button" class="md-danger" data-delete-subscriber="${h(subscriber.id)}">Remove</button></div>`).join(''):empty('No matching subscribers','Newsletter signups will appear here.')}</section>`
}
function settingsPanel() {
 const s=data!.settings
 const text=(name:keyof StoreSettings,label:string)=>`<label>${label}<input name="${name}" ${name==='restaurantName'?'required':''} value="${h(s[name])}"/></label>`
 return sectionTitle('Restaurant settings','Manage shop details, checkout fees, public images, and ordering availability.')+`<form id="md-settings-form" class="md-settings-grid md-form"><section class="md-card"><h2>Restaurant details</h2>${text('restaurantName','Restaurant name')}${text('phone','Phone number')}${text('whatsapp','WhatsApp number with country code')}${text('address','Address')}${text('openingHours','Opening hours')}</section><section class="md-card"><h2>Ordering & reservations</h2><label class="md-toggle"><span><strong>Accept online orders</strong><small>Customers can place new orders</small></span><input name="acceptingOrders" type="checkbox" ${s.acceptingOrders?'checked':''}/></label><label class="md-toggle"><span><strong>Accept table bookings</strong><small>Customers can submit reservations</small></span><input name="acceptingReservations" type="checkbox" ${s.acceptingReservations?'checked':''}/></label><label>Delivery fee (₹)<input name="deliveryFee" type="number" min="0" max="10000" step="0.01" required value="${s.deliveryFee}"/></label><label>Tax rate (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" required value="${s.taxRate}"/></label><p class="md-help">Pickup orders have no delivery fee. Configure Razorpay credentials privately on the backend.</p></section><section class="md-card"><h2>Website images</h2>${text('heroImage','Homepage photo URL or local path')}<img class="md-settings-image" src="${h(safeImageUrl(s.heroImage))}" alt="Homepage preview"/>${text('logoImage','Logo URL or local path')}<img class="md-settings-logo" src="${h(safeImageUrl(s.logoImage))}" alt="Logo preview"/></section><div class="md-settings-save"><button type="submit" class="md-primary">Save restaurant settings</button></div></form>`
}
async function imageFrom(form:FormData) {
 const file=form.get('imageFile')
 if(file instanceof File&&file.size) {
  if(file.size>2*1024*1024)throw new Error('Please use an image smaller than 2 MB.')
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read the image.'));reader.readAsDataURL(file)})
 }
 return String(form.get('image')||'')
}
function exportCsv(kind:string) {
 if(!data)return
 let rows: Array<Record<string,unknown>>=[]
 if(kind==='orders')rows=data.orders
 if(kind==='reservations')rows=data.reservations
 if(kind==='customers')rows=customers()
 if(kind==='subscribers')rows=data.subscribers
 if(!rows.length){notice('There are no records to export yet.');return}
 const keys=Object.keys(rows[0])
 const cell=(value:unknown)=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'}
 const csv='\uFEFF'+[keys.map(cell).join(','),...rows.map(row=>keys.map(key=>cell(row[key])).join(','))].join('\r\n')
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
 const link=document.createElement('a');link.href=url;link.download=`restaurant-${kind}-${new Date().toISOString().slice(0,10)}.csv`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
app.addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(input.matches('[data-search]')){query=input.value;renderResults()}})
app.addEventListener('change',event=>{
 const input=event.target as HTMLInputElement
 if(input.matches('[data-filter]')){statusFilter=input.value;renderResults()}
 if(input.id==='md-auto-refresh') {
  clearInterval(refreshTimer)
  if(input.checked)refreshTimer=window.setInterval(()=>{if(['overview','orders','reservations'].includes(view)&&!document.activeElement?.matches('input,select,textarea'))reload().catch(error=>notice(error.message,true))},30000)
 }
})
app.addEventListener('click',async event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button')
 if(!button)return
 if(button.dataset.view){view=button.dataset.view as View;query='';statusFilter='';renderPanel();return}
 if(button.hasAttribute('data-logout')) {clearInterval(refreshTimer);credentials={email:credentials.email,token:''};remember();data=null;renderLogin();return}
 if(button.hasAttribute('data-refresh')){await action(button,async()=>{await reload();notice('Dashboard refreshed.');});return}
 if(button.dataset.export){exportCsv(button.dataset.export);return}
 if(button.dataset.editDish){editing=Number(button.dataset.editDish);renderPanel();document.querySelector('#md-dish-form')?.scrollIntoView({behavior:'smooth',block:'center'});return}
 if(button.hasAttribute('data-new-dish')){editing=null;renderPanel();return}
 if(button.dataset.availability){await action(button,async()=>{const item=data!.menu.find(item=>item.id===Number(button.dataset.availability))!;await mutation('/api/admin/menu/availability',{id:item.id,available:!item.available});await reload();notice(item.available?'Dish paused on the customer menu.':'Dish available on the customer menu.');});return}
 const deletion=button.dataset.deleteDish?{path:'/api/admin/menu/delete',payload:{id:Number(button.dataset.deleteDish)},message:'Delete this dish from the menu?'}:button.dataset.deleteOffer?{path:'/api/admin/records/delete',payload:{id:button.dataset.deleteOffer},message:'Delete this offer?'}:button.dataset.deleteCoupon?{path:'/api/admin/coupons/delete',payload:{code:button.dataset.deleteCoupon},message:'Delete this discount code?'}:button.dataset.deleteSubscriber?{path:'/api/admin/subscribers/delete',payload:{id:button.dataset.deleteSubscriber},message:'Remove this newsletter subscriber?'}:null
 if(deletion&&window.confirm(deletion.message))await action(button,async()=>{await mutation(deletion.path,deletion.payload);if(button.dataset.deleteDish&&editing===Number(button.dataset.deleteDish))editing=null;await reload();notice('Removed successfully.');})
})
app.addEventListener('submit',async event=>{
 event.preventDefault()
 const form=event.target as HTMLFormElement
 const button=(event as SubmitEvent).submitter as HTMLButtonElement|null
 const fields=new FormData(form)
 if(form.id==='md-login') {await action(button,async()=>{credentials={email:String(fields.get('email')||'').trim(),token:String(fields.get('token')||'').trim()};await reload();remember();notice('Welcome. Your restaurant dashboard is ready.');});return}
 await action(button,async()=>{
  if(form.id==='md-dish-form') {
   const payload={id:Number(form.dataset.dish),name:String(fields.get('name')||''),category:String(fields.get('category')||''),description:String(fields.get('description')||''),price:Number(fields.get('price')),rating:Number(fields.get('rating')),badge:String(fields.get('badge')||'New'),image:await imageFrom(fields),vegetarian:fields.get('vegetarian')==='on'}
   await mutation(form.dataset.dish?'/api/admin/menu/update':'/api/admin/menu',payload)
   await reload();notice('Dish saved to the live menu.');return
  }
  if(form.dataset.order) {
   const order=data!.orders.find(order=>order.id===form.dataset.order)!
   await mutation('/api/admin/orders/status',{id:order.id,status:fields.get('status')})
   if(order.paymentMethod!=='Razorpay')await mutation('/api/admin/orders/payment',{id:order.id,paymentStatus:fields.get('paymentStatus')})
   await reload();notice('Order status and payment record updated.');return
  }
  if(form.dataset.booking) {await mutation('/api/admin/reservations/status',{id:form.dataset.booking,status:fields.get('status')});await reload();notice('Reservation updated.');return}
  if(form.dataset.section) {await mutation('/api/admin/sections',{id:form.dataset.section,title:fields.get('title'),subtitle:fields.get('subtitle'),buttonText:fields.get('buttonText'),buttonHref:fields.get('buttonHref'),visible:fields.get('visible')==='on'});await reload(false);notice('Website section saved.');return}
  if(form.hasAttribute('data-offer')) {await mutation('/api/admin/records',{id:form.dataset.offer||undefined,kind:'offer',title:fields.get('title'),description:fields.get('description'),link:fields.get('link'),active:fields.get('active')==='on'});await reload();notice('Homepage offer saved.');return}
  if(form.hasAttribute('data-coupon')) {await mutation('/api/admin/coupons',{code:fields.get('code'),percent:Number(fields.get('percent')),minOrder:Number(fields.get('minOrder')),active:fields.get('active')==='on'});await reload();notice('Coupon saved for checkout.');return}
  if(form.id==='md-settings-form') {
   const payload:Record<string,unknown>={}
   for(const field of ['restaurantName','phone','whatsapp','address','openingHours','heroImage','logoImage'])payload[field]=fields.get(field)
   for(const field of ['deliveryFee','taxRate'])payload[field]=Number(fields.get(field))
   for(const field of ['acceptingOrders','acceptingReservations'])payload[field]=fields.get(field)==='on'
   await mutation('/api/admin/settings',payload);await reload();notice('Restaurant settings saved.');return
  }
 })
})
renderLogin()
if(credentials.token)reload().catch(()=>{credentials.token='';remember();renderLogin();notice('Please sign in again.',true)})
