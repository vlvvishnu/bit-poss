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
  // cart: { [cartKey]: { id, productId, name, icon, price, qty, customization, details } }
  cart: {},
  addToCart: (product) => set(state => {
    const key = product.cartKey || product.id
    const existing = state.cart[key]
    const qty = Math.max(1, Number(product.qty || 1))
    return {
      cart: {
        ...state.cart,
        [key]: existing
          ? { ...existing, qty: existing.qty + 1 }
          : {
              id: key,
              productId: product.productId || product.product_id || product.id,
              name: product.name,
              icon: product.icon || '',
              price: Number(product.price),
              qty,
              customization: product.customization || null,
              details: product.details || [],
            }
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
  updateCartItem: (cartKey, updater) => set(state => {
    const existing = state.cart[cartKey]
    if (!existing) return state
    const updated = updater(existing)
    if (!updated) {
      const { [cartKey]: _, ...rest } = state.cart
      return { cart: rest }
    }
    return { cart: { ...state.cart, [cartKey]: updated } }
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
  page: 'takeaway',
  setPage: (p) => set({ page: p }),
}))
