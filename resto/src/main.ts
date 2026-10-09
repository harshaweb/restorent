import './style.css'
import './mobile.css'
import { apiRequest, escapeHtml, safeImageUrl } from './api'
import { defaultStoreSettings, type StoreSettings, type Coupon, type Offer } from './store'

type Category = string

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

type Cart = Record<number, number>

type OrderSummary = {
  id: string
  type: string
  name: string
  phone: string
  address: string
  items: string
  total: number
  createdAt: string
  paymentMethod?: string
  paymentStatus?: string
  transactionId?: string
}

type BookingSummary = {
  id: string
  name: string
  email: string
  date: string
  time: string
  guests: string
  occasion: string
}

type SiteSection = {
  visible?: boolean
  id: string
  title: string
  subtitle: string
  buttonText?: string
  buttonHref?: string
}

type RazorpayGatewayOrder = {
  id: string
  amount: number
  currency: string
  keyId: string
  demo?: boolean
}

type RazorpayHandlerResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayCheckoutOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; contact: string }
  theme: { color: string }
  handler: (response: RazorpayHandlerResponse) => void
  modal: { ondismiss: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}


let menuItems: MenuItem[] = [
  {
    id: 1,
    name: "Margherita Pizza",
    category: "Pizza",
    description: "Classic pizza with tomato sauce, mozzarella, and herbs.",
    price: 99,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 2,
    name: "Cheese Corn Pizza",
    category: "Pizza",
    description: "Cheesy corn pizza with golden corn and mozzarella.",
    price: 129,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 3,
    name: "Veg Loaded Pizza",
    category: "Pizza",
    description: "Loaded vegetable pizza with peppers, onion, corn, and cheese.",
    price: 149,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1576458088443-04a19bb13da6?auto=format&fit=crop&w=900&q=80",
    badge: "Veg Loaded",
    vegetarian: true
  },
  {
    id: 4,
    name: "Chicken Pizza",
    category: "Pizza",
    description: "Chicken pizza with spiced chicken, sauce, and mozzarella.",
    price: 179,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=900&q=80",
    badge: "Non Veg",
    vegetarian: false
  },
  {
    id: 5,
    name: "Chicken Cheese Pizza",
    category: "Pizza",
    description: "Chicken pizza finished with extra cheese.",
    price: 199,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80",
    badge: "Cheesy",
    vegetarian: false
  },
  {
    id: 6,
    name: "Veg Burger",
    category: "Burger",
    description: "Veg patty burger with lettuce, onion, and house sauce.",
    price: 69,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 7,
    name: "Cheese Burger",
    category: "Burger",
    description: "Veg burger with a melted cheese slice.",
    price: 89,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    badge: "Cheese",
    vegetarian: true
  },
  {
    id: 8,
    name: "Chicken Burger",
    category: "Burger",
    description: "Crispy chicken burger with fresh veggies and sauce.",
    price: 109,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=80",
    badge: "Chicken",
    vegetarian: false
  },
  {
    id: 9,
    name: "Chicken Cheese Burger",
    category: "Burger",
    description: "Chicken burger with cheese and creamy house sauce.",
    price: 129,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    badge: "Best seller",
    vegetarian: false
  },
  {
    id: 10,
    name: "Veg Momo 6 Pc",
    category: "Momo",
    description: "Six steamed veg momos served with spicy dip.",
    price: 60,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 11,
    name: "Chicken Momo 6 Pc",
    category: "Momo",
    description: "Six chicken momos with signature chilli sauce.",
    price: 80,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80",
    badge: "Chicken",
    vegetarian: false
  },
  {
    id: 12,
    name: "Pan Fry Veg Momo 6 Pc",
    category: "Momo",
    description: "Pan-fried veg momos with crispy golden edges.",
    price: 80,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=900&q=80",
    badge: "Pan fried",
    vegetarian: true
  },
  {
    id: 13,
    name: "Pan Fry Chicken Momo 6 Pc",
    category: "Momo",
    description: "Pan-fried chicken momos served hot with dip.",
    price: 100,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80",
    badge: "Pan fried",
    vegetarian: false
  },
  {
    id: 14,
    name: "Veg Chowmein",
    category: "Chowmein",
    description: "Classic veg chowmein tossed with vegetables and sauces.",
    price: 70,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 15,
    name: "Egg Chowmein",
    category: "Chowmein",
    description: "Chowmein tossed with egg, veggies, and sauces.",
    price: 80,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Egg",
    vegetarian: false
  },
  {
    id: 16,
    name: "Double Egg Chowmein",
    category: "Chowmein",
    description: "Chowmein with double egg and vegetables.",
    price: 90,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Double egg",
    vegetarian: false
  },
  {
    id: 17,
    name: "Chicken Chowmein",
    category: "Chowmein",
    description: "Chicken chowmein tossed in street-style sauces.",
    price: 110,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80",
    badge: "Chicken",
    vegetarian: false
  },
  {
    id: 18,
    name: "Chicken Egg Chowmein",
    category: "Chowmein",
    description: "Chicken and egg chowmein with vegetables.",
    price: 120,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Loaded",
    vegetarian: false
  },
  {
    id: 19,
    name: "Classic Maggi",
    category: "Maggi",
    description: "Classic masala Maggi served hot.",
    price: 50,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Classic",
    vegetarian: true
  },
  {
    id: 20,
    name: "Butter Maggi",
    category: "Maggi",
    description: "Masala Maggi cooked with butter.",
    price: 60,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Buttery",
    vegetarian: true
  },
  {
    id: 21,
    name: "Cheese Maggi",
    category: "Maggi",
    description: "Masala Maggi topped with melted cheese.",
    price: 80,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Cheese",
    vegetarian: true
  },
  {
    id: 22,
    name: "Egg Maggi",
    category: "Maggi",
    description: "Masala Maggi with egg.",
    price: 70,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Egg",
    vegetarian: false
  },
  {
    id: 23,
    name: "Chicken Maggi",
    category: "Maggi",
    description: "Masala Maggi with chicken pieces.",
    price: 100,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
    badge: "Chicken",
    vegetarian: false
  },
  {
    id: 24,
    name: "Veg Roll",
    category: "Roll",
    description: "Veg roll wrapped in soft paratha with chutney.",
    price: 60,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 25,
    name: "Egg Roll",
    category: "Roll",
    description: "Egg roll with onion, sauce, and spices.",
    price: 70,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
    badge: "Egg",
    vegetarian: false
  },
  {
    id: 26,
    name: "Double Egg Roll",
    category: "Roll",
    description: "Double egg roll with fresh onions and chutney.",
    price: 80,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
    badge: "Double egg",
    vegetarian: false
  },
  {
    id: 27,
    name: "Paneer Roll",
    category: "Roll",
    description: "Paneer roll with masala filling and chutney.",
    price: 90,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
    badge: "Paneer",
    vegetarian: true
  },
  {
    id: 28,
    name: "Chicken Roll",
    category: "Roll",
    description: "Chicken roll with spiced chicken and onions.",
    price: 100,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
    badge: "Chicken",
    vegetarian: false
  },
  {
    id: 29,
    name: "Chicken Egg Roll",
    category: "Roll",
    description: "Chicken egg roll with sauces and onion.",
    price: 110,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
    badge: "Loaded",
    vegetarian: false
  },
  {
    id: 30,
    name: "Chicken Lollipop 4 Pc",
    category: "Chicken",
    description: "Four spicy chicken lollipops served with dip.",
    price: 120,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=80",
    badge: "Chicken",
    vegetarian: false
  },
  {
    id: 31,
    name: "Chicken Wings 4 Pc",
    category: "Chicken",
    description: "Four crispy chicken wings with house seasoning.",
    price: 120,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=80",
    badge: "Wings",
    vegetarian: false
  },
  {
    id: 32,
    name: "Chicken Popcorn",
    category: "Chicken",
    description: "Bite-sized crispy chicken popcorn.",
    price: 120,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=80",
    badge: "Crispy",
    vegetarian: false
  },
  {
    id: 33,
    name: "Chicken Strips 4 Pc",
    category: "Chicken",
    description: "Four crunchy chicken strips with dip.",
    price: 130,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80",
    badge: "Strips",
    vegetarian: false
  },
  {
    id: 34,
    name: "Crispy Chicken",
    category: "Chicken",
    description: "Crispy fried chicken served hot.",
    price: 140,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=80",
    badge: "Crunchy",
    vegetarian: false
  },
  {
    id: 35,
    name: "Veg Pasta",
    category: "Pasta",
    description: "Creamy veg pasta with herbs and vegetables.",
    price: 90,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 36,
    name: "Cheese Pasta",
    category: "Pasta",
    description: "Pasta tossed in creamy cheese sauce.",
    price: 110,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80",
    badge: "Cheese",
    vegetarian: true
  },
  {
    id: 37,
    name: "Chicken Pasta",
    category: "Pasta",
    description: "Creamy pasta with chicken and herbs.",
    price: 130,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=900&q=80",
    badge: "Chicken",
    vegetarian: false
  },
  {
    id: 38,
    name: "Chicken Biryani",
    category: "Biryani",
    description: "Chicken biryani with aromatic rice, spices, and tender chicken.",
    price: 140,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?auto=format&fit=crop&w=900&q=80",
    badge: "Biryani",
    vegetarian: false
  },
  {
    id: 39,
    name: "Chicken Biryani + Egg",
    category: "Biryani",
    description: "Chicken biryani served with egg, aromatic rice, and spices.",
    price: 160,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?auto=format&fit=crop&w=900&q=80",
    badge: "Egg combo",
    vegetarian: false
  },
  {
    id: 40,
    name: "French Fries",
    category: "Sides",
    description: "Crispy golden French fries.",
    price: 70,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80",
    badge: "Veg",
    vegetarian: true
  },
  {
    id: 43,
    name: "Cold Drink",
    category: "Drinks",
    description: "Chilled soft drink.",
    price: 40,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
    badge: "From ₹40",
    vegetarian: true
  },
  {
    id: 44,
    name: "Water",
    category: "Drinks",
    description: "Packaged drinking water.",
    price: 20,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80",
    badge: "Water",
    vegetarian: true
  },
  {
    id: 45,
    name: "Fresh Lime Soda",
    category: "Drinks",
    description: "Refreshing lemon soda with sweet, salty, or mixed flavor.",
    price: 49,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80",
    badge: "Fresh",
    vegetarian: true
  },
  {
    id: 46,
    name: "Masala Lemonade",
    category: "Drinks",
    description: "Chilled lemonade with Indian masala and mint.",
    price: 59,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?auto=format&fit=crop&w=900&q=80",
    badge: "Cooler",
    vegetarian: true
  },
  {
    id: 47,
    name: "Mango Shake",
    category: "Drinks",
    description: "Thick mango milkshake served chilled.",
    price: 89,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=900&q=80",
    badge: "Popular",
    vegetarian: true
  },
  {
    id: 48,
    name: "Cold Coffee",
    category: "Drinks",
    description: "Creamy cold coffee with a smooth cafe-style finish.",
    price: 99,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
    badge: "Cafe",
    vegetarian: true
  },
  {
    id: 49,
    name: "Oreo Shake",
    category: "Drinks",
    description: "Chocolate Oreo shake with crunchy cookie flavor.",
    price: 109,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80",
    badge: "Best seller",
    vegetarian: true
  },
  {
    id: 50,
    name: "Sweet Lassi",
    category: "Drinks",
    description: "Classic Punjabi-style sweet lassi served chilled.",
    price: 79,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1626201850129-a7df2a97c888?auto=format&fit=crop&w=900&q=80",
    badge: "Classic",
    vegetarian: true
  },
  {
    id: 51,
    name: "Virgin Mojito",
    category: "Drinks",
    description: "Mint, lemon, and soda cooler for a fresh bite.",
    price: 99,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=80",
    badge: "Mocktail",
    vegetarian: true
  },
  {
    id: 52,
    name: "Iced Tea",
    category: "Drinks",
    description: "Light chilled tea with lemon notes.",
    price: 69,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=900&q=80",
    badge: "Chilled",
    vegetarian: true
  }
]

