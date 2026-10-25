import { describe, expect, it } from 'vitest'

import { CATALOG_THUMB_SRC, photoPlaceholderForTheme, VIDEO_PLACEHOLDER_SRC } from '../src/lib/media-placeholders'

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
})
