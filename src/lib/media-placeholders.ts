import photoDark from '../assets/placeholders/placeholder-photo-dark.jpg'
import photoLight from '../assets/placeholders/placeholder-photo-light.jpg'
import catalogThumb from '../assets/placeholders/placeholder-catalog-thumb.jpg'
import videoPlaceholder from '../assets/placeholders/placeholder-video.jpg'
import type { ColorTheme } from './theme'

/** Фото положения без своего кадра: светлый или тёмный макет по текущей теме. */
export function photoPlaceholderForTheme(theme: ColorTheme): string {
  return theme === 'dark' ? photoDark : photoLight
}

export const VIDEO_PLACEHOLDER_SRC = videoPlaceholder

export const CATALOG_THUMB_SRC = catalogThumb