let categories: Array<Category | 'All'> = ['All', 'Pizza', 'Burger', 'Momo', 'Chowmein', 'Maggi', 'Roll', 'Chicken', 'Pasta', 'Biryani', 'Sides', 'Drinks']
let storeSettings: StoreSettings = { ...defaultStoreSettings }
let coupons: Coupon[] = [{ code: 'AMIT10', percent: 10, minOrder: 0, active: true }]
let activeCategory: Category | 'All' = 'All'
let searchTerm = ''
let vegOnly = false
let activeCoupon = ''
const readJson = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

const sanitizeCart = (savedCart: Cart) =>
  Object.fromEntries(
    Object.entries(savedCart && typeof savedCart === 'object' ? savedCart : {})
      .map(([id, quantity]) => [Number(id), Math.min(100, Math.floor(Number(quantity)))])
      .filter(([id, quantity]) => menuItems.some((item) => item.id === id) && Number.isFinite(quantity) && quantity > 0),
  ) as Cart

let cart: Cart = sanitizeCart(readJson<Cart>('resto-cart', {}))
let lastOrder = readJson<OrderSummary | null>('resto-last-order', null)
let lastBooking = readJson<BookingSummary | null>('resto-last-booking', null)
let paymentGatewayReady = false
let paymentTransactionId = ''
let razorpayScriptPromise: Promise<void> | null = null

const saveCart = () => localStorage.setItem('resto-cart', JSON.stringify(cart))
const saveOrder = () => localStorage.setItem('resto-last-order', JSON.stringify(lastOrder))
const saveBooking = () => localStorage.setItem('resto-last-booking', JSON.stringify(lastBooking))


