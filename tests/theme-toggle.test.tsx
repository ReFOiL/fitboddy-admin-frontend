import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ThemeToggle } from '../src/components/layout/ThemeToggle'
import { THEME_STORAGE_KEY } from '../src/lib/theme'

describe('ThemeToggle', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    document.documentElement.style.colorScheme = ''
  })

  it('переключает тему и запоминает выбор', () => {
    render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Включить тёмную тему' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Включить светлую тему' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})
