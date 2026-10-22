export const THEME_STORAGE_KEY = 'fitboddy-theme'

export type ColorTheme = 'light' | 'dark'

function isColorTheme(value: string | null | undefined): value is ColorTheme {
  return value === 'light' || value === 'dark'
}

export function getSystemTheme(): ColorTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function readStoredTheme(): ColorTheme | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isColorTheme(stored) ? stored : null
  } catch {
    return null
  }
}

export function readDocumentTheme(): ColorTheme | null {
  if (typeof document === 'undefined') return null
  return isColorTheme(document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : null
}

/** Сохранённый выбор важнее системы. Без записи в localStorage берём prefers-color-scheme. */
export function resolveTheme(stored: ColorTheme | null, system: ColorTheme): ColorTheme {
  return stored ?? system
}

export function currentTheme(): ColorTheme {
  return readDocumentTheme() ?? resolveTheme(readStoredTheme(), getSystemTheme())
}

export function applyTheme(theme: ColorTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

const listeners = new Set<(theme: ColorTheme) => void>()

export function subscribeTheme(listener: (theme: ColorTheme) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(theme: ColorTheme): void {
  for (const listener of listeners) listener(theme)
}

export function persistTheme(theme: ColorTheme): void {
  applyTheme(theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Приватный режим может запретить запись: тема всё равно останется до перезагрузки.
  }
  notify(theme)
}

export function toggleTheme(): ColorTheme {
  const next: ColorTheme = currentTheme() === 'dark' ? 'light' : 'dark'
  persistTheme(next)
  return next
}