const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price)
const cartItems = () => menuItems.filter((item) => cart[item.id]).map((item) => ({ ...item, quantity: cart[item.id] }))
const subtotal = () => cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0)
const deliveryFee = () => (subtotal() > 0 && selectedOrderType() === 'Delivery' ? storeSettings.deliveryFee : 0)
const discount = () => {
  const coupon = coupons.find((entry) => entry.code === activeCoupon && entry.active && subtotal() >= entry.minOrder)
  return coupon ? subtotal() * coupon.percent / 100 : 0
}
const tax = () => Math.max(0, subtotal() - discount()) * storeSettings.taxRate / 100
const total = () => Math.max(0, subtotal() - discount()) + deliveryFee() + tax()

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="#home" aria-label="Amit's Food Hub home"><img src="/amit-food-hub-logo.jpeg" alt="Amit's Food Hub logo" /><span>Amit's Food Hub</span></a>
    <button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-controls="primary-navigation" aria-expanded="false">Menu</button>
    <nav class="site-nav" id="primary-navigation" aria-label="Primary navigation">
      <a href="#home">Home</a>
      <a href="#menu">Menu</a>
      <a href="#offers">Offers</a>
      <a href="#about">About</a>
      <a href="#reviews">Reviews</a>
      <a href="#booking">Reserve</a>
      <a href="#contact">Contact</a>
      <div class="header-cart-wrap">
        <a class="nav-cart" href="#cart">Cart <span id="nav-cart-count">0</span></a>
        <div class="header-cart-summary" aria-live="polite">
          <div class="header-cart-row"><span>Cart total</span><strong id="header-cart-total">₹0</strong></div>
          <p id="header-cart-note">No items yet</p>
          <div class="header-cart-actions">
            <a href="#menu">Add food</a>
            <a href="#cart">Checkout</a>
          </div>
        </div>
      </div>
    </nav>
  </header>

  <main id="home">
    <section class="hero-section classic-restaurant-hero executive-home-hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">Amit's Food Hub</p>
        <h1 id="hero-title">Fresh food, made fast.</h1>
        <p class="hero-text">Order hot pizza, burgers, momos, rolls, biryani, pasta, chicken, sides, and drinks from one simple local restaurant menu.</p>
        <div class="hero-actions">
          <a class="primary-action" href="#menu">Explore menu</a>
          <a class="secondary-action" href="#cart">Open cart</a>
        </div>
        <div class="hero-search-card" role="search">
          <label><span>Search dishes</span><input id="hero-search" type="search" placeholder="Pizza, burger, momo, biryani" /></label>
          <a href="#menu">Search</a>
        </div>
        <div class="stats hero-trust-row" aria-label="Restaurant highlights">
          <span><strong>4.9</strong> Customer rating</span>
          <span><strong>40+</strong> Menu items</span>
          <span><strong>₹99</strong> Pizza starts</span>
        </div>
      </div>
      <div class="hero-media hero-restaurant-photo">
        <img class="hero-shop-photo" src="/food-plaza-hero.jpeg" alt="Amit's Food Hub shop front" />
        <div class="hero-image-caption">
          <span>Open daily</span>
          <strong>Fast pickup and online ordering</strong>
        </div>
      </div>
    </section>

    <section class="service-band" aria-label="Services">
      <article>
        <div class="service-top"><span>01</span><small>Online ordering</small></div>
        <h3>Order online</h3>
        <p>Add dishes to cart, update quantities, apply coupons, and review totals instantly.</p>
        <ul>
          <li>Live cart total</li>
          <li>Quick checkout</li>
        </ul>
        <a href="#menu">Start order</a>
      </article>
      <article>
        <div class="service-top"><span>02</span><small>Fast service</small></div>
        <h3>Pickup & delivery</h3>
        <p>Choose pickup or delivery while placing your order, with address and phone details saved to the backend.</p>
        <ul>
          <li>Delivery note</li>
          <li>Pickup option</li>
        </ul>
        <a href="#cart">Go to cart</a>
      </article>
      <article>
        <div class="service-top"><span>03</span><small>Menu choice</small></div>
        <h3>Veg & non veg</h3>
        <p>Browse pizza, burger, momo, rolls, biryani, chicken, pasta, sides, drinks, and veg-only choices.</p>
        <ul>
          <li>Veg filter</li>
          <li>All categories</li>
        </ul>
        <a href="#menu">View menu</a>
      </article>
    </section>

    <section class="popular-section" aria-labelledby="popular-title">
      <div class="section-heading wide">
        <div>
          <p class="eyebrow">Popular near you</p>
          <h2 id="popular-title">What are you craving?</h2>
        </div>
        <a class="options-main-action" href="#menu">Explore menu</a>
      </div>
      <div class="popular-grid">
        <a href="#menu" data-popular-category="Pizza"><img src="https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=700&q=80" alt="Pizza" /><strong>Pizza</strong><span>From ₹99</span></a>
        <a href="#menu" data-popular-category="Burger"><img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80" alt="Burger" /><strong>Burger</strong><span>From ₹69</span></a>
        <a href="#menu" data-popular-category="Momo"><img src="https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=700&q=80" alt="Momo" /><strong>Momo</strong><span>From ₹60</span></a>
        <a href="#menu" data-popular-category="Biryani"><img src="https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?auto=format&fit=crop&w=700&q=80" alt="Biryani" /><strong>Biryani</strong><span>From ₹140</span></a>
      </div>
    </section>

    <section class="app-features-section" aria-labelledby="app-features-title">
      <div class="section-heading">
        <p class="eyebrow">Food delivery features</p>
        <h2 id="app-features-title">Everything ready for online ordering</h2>
      </div>
      <div class="app-feature-grid">
        <article><strong>Veg mode</strong><span>Filter vegetarian dishes quickly.</span></article>
        <article><strong>Collections</strong><span>Pizza, rolls, chicken, biryani, and snacks.</span></article>
        <article><strong>Schedule order</strong><span>Add pickup time in checkout notes.</span></article>
        <article><strong>Plan a party</strong><span>Call for bulk orders and combos.</span></article>
        <article><strong>Offers</strong><span>Use AMIT10 for cart savings.</span></article>
        <article><strong>Multiple payments</strong><span>Cash, UPI, card, and bank transfer.</span></article>
      </div>
    </section>

    <section class="restaurant-options" aria-labelledby="restaurant-options-title">
      <div class="section-heading wide">
        <div>
          <p class="eyebrow">Restaurant options</p>
          <h2 id="restaurant-options-title">Everything customers need</h2>
        </div>
        <a class="options-main-action" href="#cart">Order now</a>
      </div>
      <div class="options-grid">
        <article><span>Delivery</span><strong>Home delivery</strong><p>Place your order with address and phone number.</p><a href="#cart">Choose delivery</a></article>
        <article><span>Pickup</span><strong>Takeaway pickup</strong><p>Order online and collect fresh food from the shop.</p><a href="#cart">Choose pickup</a></article>
        <article><span>Dine-in</span><strong>Eat at shop</strong><p>Visit Amit's Food Hub for quick meals and snacks.</p><a href="#contact">Get direction</a></article>
        <article><span>Reservation</span><strong>Book table</strong><p>Reserve a table with only name, date, time, and guests.</p><a href="#booking">Reserve now</a></article>
        <article><span>Bulk</span><strong>Party order</strong><p>Call for bulk pizza, burger, momo, rolls, biryani, and chicken.</p><a href="tel:8420431593">Call shop</a></article>
        <article><span>Menu</span><strong>Veg & non veg</strong><p>Browse all food categories with a veg-only filter.</p><a href="#menu">View menu</a></article>
        <article><span>Payment</span><strong>Cash, UPI, cards</strong><p>Pay conveniently for pickup, delivery, or dine-in orders.</p><a href="#contact">Ask payment</a></article>
        <article><span>Offers</span><strong>Coupon AMIT10</strong><p>Apply coupon code AMIT10 in the cart for instant discount.</p><a href="#offers">See offers</a></article>
      </div>
    </section>

    <section class="feature-strip" id="offers" aria-labelledby="offers-title">
      <div class="section-heading wide">
        <div>
          <p class="eyebrow">Offers</p>
          <h2 id="offers-title">Today's food deals</h2>
        </div>
        <a class="offers-view-all" href="#menu">View full menu</a>
      </div>
      <div class="feature-cards">
        <article class="deal-card deal-card-main">
          <span class="deal-kicker">Best deal</span>
          <strong>AMIT10</strong>
          <p>Get 10% off on your cart. Add dishes, enter the code at checkout, and enjoy instant savings.</p>
          <div class="deal-meta"><span>10% off</span><span>Online orders</span></div>
          <a href="#cart">Apply in cart</a>
        </article>
        <article class="deal-card">
          <span class="deal-kicker">Quick pickup</span>
          <strong>Fast pickup</strong>
          <p>Order online and collect from the shop without waiting in line.</p>
          <div class="deal-meta"><span>Fresh & hot</span><span>Pickup note</span></div>
          <a href="#menu">Order now</a>
        </article>
        <article class="deal-card">
          <span class="deal-kicker">Group orders</span>
          <strong>Party orders</strong>
          <p>Call us for bulk rolls, burgers, pizza, momos, biryani, and snacks.</p>
          <div class="deal-meta"><span>Bulk food</span><span>Call support</span></div>
          <a href="tel:8420431593">Call now</a>
        </article>
      </div>
    </section>

    <section class="menu-section" id="menu" aria-labelledby="menu-title">
      <div class="section-heading wide">
        <div>
          <p class="eyebrow">Interactive menu</p>
          <h2 id="menu-title">Amit's Food Hub menu</h2>
        </div>
        <div class="menu-tools">
          <label class="menu-search">
            <span>Search dishes</span>
            <input id="menu-search" type="search" placeholder="Try pizza, burger, momo" />
          </label>
          <label class="veg-toggle"><input id="veg-toggle" type="checkbox" /> Veg only</label>
        </div>
      </div>
      <div class="category-tabs" role="tablist" aria-label="Menu categories">
        ${categories.map((category) => `<button type="button" class="category-tab ${category === activeCategory ? 'active' : ''}" data-category="${category}">${category}</button>`).join('')}
      </div>
      <div class="menu-grid" id="menu-grid"></div>
    </section>

    <section class="order-section order-section-single" id="cart" aria-labelledby="cart-page-title">
      <div class="cart-page-head"><div><p class="eyebrow">Your cart</p><h2 id="cart-page-title">Cart and checkout</h2><span>Review your food, apply coupon, and place order from a separate cart page.</span></div><a href="#menu">Continue shopping</a></div>
      <aside class="cart-panel cart-shell" aria-live="polite">
        <div class="cart-topline">
          <div class="cart-heading-block">
            <span>Your cart</span>
            <strong id="cart-status">0 items</strong>
            <small>Review dishes before checkout</small>
          </div>
          <a class="cart-add-more" href="#menu">Add more</a>
        </div>
        <div class="cart-mode" role="tablist" aria-label="Cart and checkout options">
          <button class="active" id="cart-tab" type="button" role="tab" aria-selected="true" aria-controls="cart-view" data-cart-view="cart">Cart</button>
          <button id="checkout-tab" type="button" role="tab" aria-selected="false" aria-controls="checkout-view" data-cart-view="checkout">Checkout</button>
        </div>
        <div class="cart-intro-card">
          <span>Your order</span>
          <h3>Cart and checkout</h3>
          <p>Review items, apply coupon, choose payment, and confirm your order from one premium checkout desk.</p>
        </div>
        <div class="cart-view active" id="cart-view">
          <div id="cart-list" class="cart-list"></div>
        <button class="clear-cart" id="clear-cart" type="button">Clear cart</button>
        <div class="coupon-panel">
          <label><span>Coupon</span><input id="coupon-code" placeholder="AMIT10" /></label>
          <button id="apply-coupon" type="button">Apply</button>
        </div>
        <div class="coupon-status" id="coupon-status">No coupon applied</div>
        <div class="totals cart-totals">
          <div><span>Subtotal</span><strong id="subtotal">₹0</strong></div>
          <div><span>Discount</span><strong id="discount">₹0</strong></div>
          <div><span>Delivery</span><strong id="delivery">₹0</strong></div>
          <div><span>Tax</span><strong id="tax">₹0</strong></div>
          <div class="grand-total"><span>Total</span><strong id="total">₹0</strong></div>
        </div>
        <button class="proceed-checkout" id="proceed-checkout" type="button">Proceed to checkout</button>
        </div>
        <div class="cart-view" id="checkout-view">
        <form class="checkout-form" id="checkout-form">
          <div class="form-row">
            <label><span>Name</span><input name="name" autocomplete="name" required placeholder="Your name" /></label>
            <label><span>Phone</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="Mobile number" /></label>
          </div>
          <label><span>Address or pickup note</span><textarea name="address" autocomplete="street-address" placeholder="Delivery address, table note, or pickup time"></textarea></label>
          <fieldset class="fulfillment-options">
            <legend>Order type</legend>
            <label><input type="radio" name="orderType" value="Delivery" checked /> <span>Delivery</span><small>Send to my address</small></label>
            <label><input type="radio" name="orderType" value="Pickup" /> <span>Pickup</span><small>I will collect</small></label>
          </fieldset>
          <fieldset class="payment-options">
            <legend>Payment option</legend>
            <label><input type="radio" name="paymentMethod" value="Cash" checked /> <span>Cash</span><small>Pay with cash on delivery or pickup</small></label>
            <label><input type="radio" name="paymentMethod" value="Razorpay" /> <span>Razorpay Gateway</span><small>Pay online by UPI, card, wallet, or netbanking</small></label>
            <label><input type="radio" name="paymentMethod" value="UPI" /> <span>UPI</span><small>Manual UPI verification</small></label>
            <label><input type="radio" name="paymentMethod" value="Card" /> <span>Card</span><small>Card payment at shop counter</small></label>
            <label><input type="radio" name="paymentMethod" value="Bank transfer" /> <span>Bank transfer</span><small>Transfer to bank after order confirmation</small></label>
          </fieldset>
          <div class="payment-detail" id="payment-detail" aria-live="polite"></div>
          <div class="payment-gateway" id="payment-gateway">
            <div class="payment-gateway-head">
              <div>
                <span>Secure payment gateway</span>
                <strong id="gateway-total">₹0</strong>
              </div>
              <small id="gateway-status">Pending</small>
            </div>
            <div class="gateway-panel active" data-gateway-panel="Cash">
              <p>Confirm cash payment for delivery or pickup. Order will be accepted after this confirmation.</p>
            </div>
            <div class="gateway-panel" data-gateway-panel="Razorpay">
              <p>Pay securely using UPI, cards, wallets, or netbanking through Razorpay Checkout.</p>
            </div>
            <div class="gateway-panel" data-gateway-panel="UPI">
              <p>Pay by UPI at delivery or pickup. The restaurant will confirm receipt.</p>
            </div>
            <div class="gateway-panel" data-gateway-panel="Card">
              <p>Pay by card at the shop counter when you collect your order.</p>
            </div>
            <div class="gateway-panel" data-gateway-panel="Bank transfer">
              <p>Contact the restaurant for bank details. Your payment remains pending until receipt is confirmed.</p>
            </div>
            <button class="verify-payment" id="verify-payment" type="button">Verify payment</button>
          </div>
          <button id="place-order-button" type="submit">Place order</button>
        </form>
        </div>
        <div class="confirmation-card" id="order-summary"></div>
      </aside>
    </section>

    <section class="about-section" id="about" aria-labelledby="about-title">
      <img src="/amit-food-hub-shop.jpeg" alt="Amit's Food Hub storefront" />
      <div>
        <p class="eyebrow">Our kitchen</p>
        <h2 id="about-title">Your neighborhood food shop for quick, tasty meals.</h2>
        <p>Amit's Food Hub serves fast food favorites from our local shop, with online ordering, table booking, and fresh INR-priced menu options.</p>
        <div class="about-list">
          <span>Veg & non veg</span>
          <span>Fresh fast food</span>
          <span>Online orders</span>
          <span>Pickup available</span>
        </div>
      </div>
    </section>

    <section class="reviews-section" id="reviews" aria-labelledby="reviews-title">
      <div class="section-heading">
        <p class="eyebrow">Reviews</p>
        <h2 id="reviews-title">Customers love the taste</h2>
      </div>
      <div class="review-grid">
        <article><strong>4.8/5</strong><p>Fresh burgers, rolls, and momos at pocket-friendly prices.</p><span>- Local customer</span></article>
        <article><strong>Fast service</strong><p>Online ordering is easy and pickup is quick.</p><span>- Regular guest</span></article>
        <article><strong>Good food, good mood</strong><p>The pizza and chowmein combos are perfect for friends.</p><span>- Food lover</span></article>
      </div>
    </section>

    <section class="info-section" aria-label="Shop information">
      <article><span>Opening hours</span><strong>11:00 AM - 11:00 PM</strong><p>Open daily for pickup, dine-in, and delivery orders.</p></article>
      <article><span>Payments</span><strong>Cash, UPI, Cards</strong><p>Pay online at the shop or choose cash on pickup/delivery.</p></article>
      <article><span>Food type</span><strong>Veg & non veg</strong><p>Pizza, burger, momo, rolls, chicken, biryani, drinks, and more.</p></article>
    </section>

    <section class="booking-section" id="booking" aria-labelledby="booking-title">
      <div class="booking-copy">
        <p class="eyebrow">Reservations</p>
        <h2 id="booking-title">Book your table</h2>
        <p>Reserve a table with only the details the restaurant needs to prepare your visit.</p>
        <div class="booking-min-details" aria-label="Minimum reservation details">
          <span>Name</span>
          <span>Phone</span>
          <span>Date</span>
          <span>Time</span>
          <span>Guests</span>
        </div>
        <div class="booking-service-note">
          <strong>Quick confirmation</strong>
          <small>Open daily · Small groups and family tables · Call support available</small>
        </div>
      </div>
      <div class="booking-panel">
        <form class="booking-form" id="booking-form">
          <div class="form-row">
            <label><span>Name</span><input name="bookingName" autocomplete="name" required placeholder="Your name" /></label>
            <label><span>Phone</span><input name="bookingPhone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="Mobile number" /></label>
          </div>
          <div class="form-row">
            <label><span>Date</span><input name="bookingDate" type="date" required /></label>
            <label><span>Time</span><input name="bookingTime" type="time" required /></label>
          </div>
          <div class="form-row">
            <label><span>Guests</span><input name="guests" type="number" min="1" max="18" value="2" required /></label>
            <label><span>Occasion</span><select name="occasion"><option>Casual dining</option><option>Birthday</option><option>Family dinner</option><option>Friends meetup</option><option>Business meal</option></select></label>
          </div>
          <label class="booking-wide"><span>Special note</span><textarea name="bookingNote" placeholder="Seat preference, kids, quick pickup after dine-in, etc."></textarea></label>
          <button type="submit">Reserve table</button>
        </form>
        <div class="confirmation-card booking-confirmation" id="booking-summary"></div>
      </div>
    </section>

    <section class="faq-section" aria-labelledby="faq-title">
      <div class="section-heading">
        <p class="eyebrow">FAQ</p>
        <h2 id="faq-title">Quick answers</h2>
      </div>
      <details open><summary>Can I order online?</summary><p>Yes, add food to cart and place your order from the website.</p></details>
      <details><summary>Do you have veg and non veg?</summary><p>Yes, use the Veg only toggle or browse all menu categories.</p></details>
      <details><summary>Can I reserve a table?</summary><p>Yes, use the reservation form and your booking is saved in the backend.</p></details>
    </section>


    <section class="contact-section" id="contact" aria-labelledby="contact-title">
      <div>
        <p class="eyebrow">Visit us</p>
        <h2 id="contact-title">Amit's Food Hub</h2>
        <p>Open daily from 11:00 AM to 11:00 PM for orders, pickup, and fast food cravings.</p>
        <p id="restaurant-contact-details"></p>
        <div class="contact-actions">
          <a href="tel:8420431593">Call now</a>
          <a href="https://wa.me/918420431593" target="_blank" rel="noreferrer">WhatsApp order</a>
          <a href="#menu">View menu</a>
        </div>
      </div>
      <form class="newsletter-form" id="newsletter-form">
        <label><span>Get offers</span><input name="email" type="email" autocomplete="email" required placeholder="Email address" /></label>
        <button type="submit">Subscribe</button>
      </form>
    </section>
  </main>

  <nav class="mobile-order-bar" aria-label="Mobile ordering">
    <a href="#menu" class="mobile-menu-link">Browse menu</a>
    <a href="#cart" class="mobile-cart-link"><span>Cart <span id="mobile-cart-count">0</span></span><strong id="mobile-cart-total">₹0</strong></a>
  </nav>

  <div class="product-modal" id="product-modal" aria-hidden="true">
    <div class="product-modal-backdrop" data-close-product></div>
    <article class="product-modal-card" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <button class="product-modal-close" type="button" data-close-product aria-label="Close product details">×</button>
      <div id="product-modal-content"></div>
    </article>
  </div>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <footer>
    <strong><img src="/amit-food-hub-logo.jpeg" alt="" /> Amit's Food Hub</strong>
    <div>
      <a href="#menu">Menu</a>
      <a href="#booking">Reserve</a>
      <a href="#contact">Contact</a>
      <a href="#home">Back to top</a>
    </div>
  </footer>
