import { test as base, expect } from '@playwright/test'

import { ApiMock } from './api-mock'

type Fixtures = {
  api: ApiMock
}

export const test = base.extend<Fixtures>({
  // Мок нужен каждому тесту, даже если сценарий не меняет состояние руками.
  api: [
    async ({ page }, run) => {
      const api = new ApiMock()
      await page.route('**/api/v1/**', async (route) => {
        await route.fulfill(api.handle(route.request()))
      })
      // Сокет чата сценариям не нужен: глушим, чтобы не сыпались ошибки соединения.
      await page.routeWebSocket('**/api/v1/messages/ws**', () => undefined)
      await run(api)
    },
    { auto: true },
  ],
})

export { expect }
