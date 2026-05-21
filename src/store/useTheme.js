import { create } from 'zustand'

const FONT_STEPS = [13, 14, 15, 16, 17, 18]
const DEFAULT_FONT_INDEX = 2

export const useTheme = create((set, get) => ({
  dark: false,
  fontIndex: DEFAULT_FONT_INDEX,
  toggle: () => {
    const dark = !get().dark
    set({ dark })
    localStorage.setItem('bite_theme', dark ? 'dark' : 'light')
    applyTheme(dark)
  },
  increaseFont: () => {
    const fontIndex = Math.min(get().fontIndex + 1, FONT_STEPS.length - 1)
    set({ fontIndex })
    localStorage.setItem('bite_font_index', String(fontIndex))
    applyFontSize(fontIndex)
  },
  decreaseFont: () => {
    const fontIndex = Math.max(get().fontIndex - 1, 0)
    set({ fontIndex })
    localStorage.setItem('bite_font_index', String(fontIndex))
    applyFontSize(fontIndex)
  },
  resetFont: () => {
    set({ fontIndex: DEFAULT_FONT_INDEX })
    localStorage.setItem('bite_font_index', String(DEFAULT_FONT_INDEX))
    applyFontSize(DEFAULT_FONT_INDEX)
  },
  init: () => {
    const saved = localStorage.getItem('bite_theme')
    const dark = saved ? saved === 'dark' : false
    const savedFont = Number(localStorage.getItem('bite_font_index'))
    const fontIndex = Number.isFinite(savedFont)
      ? Math.min(Math.max(savedFont, 0), FONT_STEPS.length - 1)
      : DEFAULT_FONT_INDEX
    set({ dark, fontIndex })
    applyTheme(dark)
    applyFontSize(fontIndex)
  },
}))

function applyTheme(dark) {
  const root = document.documentElement
  const themeColor = dark ? '#050505' : '#F9F7F4'
  let themeMeta = document.querySelector('meta[name="theme-color"]')
  if (!themeMeta) {
    themeMeta = document.createElement('meta')
    themeMeta.setAttribute('name', 'theme-color')
    document.head.appendChild(themeMeta)
  }
  themeMeta.setAttribute('content', themeColor)
  if (dark) {
    root.style.setProperty('--bg',     '#050505')
    root.style.setProperty('--bg2',    '#131109')
    root.style.setProperty('--card',   '#1C1916')
    root.style.setProperty('--card2',  '#232019')
    root.style.setProperty('--border', 'rgba(255,255,255,0.07)')
    root.style.setProperty('--border2','rgba(255,255,255,0.12)')
    root.style.setProperty('--text',   '#F5F0E8')
    root.style.setProperty('--text2',  'rgba(245,240,232,0.55)')
    root.style.setProperty('--text3',  'rgba(245,240,232,0.3)')
    root.style.setProperty('--brand-lt2', 'rgba(232,68,10,0.08)')
    root.style.setProperty('--product-cta-divider', '#602E17')
    root.style.setProperty('--product-cta-text', '#D7581A')
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
    root.style.setProperty('--product-cta-divider', 'rgba(215,88,26,0.28)')
    root.style.setProperty('--product-cta-text', '#B44917')
  }
}


export function getFontSizeLabel(fontIndex) {
  const size = FONT_STEPS[fontIndex] || FONT_STEPS[DEFAULT_FONT_INDEX]
  if (fontIndex === DEFAULT_FONT_INDEX) return `Default (${size}px)`
  return `${size}px`
}

function applyFontSize(fontIndex) {
  const size = FONT_STEPS[fontIndex] || FONT_STEPS[DEFAULT_FONT_INDEX]
  document.documentElement.style.setProperty('--app-font-size', `${size}px`)
}