`

const menuGrid = document.querySelector<HTMLDivElement>('#menu-grid')!
const cartList = document.querySelector<HTMLDivElement>('#cart-list')!
const navCartCount = document.querySelector<HTMLSpanElement>('#nav-cart-count')!
const headerCartTotal = document.querySelector<HTMLElement>('#header-cart-total')!
const headerCartNote = document.querySelector<HTMLElement>('#header-cart-note')!
const searchInput = document.querySelector<HTMLInputElement>('#menu-search')!
const heroSearchInput = document.querySelector<HTMLInputElement>('#hero-search')!
const vegToggle = document.querySelector<HTMLInputElement>('#veg-toggle')!
const couponInput = document.querySelector<HTMLInputElement>('#coupon-code')!
const applyCouponButton = document.querySelector<HTMLButtonElement>('#apply-coupon')!
const toast = document.querySelector<HTMLDivElement>('#toast')!
const productModal = document.querySelector<HTMLDivElement>('#product-modal')!
const productModalContent = document.querySelector<HTMLDivElement>('#product-modal-content')!
const orderSummary = document.querySelector<HTMLDivElement>('#order-summary')!
const bookingSummary = document.querySelector<HTMLDivElement>('#booking-summary')!
const clearCartButton = document.querySelector<HTMLButtonElement>('#clear-cart')!
const cartTab = document.querySelector<HTMLButtonElement>('#cart-tab')!
const checkoutTab = document.querySelector<HTMLButtonElement>('#checkout-tab')!
const cartView = document.querySelector<HTMLDivElement>('#cart-view')!
const checkoutView = document.querySelector<HTMLDivElement>('#checkout-view')!
const cartStatus = document.querySelector<HTMLElement>('#cart-status')!
const couponStatus = document.querySelector<HTMLElement>('#coupon-status')!
const proceedCheckoutButton = document.querySelector<HTMLButtonElement>('#proceed-checkout')!
const placeOrderButton = document.querySelector<HTMLButtonElement>('#place-order-button')!
const paymentDetail = document.querySelector<HTMLElement>('#payment-detail')!
const paymentGateway = document.querySelector<HTMLElement>('#payment-gateway')!
const gatewayStatus = document.querySelector<HTMLElement>('#gateway-status')!
const gatewayTotal = document.querySelector<HTMLElement>('#gateway-total')!
const verifyPaymentButton = document.querySelector<HTMLButtonElement>('#verify-payment')!
const checkoutForm = document.querySelector<HTMLFormElement>('#checkout-form')!
function syncPageMode() {
  const isCartPage = window.location.hash === '#cart' || window.location.hash === '#order'
  document.body.classList.toggle('cart-page-active', isCartPage)
  if (window.location.hash === '#order') {
    window.history.replaceState(null, '', '#cart')
  }
}

window.addEventListener('hashchange', syncPageMode)
syncPageMode()

function setCartView(view: 'cart' | 'checkout') {
  const isCheckout = view === 'checkout'
  cartTab.classList.toggle('active', !isCheckout)
  checkoutTab.classList.toggle('active', isCheckout)
  cartTab.setAttribute('aria-selected', String(!isCheckout))
  checkoutTab.setAttribute('aria-selected', String(isCheckout))
  cartView.classList.toggle('active', !isCheckout)
  checkoutView.classList.toggle('active', isCheckout)
}

function selectedPaymentMethod() {
  const selected = checkoutForm.querySelector<HTMLInputElement>('input[name="paymentMethod"]:checked')
  return selected?.value || 'Cash'
}

function selectedOrderType() {
  const selected = checkoutForm.querySelector<HTMLInputElement>('input[name="orderType"]:checked')
  return selected?.value || 'Delivery'
}

function resetPaymentGateway() {
  paymentGatewayReady = false
  paymentTransactionId = ''
  gatewayStatus.textContent = 'Pending'
  gatewayStatus.classList.remove('paid')
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (razorpayScriptPromise) return razorpayScriptPromise
  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'))
    document.head.append(script)
  })
  return razorpayScriptPromise
}

function createRazorpayCheckout(order: RazorpayGatewayOrder, name: string, phone: string) {
  return new Promise<string>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay checkout is unavailable.'))
      return
    }
    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: "Amit's Food Hub",
      description: `Food order payment · ${formatPrice(total())}`,
      order_id: order.id,
      prefill: { name, contact: phone },
      theme: { color: '#ef4f5f' },
      handler: async (response) => {
        try {
          const verification = await apiRequest<{ verified: boolean; transactionId: string }>('/api/payments/razorpay/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          })
          resolve(verification.transactionId || response.razorpay_payment_id)
        } catch (error) {
          reject(error)
        }
      },
      modal: { ondismiss: () => reject(new Error('Payment window closed before completion.')) },
    })
    checkout.open()
  })
}

async function startRazorpayPayment() {
  const name = (checkoutForm.elements.namedItem('name') as HTMLInputElement).value.trim()
  const phone = (checkoutForm.elements.namedItem('phone') as HTMLInputElement).value.trim()
  if (!name) {
    setFieldError(checkoutForm.elements.namedItem('name') as HTMLInputElement, 'Enter your name before payment.')
    return
  }
  if (!/^\+?[0-9 ]{10,15}$/.test(phone)) {
    setFieldError(checkoutForm.elements.namedItem('phone') as HTMLInputElement, 'Enter a valid phone before payment.')
    return
  }

  verifyPaymentButton.disabled = true
  verifyPaymentButton.textContent = 'Opening gateway...'
  try {
    const response = await apiRequest<{ order: RazorpayGatewayOrder }>('/api/payments/razorpay/order', {
      method: 'POST',
      body: JSON.stringify({ type: selectedOrderType(), cartItems: cartItems().map(({ id, quantity }) => ({ id, quantity })), coupon: activeCoupon, name, phone }),
    })
    if (response.order.demo) {
      const verification = await apiRequest<{ transactionId: string }>('/api/payments/razorpay/verify', {
        method: 'POST',
        body: JSON.stringify({ razorpayOrderId: response.order.id, razorpayPaymentId: `DEMO-${response.order.id}` }),
      })
      paymentTransactionId = verification.transactionId
      paymentGatewayReady = true
      gatewayStatus.textContent = 'Demo paid'
      gatewayStatus.classList.add('paid')
      showToast('Demo Razorpay payment verified.')
      updateCheckoutAvailability()
      return
    }
    await loadRazorpayCheckout()
    paymentTransactionId = await createRazorpayCheckout(response.order, name, phone)
    paymentGatewayReady = true
    gatewayStatus.textContent = 'Paid'
    gatewayStatus.classList.add('paid')
    showToast('Razorpay payment verified.')
    updateCheckoutAvailability()
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Payment failed. Try again.')
  } finally {
    verifyPaymentButton.disabled = false
    verifyPaymentButton.textContent = selectedPaymentMethod() === 'Cash' ? 'Confirm payment' : selectedPaymentMethod() === 'Razorpay' ? 'Pay with Razorpay' : 'Confirm pay later'
  }
}

function updatePaymentDetail() {
  const payment = selectedPaymentMethod()
  const orderType = selectedOrderType()
  const details: Record<string, string> = {
    Cash: `Confirm cash payment for ${orderType.toLowerCase()} before placing the order.`,
    Razorpay: `Pay securely online with Razorpay for ${formatPrice(total())}.`,
    UPI: `Pay ${formatPrice(total())} by UPI on delivery or pickup.`,
    Card: `Pay ${formatPrice(total())} by card at the shop counter.`,
    'Bank transfer': `Arrange a bank transfer of ${formatPrice(total())} with the restaurant.`,
  }
  paymentDetail.textContent = details[payment] || details.Cash
  gatewayTotal.textContent = formatPrice(total())
  paymentGateway.querySelectorAll<HTMLElement>('.gateway-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.gatewayPanel === payment)
  })
  verifyPaymentButton.textContent = payment === 'Cash' ? 'Confirm payment' : payment === 'Razorpay' ? 'Pay with Razorpay' : 'Confirm pay later'
}

function updateCheckoutAvailability() {
  const hasItems = cartItems().length > 0
  checkoutTab.disabled = !hasItems
  proceedCheckoutButton.disabled = !hasItems
  placeOrderButton.disabled = !hasItems || !paymentGatewayReady || !storeSettings.acceptingOrders
  if (!storeSettings.acceptingOrders) placeOrderButton.textContent = 'Online orders paused'
  if (!hasItems) setCartView('cart')
}

function showToast(message: string) {
  toast.textContent = message
  toast.classList.add('visible')
  window.setTimeout(() => toast.classList.remove('visible'), 2600)
}

function getSubmitButton(form: HTMLFormElement) {
  return form.querySelector<HTMLButtonElement>('button[type="submit"]')
}

function setButtonLoading(button: HTMLButtonElement | null, loading: boolean, text?: string) {
  if (!button) return
  if (loading) {
    button.dataset.originalText = button.textContent || ''
    button.disabled = true
    if (text) button.textContent = text
    return
  }
  button.disabled = false
  button.textContent = button.dataset.originalText || button.textContent
}



function setText(selector: string, value?: string) {
  const element = document.querySelector<HTMLElement>(selector)
  if (element && value !== undefined) element.textContent = value
}

function setLink(selector: string, text?: string, href?: string) {
  const element = document.querySelector<HTMLAnchorElement>(selector)
  if (!element) return
  if (text) element.textContent = text
  if (href) element.href = href
}

function applySiteSections(sections: SiteSection[]) {
  const selectors: Record<string, string> = { home: '.hero-section', popular: '.popular-section', features: '.app-features-section', options: '.restaurant-options', offers: '#offers', menu: '#menu', about: '#about', reviews: '.reviews-section', booking: '#booking', contact: '#contact', cart: '#cart' }
  for (const section of sections) {
    const element = document.querySelector<HTMLElement>(selectors[section.id] || '[data-unknown-section]')
    if (element) {
      if (section.visible === false) element.style.setProperty('display', 'none', 'important')
      else element.style.removeProperty('display')
      if (['popular', 'features', 'options', 'offers', 'menu', 'reviews'].includes(section.id)) {
        const heading = element.querySelector<HTMLElement>('.section-heading h2')
        let description = element.querySelector<HTMLElement>('[data-section-description]')
        if (!description && heading) {
          description = document.createElement('p')
          description.dataset.sectionDescription = ''
          heading.insertAdjacentElement('afterend', description)
        }
        if (description) description.textContent = section.subtitle
      }
      const buttonSelectors: Record<string,string> = { home: '.primary-action', popular: '.options-main-action', options: '.options-main-action', offers: '.offers-view-all', cart: '.cart-page-head a' }
      let button = element.querySelector<HTMLAnchorElement>(buttonSelectors[section.id] || '[data-section-action]')
      const buttonContainer = element.querySelector('.section-heading') || element.querySelector('h2')?.parentElement
      if (!button && section.buttonText && buttonContainer) {
        button = document.createElement('a')
        button.dataset.sectionAction = ''
        button.className = 'options-main-action'
        buttonContainer.append(button)
      }
      if (button) {
        button.textContent = section.buttonText || ''
        button.href = section.buttonHref || '#menu'
        if (!section.buttonText) button.style.setProperty('display','none','important')
        else button.style.removeProperty('display')
      }
    }
  }
  const byId = Object.fromEntries(sections.map((section) => [section.id, section])) as Record<string, SiteSection>
  setText('#hero-title', byId.home?.title)
  setText('.classic-restaurant-hero .hero-text', byId.home?.subtitle)
  setLink('.classic-restaurant-hero .primary-action', byId.home?.buttonText, byId.home?.buttonHref)
  setText('#popular-title', byId.popular?.title)
  setText('#app-features-title', byId.features?.title)
  setText('#restaurant-options-title', byId.options?.title)
  setLink('.restaurant-options .options-main-action', byId.options?.buttonText, byId.options?.buttonHref)
  setText('#offers-title', byId.offers?.title)
  setLink('#offers .offers-view-all', byId.offers?.buttonText, byId.offers?.buttonHref)
  setText('#menu-title', byId.menu?.title)
  setText('#about-title', byId.about?.title)
  setText('#about-title + p', byId.about?.subtitle)
  setText('#reviews-title', byId.reviews?.title)
  setText('#booking-title', byId.booking?.title)
  setText('#booking-title + p', byId.booking?.subtitle)
  setText('#contact-title', byId.contact?.title)
  setText('#contact-title + p', byId.contact?.subtitle)
  setText('#cart-page-title', byId.cart?.title)
  setText('.cart-page-head span', byId.cart?.subtitle)
  setLink('.cart-page-head a', byId.cart?.buttonText, byId.cart?.buttonHref)
}

async function loadSiteContent() {
  try {
    const data = await apiRequest<{ sections: SiteSection[] }>('/api/site-content')
    applySiteSections(data.sections || [])
  } catch {
    // Keep built-in copy when backend content is unavailable.
  }
}
async function loadMenu() {
  try {
    const data = await apiRequest<{ menu: MenuItem[] }>('/api/menu')
    if (Array.isArray(data.menu)) {
      menuItems = data.menu
      categories = ['All', ...new Set(data.menu.map((item) => item.category))]
      document.querySelector<HTMLElement>('.category-tabs')!.innerHTML = categories.map((category) => `<button type="button" class="category-tab ${category === activeCategory ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')
      if (!categories.includes(activeCategory)) activeCategory = 'All'
      cart = sanitizeCart(cart)
      saveCart()
    }
  } catch (error) {
    showToast(error instanceof Error ? `Backend offline: ${error.message}` : 'Backend offline. Using local menu.')
  }
  renderMenu()
  renderCart()
}

