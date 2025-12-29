export function debug(...args: unknown[]) {
  try {
    if (typeof window === 'undefined') return;
    // Enable debug when in DEV, or when `?e2e=true` is present, or if window.__debug flag set
    if (import.meta.env.DEV || (window.location && window.location.search.includes('e2e=true')) || (window as any).__debug) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  } catch (e) {
    // ignore
  }
}

export function info(...args: unknown[]) {
  // Keep info logs always visible (for now) - these are less noisy
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function warn(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn(...args);
}

export function error(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error(...args);
}
