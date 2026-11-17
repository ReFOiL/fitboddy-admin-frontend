import { useEffect, useState } from 'react'

function readMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/** Ширина вьюпорта. В jsdom без matchMedia считаем экран узким. */
export function useMinWidth(width: number): boolean {
  const query = `(min-width: ${width}px)`
  const [matches, setMatches] = useState(() => readMatch(query))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(query)
    const apply = () => setMatches(media.matches)
    apply()
    if (typeof media.addEventListener !== 'function') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [query])

  return matches
}
