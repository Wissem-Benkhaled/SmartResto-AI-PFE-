import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import KdsInterface from './KdsInterface.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KdsInterface />
  </StrictMode>,
)
