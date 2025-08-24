import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles'
import App from './App.tsx'

// 開發環境下載入 API 測試工具
if (import.meta.env.DEV) {
  import('@/utils/api/test')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
