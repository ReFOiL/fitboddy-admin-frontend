import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BrandLogo } from '../src/components/brand/BrandLogo'
import { ThemeToggle } from '../src/components/layout/ThemeToggle'
import { THEME_STORAGE_KEY } from '../src/lib/theme'

describe('BrandLogo', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    delete document.documentElement.dataset.theme
    document.documentElement.style.colorScheme = ''
  })

  it('в светлой теме показывает горизонтальный знак', () => {
    document.documentElement.dataset.theme = 'light'
    render(<BrandLogo />)

    expect(screen.getByRole('img', { name: 'Fitboddy' })).toHaveAttribute(
      'src',
      expect.stringContaining('logo-wordmark-light'),
    )
  })

  it('в тёмной теме показывает тёмный знак', () => {
    document.documentElement.dataset.theme = 'dark'
    render(<BrandLogo />)

    expect(screen.getByRole('img', { name: 'Fitboddy' })).toHaveAttribute(
      'src',
      expect.stringContaining('logo-wordmark-dark'),
    )
  })

  it('компактный режим оставляет только знак F', () => {
    document.documentElement.dataset.theme = 'dark'
    render(<BrandLogo compact />)

    const img = screen.getByRole('img', { name: 'Fitboddy' })
    expect(img.getAttribute('src')).toContain('logo-mark')
    expect(img.getAttribute('src')).not.toContain('wordmark')
  })

  it('меняет знак вместе с темой', () => {
    document.documentElement.dataset.theme = 'light'
    render(
      <>
        <BrandLogo />
        <ThemeToggle />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Включить тёмную тему' }))

    expect(screen.getByRole('img', { name: 'Fitboddy' })).toHaveAttribute(
      'src',
      expect.stringContaining('logo-wordmark-dark'),
    )
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})

describe('favicon', () => {
  it('index.html указывает на знак F', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

    expect(html).toContain('href="/favicon.ico"')
    expect(html).toContain('href="/favicon-32.png"')
    expect(html).toContain('href="/apple-touch-icon.png"')
    expect(html).not.toContain('favicon.svg')
  })
})
