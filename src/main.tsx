import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Polices importées ici et non dans index.css : @tailwindcss/postcss inline les @import CSS
// sans réécrire leurs url(./files/…) relatives, et les fichiers .woff2 manquaient au build.
import '@fontsource-variable/geist/index.css'
import '@fontsource-variable/geist-mono/index.css'
import '@fontsource-variable/bricolage-grotesque/index.css'
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
