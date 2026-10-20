import { defineConfig } from '@playwright/test'

/**
 * Два проекта: телефон 390px и десктоп 1280px.
 * Часовой пояс UTC, чтобы «сегодня» в браузере совпадало с датой мока в Node.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Один Vite на все воркеры: на CI не раздуваем параллелизм.
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ru-RU',
    timezoneId: 'UTC',
    trace: 'on-first-retry',
  },
  webServer: {
    // Имя бота нужно экрану уведомлений: без него ссылка на Telegram не строится.
    command: 'VITE_TELEGRAM_BOT_USERNAME=fitboddy_bot npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
})