async function loadStoreSettings() {
  try {
    const data = await apiRequest<{ settings: StoreSettings; coupons: Coupon[]; offers: Offer[] }>('/api/store-settings')
    storeSettings = data.settings
    coupons = data.coupons
    document.querySelectorAll<HTMLElement>('.brand > span').forEach((element) => { element.textContent = storeSettings.restaurantName })
    document.querySelectorAll<HTMLImageElement>('.brand > img').forEach((element) => { element.src = safeImageUrl(storeSettings.logoImage) })
    document.querySelector<HTMLImageElement>('.hero-shop-photo')!.src = safeImageUrl(storeSettings.heroImage)
    document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]').forEach((element) => { element.href = 'tel:' + storeSettings.phone.replace(/[^+\d]/g, '') })
    document.querySelectorAll<HTMLAnchorElement>('a[href^="https://wa.me/"]').forEach((element) => { element.href = 'https://wa.me/' + storeSettings.whatsapp.replace(/\D/g, '') })
    document.querySelector<HTMLElement>('#restaurant-contact-details')!.textContent = [storeSettings.openingHours, storeSettings.address].filter(Boolean).join(' · ')
    document.querySelector<HTMLElement>('.hero-copy .eyebrow')!.textContent = storeSettings.restaurantName
    document.querySelector<HTMLElement>('footer strong')!.innerHTML = `<img src="${escapeHtml(safeImageUrl(storeSettings.logoImage))}" alt=""/> ${escapeHtml(storeSettings.restaurantName)}`
    document.title = `${storeSettings.restaurantName} | Restaurant`
    const offersGrid = document.querySelector<HTMLElement>('#offers .feature-cards')
    if (offersGrid) offersGrid.innerHTML = data.offers.length ? data.offers.map((offer) => `<article class="deal-card"><span class="deal-kicker">Restaurant offer</span><strong>${escapeHtml(offer.title)}</strong><p>${escapeHtml(offer.description)}</p><a href="${escapeHtml(offer.link || '#menu')}">View offer</a></article>`).join('') : '<p>No offers available right now.</p>'
    const bookingButton = document.querySelector<HTMLButtonElement>('#booking-form button[type="submit"], #booking-form button')!
    bookingButton.disabled = !storeSettings.acceptingReservations
    if (!storeSettings.acceptingReservations) bookingButton.textContent = 'Reservations paused'
    resetPaymentGateway()
    renderCart()
  } catch {
    // Preserve built-in details when the backend is unavailable.
  }
}

