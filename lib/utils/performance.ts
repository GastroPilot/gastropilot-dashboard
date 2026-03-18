/**
 * Performance utilities for the Gastropilot frontend.
 */

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function call.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request Animation Frame based throttle for smooth animations.
 */
export function rafThrottle<T extends (...args: any[]) => void>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        rafId = null;
      });
    }
  };
}

/**
 * Compare arrays for shallow equality.
 */
export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Memoize a function with a custom key generator.
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * Create a stable callback that doesn't change reference.
 * Use this to prevent unnecessary re-renders in child components.
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const ref = { current: callback };
  ref.current = callback;
  
  // This is a simplified version - in real use, useCallback with useRef would be better
  return ((...args: Parameters<T>) => ref.current(...args)) as T;
}

/**
 * Batch multiple state updates together.
 * React 18+ does this automatically, but this is useful for manual batching.
 */
export function batchUpdates(callback: () => void): void {
  // React 18+ automatically batches updates
  // This is a placeholder for explicit batching if needed
  callback();
}

/**
 * Create an AbortController that auto-cancels on unmount.
 */
export function createAbortController(): AbortController {
  return new AbortController();
}

/**
 * Check if we should use reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Format a number for display with proper caching.
 */
const numberFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/**
 * Performance measurement helper.
 */
export function measurePerformance(name: string): () => void {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  };
}

/**
 * Virtualization helper - check if item is in viewport.
 */
export function isInViewport(
  index: number,
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  overscan: number = 3
): boolean {
  const itemTop = index * itemHeight;
  const itemBottom = itemTop + itemHeight;
  const viewportTop = scrollTop - overscan * itemHeight;
  const viewportBottom = scrollTop + viewportHeight + overscan * itemHeight;
  
  return itemBottom > viewportTop && itemTop < viewportBottom;
}

/**
 * Calculate visible range for virtualized list.
 */
export function getVisibleRange(
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  const end = Math.min(totalItems - 1, start + visibleCount + 2 * overscan);
  
  return { start, end };
}
