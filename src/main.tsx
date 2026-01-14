import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { ThemeProvider } from 'next-themes'
import { ConvexAuthProvider } from '@convex-dev/auth/react'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { convexClient, isConvexConfigured } from '@/adapters/convex'

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
 * App wrapper that conditionally adds Convex providers
 * when VITE_CONVEX_URL is configured
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
  ];

  const appContent = (
    <ThemeProvider
      attribute="class"
      defaultTheme={getInitialTheme()}
      themes={themes}
      enableColorScheme={false}
      storageKey="baseline-theme"
    >
      <App />
    </ThemeProvider>
  );

  // Wrap with ConvexAuthProvider if configured
  // Note: ConvexAuthProvider replaces ConvexProvider - it includes all Convex
  // functionality plus auth. The client prop is required for useAuthActions.
  if (isConvexConfigured()) {
    return (
      <ConvexAuthProvider client={convexClient}>
        {appContent}
      </ConvexAuthProvider>
    );
  }

  return appContent;
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <AppWithProviders />
  </ErrorBoundary>
)