function filteredItems() {
  return menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory
    const matchesVeg = !vegOnly || item.vegetarian
    const text = [item.name, item.description, item.category, item.badge].join(' ').toLowerCase()
    return matchesCategory && matchesVeg && text.includes(searchTerm.toLowerCase())
  })
}

function renderMenu() {
  const items = filteredItems()
  menuGrid.innerHTML = items.length
    ? items.map((item) => `
        <article class="dish-card">
          <div class="dish-photo">
            <img src="${escapeHtml(safeImageUrl(item.image))}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" />
            <span>${escapeHtml(item.badge)}</span>
          </div>
          <div class="dish-body">
            <div class="dish-title">
              <h3>${escapeHtml(item.name)}</h3>
              <strong>${formatPrice(item.price)}</strong>
            </div>
            <p>${escapeHtml(item.description)}</p>
            <div class="dish-meta">
              <span>${escapeHtml(item.category)}</span>
              <span>${item.vegetarian ? 'Vegetarian' : 'Signature'}</span>
              <span>${item.rating.toFixed(1)} rating</span>
            </div>
            <div class="dish-actions">
              <button class="view-dish-button" type="button" data-view="${item.id}">View</button>
              <button type="button" data-add="${item.id}">Add to cart</button>
            </div>
          </div>
        </article>
      `).join('')
    : '<p class="empty-state">No dishes match your search. Try another craving.</p>'
}

