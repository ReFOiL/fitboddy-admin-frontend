import markUrl from '../../assets/brand/logo-mark.webp'
import wordmarkDarkUrl from '../../assets/brand/logo-wordmark-dark.webp'
import wordmarkLightUrl from '../../assets/brand/logo-wordmark-light.webp'
import { APP_BRAND_NAME } from '../../config'
import { useTheme } from '../../hooks/use-theme'
import type { ColorTheme } from '../../lib/theme'
import { cn } from '../../lib/utils'

// Размеры совпадают с файлами в src/assets/brand: браузер держит пропорцию до CSS.
const WORDMARK_WIDTH = 871
const WORDMARK_HEIGHT = 219
const MARK_WIDTH = 439
const MARK_HEIGHT = 560

type BrandLogoProps = {
  /** Только знак F, без слова. Для узкой шапки. */
  compact?: boolean
  className?: string
  /** Пустая строка — картинка декоративная, имя даёт родительская ссылка. */
  alt?: string
}

// У светлого и тёмного слова разный цвет букв, это не CSS-фильтр одной картинки.
function wordmarkForTheme(theme: ColorTheme): string {
  switch (theme) {
    case 'light':
      return wordmarkLightUrl
    case 'dark':
      return wordmarkDarkUrl
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}

export function BrandLogo({ compact = false, className, alt = APP_BRAND_NAME }: BrandLogoProps) {
  const { theme } = useTheme()
  const src = compact ? markUrl : wordmarkForTheme(theme)

  return (
    <img
      src={src}
      alt={alt}
      width={compact ? MARK_WIDTH : WORDMARK_WIDTH}
      height={compact ? MARK_HEIGHT : WORDMARK_HEIGHT}
      draggable={false}
      decoding="async"
      className={cn('block w-auto max-w-full select-none', compact ? 'h-8' : 'h-9', className)}
    />
  )
}
