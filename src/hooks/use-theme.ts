import { useEffect, useState } from 'react'

import { applyTheme, currentTheme, subscribeTheme, toggleTheme as flipTheme, type ColorTheme } from '../lib/theme'

export function useTheme(): { theme: ColorTheme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<ColorTheme>(() => currentTheme())

  useEffect(() => {
    // Скрипт в index.html ставит тему до отрисовки. Здесь догоняем тесты и визит без этого скрипта.
    applyTheme(currentTheme())
    return subscribeTheme(setTheme)
  }, [])

  return {
    theme,
    toggleTheme: () => {
      flipTheme()
    },
  }
}
