import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useTheme } from './store/useTheme'

useTheme.getState().init()

createRoot(document.getElementById('root')).render(<App />)
