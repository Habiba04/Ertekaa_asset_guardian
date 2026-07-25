import { useEffect, useState } from 'react'

/**
 * Returns true when the viewport matches the given max-width breakpoint.
 * Used throughout the app to switch multi-column layouts to single-column
 * on tablets/phones, since most screens here use inline JS-driven styles
 * rather than pure CSS.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** True on tablet and phone widths (≤ 860px). Sidebar collapses to off-canvas at this point. */
export function useIsTablet(): boolean {
  return useMediaQuery('(max-width: 860px)')
}

/** True on phone widths (≤ 600px). Two-column grids drop to a single column here. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 600px)')
}
