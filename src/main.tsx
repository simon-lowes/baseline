import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { ThemeProvider } from 'next-themes'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <ThemeProvider
      attribute="class"
      defaultTheme="zinc"
      themes={['zinc', 'nature', 'rose']}
      enableColorScheme={false}
      storageKey="baseline-theme"
    >
      <App />
    </ThemeProvider>
   </ErrorBoundary>
)
