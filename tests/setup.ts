import '@testing-library/jest-dom/vitest'

// jsdom не умеет object URL, а кадрирование показывает выбранный файл через него.
if (typeof URL.createObjectURL !== 'function') {
  let blobUrlId = 0
  URL.createObjectURL = () => `blob:exercise-photo-${blobUrlId++}`
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {}
}
