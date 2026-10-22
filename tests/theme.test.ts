import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  THEME_STORAGE_KEY,
  applyTheme,
  currentTheme,
  getSystemTheme,
  persistTheme,
  readStoredTheme,
  resolveTheme,
  toggleTheme,
} from '../src/lib/theme'

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

describe('theme', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    document.documentElement.style.colorScheme = ''
    vi.unstubAllGlobals()
  })

  it('без сохранённого выбора берёт системную тему, иначе светлую', () => {
    expect(resolveTheme(null, 'dark')).toBe('dark')
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(getSystemTheme()).toBe('light')
    mockMatchMedia(true)
    expect(getSystemTheme()).toBe('dark')
  })

  it('игнорирует мусор в localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'blue')
    expect(readStoredTheme()).toBeNull()
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('сохраняет выбор и переключает data-theme', () => {
    applyTheme('light')
    expect(toggleTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(currentTheme()).toBe('dark')

    persistTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })
})
