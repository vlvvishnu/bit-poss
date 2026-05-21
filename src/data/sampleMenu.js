export const SAMPLE_MENU = [
  {
    icon: '🥛',
    name: 'Milkshakes',
    items: [
      { icon: '🍵', name: 'Matcha', price: 249, ingredients: ['Matcha', 'Tapioca Boba'] },
      { icon: '🟣', name: 'Taro', price: 249, ingredients: ['Taro', 'Tapioca Boba'] },
      { icon: '☕', name: 'Tiramisu', price: 249, ingredients: ['Coffee', 'Cream', 'Tapioca Boba'] },
      { icon: '☕', name: 'Cappuccino', price: 249, ingredients: ['Espresso', 'Milk', 'Tapioca Boba'] },
      { icon: '🍫', name: 'Malaysian Milo', price: 249, ingredients: ['Milo', 'Milk', 'Tapioca Boba'] },
      { icon: '🧊', name: 'Vietnamese Cold Coffee', price: 249, ingredients: ['Coffee', 'Condensed Milk', 'Tapioca Boba'] },
      { icon: '🍓', name: 'Strawberry Matcha', price: 275, ingredients: ['Strawberry', 'Matcha', 'Milk', 'Tapioca Boba'] },
      { icon: '🌰', name: 'Hazelnut', price: 249, ingredients: ['Hazelnut', 'Milk', 'Tapioca Boba'] },
      { icon: '🌹', name: 'Rosemilk', price: 249, ingredients: ['Rose Syrup', 'Milk', 'Tapioca Boba'] },
      { icon: '🍓', name: 'Very Berry Strawberry', price: 249, ingredients: ['Strawberry', 'Mixed Berry', 'Tapioca Boba'] },
      { icon: '🍵', name: 'Thai Red Tea', price: 249, ingredients: ['Thai Tea', 'Milk', 'Tapioca Boba'] },
      { icon: '🫐', name: 'Blueberry Milkshake', price: 249, ingredients: ['Blueberry', 'Milk', 'Tapioca Boba'] },
      { icon: '🍓', name: 'Strawberry Milkshake', price: 249, ingredients: ['Strawberry', 'Milk', 'Tapioca Boba'] },
      { icon: '🍒', name: 'Cranberry Milkshake', price: 249, ingredients: ['Cranberry', 'Milk', 'Tapioca Boba'] },
      { icon: '🍫', name: 'Enrique Cocoa', price: 249, ingredients: ['Cocoa', 'Milk', 'Tapioca Boba'] },
      { icon: '☕', name: 'Mylapore Filter Coffee', price: 249, ingredients: ['Filter Coffee Decoction', 'Milk', 'Tapioca Boba'] },
      { icon: '🌹', name: 'Chennai Rose Milk', price: 249, ingredients: ['Rose Syrup', 'Milk', 'Tapioca Boba'] },
    ],
  },
  {
    icon: '🧋',
    name: 'Ice Tea',
    items: [
      { icon: '🫐', name: 'Blueberry Ice Tea', price: 249, ingredients: ['Blueberry', 'Ice Tea', 'Tapioca Boba'] },
      { icon: '🍒', name: 'Cranberry Ice Tea', price: 249, ingredients: ['Cranberry', 'Ice Tea', 'Tapioca Boba'] },
      { icon: '🍓', name: 'Strawberry Ice Tea', price: 249, ingredients: ['Strawberry', 'Ice Tea', 'Tapioca Boba'] },
      { icon: '🍋', name: 'Lemon Ice Tea', price: 249, ingredients: ['Lemon', 'Ice Tea', 'Tapioca Boba'] },
      { icon: '🍈', name: 'Lychee Ice Tea', price: 249, ingredients: ['Lychee', 'Ice Tea', 'Tapioca Boba'] },
      { icon: '🌶️', name: 'Spicy Flamingo', price: 249, ingredients: ['Spicy Guava', 'Mango Poppers', 'Tapioca Boba'] },
      { icon: '🍊', name: 'Yuzu Ginger', price: 249, ingredients: ['Yuzu', 'Ginger', 'Ice Tea', 'Tapioca Boba'] },
      { icon: '💙', name: 'Blue Pea Lemon Tea', price: 249, ingredients: ['Blue Pea Flower', 'Lemon', 'Tapioca Boba'] },
      { icon: '🍐', name: 'Gummy Guava', price: 249, ingredients: ['Guava', 'Ice Tea', 'Tapioca Boba'] },
    ],
  },
  {
    icon: '🍫',
    name: 'Special Thickshakes',
    items: [
      { icon: '🍫', name: 'Cold Milo Shake', price: 249, ingredients: ['Milo', 'Milk', 'Brown Sugar Boba'] },
      { icon: '🍪', name: 'Crumbled Oreo Shake', price: 249, ingredients: ['Oreo', 'Milk', 'Brown Sugar Boba'] },
      { icon: '🍫', name: 'Ferrero Rocher Shake', price: 269, ingredients: ['Ferrero Rocher', 'Chocolate', 'Brown Sugar Boba'] },
    ],
  },
  {
    icon: '⭐',
    name: 'Specials',
    items: [
      { icon: '🥥', name: 'Coconut Cloud Espresso', price: 299, ingredients: ['Coconut Cream', 'Espresso', 'Tapioca Boba'] },
      { icon: '🍮', name: 'Crème Brûlée', price: 269, ingredients: ['Cream', 'Caramel', 'Tapioca Boba'] },
    ],
  },
]

export function sampleMenuItemCount(menu = SAMPLE_MENU) {
  return menu.reduce((sum, category) => sum + category.items.length, 0)
}
