export type StoreSettings = {
  restaurantName: string; phone: string; whatsapp: string; address: string; openingHours: string;
  heroImage: string; logoImage: string; deliveryFee: number; taxRate: number;
  acceptingOrders: boolean; acceptingReservations: boolean;
}
export type Coupon = { code: string; percent: number; minOrder: number; active: boolean }
export type Offer = { id: string; kind: string; title: string; description?: string; link?: string; active?: boolean }
export const defaultStoreSettings: StoreSettings = {
  restaurantName: "Amit's Food Hub", phone: '8420431593', whatsapp: '918420431593', address: '',
  openingHours: 'Open daily from 11:00 AM to 11:00 PM', heroImage: '/food-plaza-hero.jpeg', logoImage: '/amit-food-hub-logo.jpeg',
  deliveryFee: 49, taxRate: 5, acceptingOrders: true, acceptingReservations: true,
}
