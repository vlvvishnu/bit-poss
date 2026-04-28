import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────
  user:      null,
  tenantId:  null,
  setUser:   (user)     => set({ user }),
  setTenantId: (id)     => set({ tenantId: id }),

  // ── Menu data ─────────────────────────────────────────────────
  categories: [],
  products:   [],
  setCategories: (cats)  => set({ categories: cats }),
  setProducts:   (prods) => set({ products: prods }),

  // ── Cart ──────────────────────────────────────────────────────
  // cart: { [productId]: { id, name, icon, price, qty } }
  cart: {},
  addToCart: (product) => set(state => {
    const existing = state.cart[product.id]
    return {
      cart: {
        ...state.cart,
        [product.id]: existing
          ? { ...existing, qty: existing.qty + 1 }
          : { id: product.id, name: product.name, icon: product.icon || '', price: Number(product.price), qty: 1 }
      }
    }
  }),
  removeFromCart: (productId) => set(state => {
    const existing = state.cart[productId]
    if (!existing) return state
    if (existing.qty <= 1) {
      const { [productId]: _, ...rest } = state.cart
      return { cart: rest }
    }
    return { cart: { ...state.cart, [productId]: { ...existing, qty: existing.qty - 1 } } }
  }),
  clearCart: () => set({ cart: {} }),
  cartItems: () => Object.values(get().cart),
  cartCount: () => Object.values(get().cart).reduce((s, i) => s + i.qty, 0),
  cartSubtotal: () => Object.values(get().cart).reduce((s, i) => s + i.price * i.qty, 0),

  // ── Order type ────────────────────────────────────────────────
  orderType:   'takeaway', // 'dine' | 'takeaway' | 'stall'
  tableNumber: null,
  tableName:   null,
  setOrderType: (type) => set({ orderType: type, tableNumber: null, tableName: null }),
  setTable:     (num, name) => set({ tableNumber: num, tableName: name }),

  // ── Settings ──────────────────────────────────────────────────
  settings: null,
  setSettings: (s) => set({ settings: s }),

  // ── Toast ─────────────────────────────────────────────────────
  toast: null,
  showToast: (msg, type = 'info') => {
    set({ toast: { msg, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3000)
  },

  // ── Active page ───────────────────────────────────────────────
  page: 'order',
  setPage: (p) => set({ page: p }),
}))
