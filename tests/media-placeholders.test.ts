import { describe, expect, it } from 'vitest'

import {
  CATALOG_THUMB_SRC,
  catalogThumbForTheme,
  photoPlaceholderForTheme,
  VIDEO_PLACEHOLDER_SRC,
  videoPlaceholderForTheme,
} from '../src/lib/media-placeholders'

describe('media placeholders', () => {
  it('берёт светлое и тёмное фото положения по теме', () => {
    const light = photoPlaceholderForTheme('light')
    const dark = photoPlaceholderForTheme('dark')
    expect(light).not.toBe(dark)
    expect(light.length).toBeGreaterThan(0)
    expect(dark.length).toBeGreaterThan(0)
    expect(VIDEO_PLACEHOLDER_SRC.length).toBeGreaterThan(0)
    expect(CATALOG_THUMB_SRC.length).toBeGreaterThan(0)
  })

  it('в тёмной теме плитка каталога и заглушка ролика не светлые jpg', () => {
    expect(catalogThumbForTheme('dark')).not.toBe(CATALOG_THUMB_SRC)
    expect(catalogThumbForTheme('dark')).toContain('svg')
    expect(videoPlaceholderForTheme('light')).toBe(VIDEO_PLACEHOLDER_SRC)
    expect(videoPlaceholderForTheme('dark')).not.toBe(VIDEO_PLACEHOLDER_SRC)
    expect(videoPlaceholderForTheme('dark')).toContain('svg')
  })
})
