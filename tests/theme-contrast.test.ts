import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

function channel(value: number): number {
  const srgb = value / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const red = Number.parseInt(raw.slice(0, 2), 16)
  const green = Number.parseInt(raw.slice(2, 4), 16)
  const blue = Number.parseInt(raw.slice(4, 6), 16)
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

function contrast(first: string, second: string): number {
  const lighter = Math.max(luminance(first), luminance(second))
  const darker = Math.min(luminance(first), luminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

function cssBlock(css: string, marker: string): Record<string, string> {
  const markerAt = css.indexOf(marker)
  const open = css.indexOf('{', markerAt)
  let depth = 0
  let close = open
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') {
      depth -= 1
      if (depth === 0) {
        close = index
        break
      }
    }
  }
  const body = css.slice(open + 1, close)
  const tokens: Record<string, string> = {}
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[match[1]] = match[2]
  }
  return tokens
}

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const light = cssBlock(css, ':root')
const dark = cssBlock(css, "[data-theme='dark']")

function expectText(theme: Record<string, string>, name: string) {
  const pairs: Array<[string, string, string]> = [
    ['текст на фоне', theme.foreground, theme.background],
    ['текст на карточке', theme.foreground, theme.card],
    ['вторичный текст на фоне', theme['secondary-foreground'], theme.background],
    ['вторичный текст на карточке', theme['secondary-foreground'], theme.card],
    ['вторичный текст на мягкой заливке', theme['secondary-foreground'], theme.secondary],
    ['текст на акцентной кнопке', theme['primary-foreground'], theme.primary],
    ['акцентный текст на фоне', theme['accent-ink'], theme.background],
    ['акцентный текст на карточке', theme['accent-ink'], theme.card],
    ['акцентный текст на мягкой заливке', theme['accent-ink'], theme.secondary],
    ['ошибка на фоне', theme.destructive, theme.background],
    ['успех на фоне', theme.success, theme.background],
    ['предупреждение на фоне', theme.warning, theme.background],
  ]
  for (const [label, ink, surface] of pairs) {
    expect(contrast(ink, surface), `${name}: ${label}`).toBeGreaterThanOrEqual(4.5)
  }
  expect(contrast(theme.primary, theme.card), `${name}: граница акцента`).toBeGreaterThanOrEqual(3)
}

describe('контраст палитры', () => {
  it('светлая и тёмная темы держат WCAG AA', () => {
    expectText(light, 'светлая')
    expectText(dark, 'тёмная')
  })
})
