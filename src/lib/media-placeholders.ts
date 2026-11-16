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

// Светлые jpg-заглушки на тёмной карточке читаются как белые плитки.
// Тёмная тема рисует ту же пиктограмму на фоне карточки, без отдельного файла.
const DARK_CATALOG_THUMB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" rx="18" fill="#212833"/><g fill="none" stroke="#8faac2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="78" cy="30" r="8"/><path d="M78 38 L68 58 L46 68 M68 58 L98 70 M68 58 L60 88 L48 108 M68 58 L88 88 L102 108"/></g></svg>`

const DARK_VIDEO_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#141a21"/><polygon points="66,36 66,84 112,60" fill="#8faac2"/></svg>`

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Превью в списке каталога. В тёмной теме не оставляем белый jpg. */
export function catalogThumbForTheme(theme: ColorTheme): string {
  return theme === 'dark' ? svgDataUrl(DARK_CATALOG_THUMB_SVG) : CATALOG_THUMB_SRC
}

/** Заглушка ролика. В тёмной теме фон совпадает с плеером, а не со светлым макетом. */
export function videoPlaceholderForTheme(theme: ColorTheme): string {
  return theme === 'dark' ? svgDataUrl(DARK_VIDEO_PLACEHOLDER_SVG) : VIDEO_PLACEHOLDER_SRC
}
