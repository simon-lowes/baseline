/**
 * React Router Configuration
 *
 * Defines all routes for the application.
 * Uses createBrowserRouter for clean URLs (Vercel handles SPA redirects).
 */

import { createBrowserRouter, Navigate } from 'react-router';
import App from './App';

// Route components will be lazy loaded or use outlet context
// For now, App.tsx handles rendering based on route

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // Index route - redirects based on user state (handled in App)
      { index: true, element: null },
      // Welcome for new users
      { path: 'welcome', element: null },
      // Tracker view
      { path: 'tracker/:trackerId', element: null },
      // Analytics
      { path: 'analytics', element: null },
      { path: 'analytics/:trackerId', element: null },
      // Legal pages
      { path: 'privacy', element: null },
      { path: 'terms', element: null },
      { path: 'help', element: null },
    ],
  },
  // Catch-all redirect to home
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