function renderOrderSummary() {
  orderSummary.innerHTML = lastOrder
    ? `
        <div class="latest-order-head">
          <span>Latest order</span>
          <strong>Order #${escapeHtml(lastOrder.id)}</strong>
        </div>
        <p>${escapeHtml(lastOrder.type)} for ${escapeHtml(lastOrder.name)}</p>
        <small>${escapeHtml(lastOrder.items)}</small>
        <div class="latest-order-foot">
          <b>${formatPrice(lastOrder.total)}</b>
          <em>Payment: ${escapeHtml(lastOrder.paymentMethod || 'Not selected')} · ${escapeHtml(lastOrder.paymentStatus || 'Confirmed')} · Phone: ${escapeHtml(lastOrder.phone)}</em>
        </div>
        <small>Note: ${escapeHtml(lastOrder.address)}</small>
        ${lastOrder.transactionId ? `<small>Transaction: ${escapeHtml(lastOrder.transactionId)}</small>` : ''}
      `
    : '<p>No confirmed order yet.</p>'
}

function renderBookingSummary() {
  bookingSummary.innerHTML = lastBooking
    ? `
        <span>Latest reservation</span>
        <strong>Booking #${escapeHtml(lastBooking.id)}</strong>
        <p>Table for ${escapeHtml(lastBooking.guests)} on ${escapeHtml(lastBooking.date)} at ${escapeHtml(lastBooking.time)}</p>
        <small>${escapeHtml(lastBooking.name)} · ${escapeHtml(lastBooking.guests)} guests · ${escapeHtml(lastBooking.occasion)}</small>
      `
    : '<p>No reservation submitted yet.</p>'
}

function setFieldError(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, message: string) {
  field.setCustomValidity(message)
  field.reportValidity()
  window.setTimeout(() => field.setCustomValidity(''), 1200)
}

function renderCart() {
  const items = cartItems()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  navCartCount.textContent = String(itemCount)
  headerCartTotal.textContent = formatPrice(total())
  document.querySelector<HTMLElement>('#mobile-cart-count')!.textContent = String(itemCount)
  document.querySelector<HTMLElement>('#mobile-cart-total')!.textContent = formatPrice(total())
  headerCartNote.textContent = itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'} ready for checkout` : 'No items yet'
  cartStatus.textContent = itemCount === 1 ? '1 item' : `${itemCount} items`
  clearCartButton.disabled = itemCount === 0
  couponStatus.textContent = activeCoupon ? `Coupon ${activeCoupon} applied: -${formatPrice(discount())}` : 'No coupon applied'
  cartList.innerHTML = items.length
    ? items.map((item) => `
        <div class="cart-item cart-product">
          <img src="${escapeHtml(safeImageUrl(item.image))}" alt="${escapeHtml(item.name)}" />
          <div class="cart-product-main">
            <div class="cart-line-title">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.category)}</span>
            </div>
            <div class="cart-line-meta">
              <span>${formatPrice(item.price)} each</span>
              <button class="remove-line" type="button" data-remove="${item.id}">Remove</button>
            </div>
          </div>
          <div class="cart-product-side">
            <div class="quantity-controls" aria-label="Quantity controls for ${escapeHtml(item.name)}">
              <button type="button" data-dec="${item.id}" aria-label="Decrease ${escapeHtml(item.name)} quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-inc="${item.id}" aria-label="Increase ${escapeHtml(item.name)} quantity">+</button>
            </div>
            <strong class="line-price">${formatPrice(item.price * item.quantity)}</strong>
          </div>
        </div>
      `).join('')
    : '<div class="empty-cart"><strong>Your cart is empty</strong><p>Add pizza, burger, momo, rolls, or drinks from the menu.</p><a href="#menu">Browse menu</a></div>'

  document.querySelector<HTMLElement>('#subtotal')!.textContent = formatPrice(subtotal())
  document.querySelector<HTMLElement>('#discount')!.textContent = formatPrice(discount())
  document.querySelector<HTMLElement>('#delivery')!.textContent = formatPrice(deliveryFee())
  document.querySelector<HTMLElement>('#tax')!.textContent = formatPrice(tax())
  document.querySelector<HTMLElement>('#total')!.textContent = formatPrice(total())
  updateCheckoutAvailability()
  updatePaymentDetail()
}

let productTrigger: HTMLElement | null = null
function showProduct(id: number) {
  const item = menuItems.find((dish) => dish.id === id)
  if (!item) return
  productTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  productModalContent.innerHTML = `
    <div class="product-modal-photo">
      <img src="${escapeHtml(safeImageUrl(item.image))}" alt="${escapeHtml(item.name)}" />
      <span>${escapeHtml(item.badge)}</span>
    </div>
    <div class="product-modal-body">
      <div class="product-modal-kicker">
        <span>${escapeHtml(item.category)}</span>
        <span>${item.vegetarian ? 'Veg' : 'Non veg'}</span>
      </div>
      <div class="product-modal-title-row">
        <div>
          <h3 id="product-modal-title">${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <strong>${formatPrice(item.price)}</strong>
      </div>
      <div class="product-modal-meta product-modal-meta-premium">
        <span><b>${item.vegetarian ? 'Vegetarian' : 'Signature'}</b><small>Food type</small></span>
        <span><b>${item.rating.toFixed(1)}</b><small>Customer rating</small></span>
        <span><b>Fresh</b><small>Made to order</small></span>
      </div>
      <div class="product-modal-note">
        <strong>Fresh order guarantee</strong>
        <p>Prepared after checkout and packed hot for pickup or delivery.</p>
      </div>
      <div class="product-modal-actions">
        <button type="button" data-modal-add="${item.id}">Add to cart</button>
        <a href="#cart" data-close-product>Go to cart</a>
      </div>
    </div>
  `
  productModal.classList.add('visible')
  productModal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')
  productModal.querySelector<HTMLButtonElement>('.product-modal-close')!.focus()
}

function closeProductModal() {
  productModal.classList.remove('visible')
  productModal.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('modal-open')
  productTrigger?.focus({ preventScroll: true })
}

function addToCart(id: number) {
  if ((cart[id] ?? 0) >= 100) {
    showToast('You can order up to 100 of each dish.')
    return
  }
  cart = { ...cart, [id]: (cart[id] ?? 0) + 1 }
  resetPaymentGateway()
  saveCart()
  renderCart()
  const item = menuItems.find((dish) => dish.id === id)
  showToast(`${item?.name ?? 'Dish'} added to cart`)
}

function updateQuantity(id: number, nextQuantity: number) {
  if (nextQuantity > 100) {
    showToast('You can order up to 100 of each dish.')
    return
  }
  if (nextQuantity <= 0) {
    const { [id]: _removed, ...nextCart } = cart
    cart = nextCart
  } else {
    cart = { ...cart, [id]: nextQuantity }
  }
  resetPaymentGateway()
  saveCart()
  renderCart()
}


heroSearchInput.addEventListener('input', () => {
  searchTerm = heroSearchInput.value
  searchInput.value = searchTerm
  renderMenu()
})

document.querySelector('.popular-grid')?.addEventListener('click', (event) => {
  const link = (event.target as HTMLElement).closest<HTMLElement>('[data-popular-category]')
  if (!link) return
  activeCategory = link.dataset.popularCategory as Category
  document.querySelectorAll('.category-tab').forEach((tab) => tab.classList.remove('active'))
  document.querySelector<HTMLButtonElement>(`.category-tab[data-category="${activeCategory}"]`)?.classList.add('active')
  renderMenu()
})

document.querySelector('.category-tabs')?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-category]')
  if (!button) return
  activeCategory = button.dataset.category as Category | 'All'
  document.querySelectorAll('.category-tab').forEach((tab) => tab.classList.remove('active'))
  button.classList.add('active')
  renderMenu()
})

menuGrid.addEventListener('click', (event) => {
  const viewButton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-view]')
  if (viewButton) {
    showProduct(Number(viewButton.dataset.view))
    return
  }

  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-add]')
  if (!button) return
  addToCart(Number(button.dataset.add))
})

productModal.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const addButton = target.closest<HTMLButtonElement>('[data-modal-add]')
  if (addButton) {
    addToCart(Number(addButton.dataset.modalAdd))
    closeProductModal()
    return
  }

  if (target.closest('[data-close-product]')) {
    closeProductModal()
  }
})

