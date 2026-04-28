import { create } from 'zustand'

export const useTheme = create((set, get) => ({
  dark: true,
  toggle: () => {
    const dark = !get().dark
    set({ dark })
    localStorage.setItem('bite_theme', dark ? 'dark' : 'light')
    applyTheme(dark)
  },
  init: () => {
    const saved = localStorage.getItem('bite_theme')
    const dark = saved ? saved === 'dark' : true
    set({ dark })
    applyTheme(dark)
  },
}))

function applyTheme(dark) {
  const root = document.documentElement
  if (dark) {
    root.style.setProperty('--bg',     '#0D0B08')
    root.style.setProperty('--bg2',    '#131109')
    root.style.setProperty('--card',   '#1C1916')
    root.style.setProperty('--card2',  '#232019')
    root.style.setProperty('--border', 'rgba(255,255,255,0.07)')
    root.style.setProperty('--border2','rgba(255,255,255,0.12)')
    root.style.setProperty('--text',   '#F5F0E8')
    root.style.setProperty('--text2',  'rgba(245,240,232,0.55)')
    root.style.setProperty('--text3',  'rgba(245,240,232,0.3)')
    root.style.setProperty('--brand-lt2', 'rgba(232,68,10,0.08)')
  } else {
    root.style.setProperty('--bg',     '#F9F7F4')
    root.style.setProperty('--bg2',    '#F0EDE8')
    root.style.setProperty('--card',   '#FFFFFF')
    root.style.setProperty('--card2',  '#F5F2EE')
    root.style.setProperty('--border', 'rgba(26,18,8,0.08)')
    root.style.setProperty('--border2','rgba(26,18,8,0.14)')
    root.style.setProperty('--text',   '#1A1208')
    root.style.setProperty('--text2',  'rgba(26,18,8,0.55)')
    root.style.setProperty('--text3',  'rgba(26,18,8,0.3)')
    root.style.setProperty('--brand-lt2', 'rgba(232,68,10,0.06)')
  }
}
