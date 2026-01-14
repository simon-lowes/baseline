import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { ThemeProvider } from 'next-themes'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { AccessibilityProvider } from './contexts/AccessibilityContext.tsx'
import { ChartPatternDefs } from './components/charts/ChartPatterns.tsx'

import "./main.css"

// Determine initial theme based on system preference
const getInitialTheme = () => {
  const stored = localStorage.getItem('baseline-theme')
  if (stored) return stored

  // Respect system preference for dark/light, default to zinc color
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'zinc-dark' : 'zinc-light'
}

/**
 * App wrapper with theme provider
 * Uses Supabase for authentication and data
 */
function AppWithProviders() {
  const themes = [
    'zinc-light', 'zinc-dark',
    'nature-light', 'nature-dark',
    'rose-light', 'rose-dark',
    'violet-light', 'violet-dark',
    'amber-light', 'amber-dark',
    'indigo-light', 'indigo-dark',
    'cyan-light', 'cyan-dark',
    'orange-light', 'orange-dark',
    'plum-light', 'plum-dark',
    'highcontrast-light', 'highcontrast-dark',
  ];

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={getInitialTheme()}
      themes={themes}
      enableColorScheme={false}
      storageKey="baseline-theme"
    >
      <AccessibilityProvider>
        <ChartPatternDefs />
        <App />
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <AppWithProviders />
  </ErrorBoundary>
)