document.addEventListener('keydown', (event) => {
  if (!productModal.classList.contains('visible')) return
  if (event.key === 'Escape') {
    closeProductModal()
  }
  if (event.key === 'Tab') {
    const controls = [...productModal.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')]
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
})

cartTab.addEventListener('click', () => setCartView('cart'))
checkoutTab.addEventListener('click', () => {
  if (!cartItems().length) {
    showToast('Add food to cart before checkout.')
    return
  }
  setCartView('checkout')
})
proceedCheckoutButton.addEventListener('click', () => {
  if (!cartItems().length) {
    showToast('Add food to cart before checkout.')
    return
  }
  setCartView('checkout')
  checkoutForm.querySelector<HTMLInputElement>('input[name="name"]')?.focus()
})
checkoutForm.addEventListener('change', (event) => {
  const target = event.target as HTMLElement
  if (target.closest('input[name="paymentMethod"], input[name="orderType"]')) {
    resetPaymentGateway()
    renderCart()
  }
})

verifyPaymentButton.addEventListener('click', async () => {
  if (!cartItems().length) {
    showToast('Add food to cart before payment.')
    return
  }
  const payment = selectedPaymentMethod()
  if (payment === 'Razorpay') {
    await startRazorpayPayment()
    return
  }

  paymentGatewayReady = true
  paymentTransactionId = ''
  gatewayStatus.textContent = 'Pay later'
  gatewayStatus.classList.remove('paid')
  updateCheckoutAvailability()
  showToast(`${payment} selected. Payment will be confirmed by the restaurant.`)
})

clearCartButton.addEventListener('click', () => {
  cart = {}
  activeCoupon = ''
  couponInput.value = ''
  resetPaymentGateway()
  saveCart()
  renderCart()
  showToast('Cart cleared.')
})

cartList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  const inc = target.closest<HTMLButtonElement>('[data-inc]')
  const dec = target.closest<HTMLButtonElement>('[data-dec]')
  const remove = target.closest<HTMLButtonElement>('[data-remove]')
  if (inc) {
    const id = Number(inc.dataset.inc)
    updateQuantity(id, (cart[id] ?? 0) + 1)
  }
  if (dec) {
    const id = Number(dec.dataset.dec)
    updateQuantity(id, (cart[id] ?? 0) - 1)
  }
  if (remove) {
    const id = Number(remove.dataset.remove)
    updateQuantity(id, 0)
    showToast('Item removed from cart.')
  }
})

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value
  renderMenu()
})

vegToggle.addEventListener('change', () => {
  vegOnly = vegToggle.checked
  renderMenu()
})

applyCouponButton.addEventListener('click', () => {
  const code = couponInput.value.trim().toUpperCase()
  if (!code) {
    activeCoupon = ''
    resetPaymentGateway()
    renderCart()
    showToast('Coupon removed.')
    return
  }
  const coupon = coupons.find((entry) => entry.code === code && entry.active)
  if (!coupon || subtotal() < coupon.minOrder) {
    activeCoupon = ''
    resetPaymentGateway()
    renderCart()
    showToast(coupon ? `Add ${formatPrice(coupon.minOrder)} of food to use this coupon.` : 'This coupon is unavailable.')
    return
  }
  activeCoupon = code
  resetPaymentGateway()
  renderCart()
  showToast(`Coupon ${coupon.code} applied: ${coupon.percent}% off.`)
})

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (!cartItems().length) {
    showToast('Add at least one dish before placing an order.')
    return
  }
  const form = event.currentTarget as HTMLFormElement
  const phone = form.elements.namedItem('phone') as HTMLInputElement
  const name = form.elements.namedItem('name') as HTMLInputElement
  const address = form.elements.namedItem('address') as HTMLTextAreaElement
  if (!name.value.trim()) {
    setFieldError(name, 'Enter your name.')
    return
  }
  if (!/^\+?[0-9 ]{10,15}$/.test(phone.value.trim())) {
    setFieldError(phone, 'Enter a valid 10 digit phone number.')
    return
  }
  const data = new FormData(form)
  const items = cartItems()
  const orderType = String(data.get('orderType') || 'Delivery')
  const addressText = address.value.trim()
  if (orderType === 'Delivery' && !addressText) {
    setFieldError(address, 'Enter delivery address.')
    return
  }
  if (!paymentGatewayReady) {
    showToast('Verify payment before placing the order.')
    return
  }
  const previousButtonText = placeOrderButton.textContent || 'Place order'
  placeOrderButton.disabled = true
  placeOrderButton.textContent = 'Placing order...'
  try {
    const orderPayload = {
      type: orderType,
      name: name.value.trim(),
      phone: phone.value.trim(),
      address: addressText || 'Pickup from Amit\'s Food Hub',
      items: items.map((item) => `${item.quantity} x ${escapeHtml(item.name)}`).join(', '),
      cartItems: items.map(({ id, quantity }) => ({ id, quantity })),
      total: Math.round(total()),
      coupon: activeCoupon,
      paymentMethod: selectedPaymentMethod(),
      paymentStatus: selectedPaymentMethod() === 'Razorpay' ? 'Paid' : 'Pending',
      transactionId: paymentTransactionId,
    }
    const response = await apiRequest<{ order: OrderSummary }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    })
    lastOrder = response.order
    saveOrder()
    showToast(`${escapeHtml(lastOrder.type)} order confirmed. Payment: ${lastOrder.paymentMethod || selectedPaymentMethod()}. Total: ${formatPrice(lastOrder.total)}`)
    resetPaymentGateway()
    cart = {}
    activeCoupon = ''
    couponInput.value = ''
    saveCart()
    renderCart()
    renderOrderSummary()
    form.reset()
    setCartView('cart')
  } catch (error) {
    showToast(error instanceof Error ? `Order failed: ${error.message}` : 'Order failed. Please try again.')
  } finally {
    placeOrderButton.textContent = previousButtonText
    updateCheckoutAvailability()
    updatePaymentDetail()
  }
})

document.querySelector<HTMLFormElement>('#booking-form')!.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const submitButton = getSubmitButton(form)
  const phoneField = form.elements.namedItem('bookingPhone') as HTMLInputElement
  const dateField = form.elements.namedItem('bookingDate') as HTMLInputElement
  const selectedDate = new Date(dateField.value + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (!/^\+?[0-9 ]{10,15}$/.test(phoneField.value.trim())) {
    setFieldError(phoneField, 'Enter a valid 10 digit phone number.')
    return
  }
  if (selectedDate < today) {
    setFieldError(dateField, 'Choose today or a future date.')
    return
  }
  setButtonLoading(submitButton, true, 'Reserving...')
  try {
    const data = new FormData(form)
    const occasion = String(data.get('occasion') || 'Table booking')
    const note = String(data.get('bookingNote') || '').trim()
    const phone = phoneField.value.trim()
    const reservationPayload = {
      name: String(data.get('bookingName')).trim(),
      email: 'guest@amitsfoodhub.local',
      date: String(data.get('bookingDate')),
      time: String(data.get('bookingTime')),
      guests: String(data.get('guests')),
      occasion: note ? occasion + ' · Phone: ' + phone + ' · Note: ' + note : occasion + ' · Phone: ' + phone,
    }
    const response = await apiRequest<{ reservation: BookingSummary }>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationPayload),
    })
    lastBooking = response.reservation
    saveBooking()
    renderBookingSummary()
    showToast(`Table reserved for ${escapeHtml(lastBooking.guests)} on ${escapeHtml(lastBooking.date)} at ${escapeHtml(lastBooking.time)}.`)
    form.reset()
  } catch (error) {
    showToast(error instanceof Error ? `Reservation failed: ${error.message}` : 'Reservation failed. Please try again.')
  } finally {
    setButtonLoading(submitButton, false)
  }
})



document.querySelector<HTMLFormElement>('#newsletter-form')!.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const submitButton = getSubmitButton(form)
  const data = new FormData(form)
  setButtonLoading(submitButton, true, 'Subscribing...')
  try {
    await apiRequest('/api/subscribers', {
      method: 'POST',
      body: JSON.stringify({ email: String(data.get('email')) }),
    })
    showToast('Subscribed. Fresh offers will land in your inbox.')
    form.reset()
  } catch (error) {
    showToast(error instanceof Error ? `Subscribe failed: ${error.message}` : 'Subscribe failed. Please try again.')
  } finally {
    setButtonLoading(submitButton, false)
  }
})


const nav = document.querySelector<HTMLElement>('.site-nav')!
const menuToggle = document.querySelector<HTMLButtonElement>('.menu-toggle')!

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open')
  menuToggle.setAttribute('aria-expanded', String(isOpen))
})

nav.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('a')) {
    closeNavigation()
  }
})

function closeNavigation() {
  nav.classList.remove('open')
  menuToggle.setAttribute('aria-expanded', 'false')
}
window.addEventListener('hashchange', closeNavigation)
document.addEventListener('click', (event) => {
  if (!(event.target as Element).closest('.site-header')) closeNavigation()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    closeNavigation()
    menuToggle.focus()
  }
})

loadSiteContent()
loadStoreSettings()
loadMenu()
renderOrderSummary()
renderBookingSummary()
