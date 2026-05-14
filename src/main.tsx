import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './LanguageContext.tsx'
import { TooltipProvider } from './components/ui/tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </LanguageProvider>
  </StrictMode>,
)
