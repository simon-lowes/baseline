export function debug(...args: unknown[]) {
  try {
    if (typeof window === 'undefined') return;
    // Enable debug in DEV mode only (import.meta.env.DEV is statically replaced at build time)
    if (import.meta.env.DEV || (window as any).__debug) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  } catch (e) {
    /* logger must not throw */
  }
}

export function info(...args: unknown[]) {
  try {
    // Keep info logs always visible (for now) - these are less noisy
    // eslint-disable-next-line no-console
    console.log(...args);
  } catch (e) {
    /* logger must not throw */
  }
}

export function warn(...args: unknown[]) {
  try {
    // eslint-disable-next-line no-console
    console.warn(...args);
  } catch (e) {
    /* logger must not throw */
  }
}

export function error(...args: unknown[]) {
  try {
    // eslint-disable-next-line no-console
    console.error(...args);
  } catch (e) {
    /* logger must not throw */
  }
}
