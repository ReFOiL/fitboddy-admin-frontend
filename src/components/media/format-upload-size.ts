/** Размер выбранного файла для строки под кнопкой загрузки. */
export function formatUploadFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 Б'
  if (bytes < 1024) return `${Math.round(bytes)} Б`
  if (bytes < 1024 * 1024) {
    const value = bytes / 1024
    return `${value >= 10 ? Math.round(value) : trimOneDecimal(value)} КБ`
  }
  const value = bytes / (1024 * 1024)
  return `${value >= 10 ? Math.round(value) : trimOneDecimal(value)} МБ`
}

function trimOneDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}
