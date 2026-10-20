import type { Page } from '@playwright/test'

// window.confirm блокирует клик, пока диалог не закрыт.
// Ждать событие снаружи и закрывать после click нельзя: click не завершится.
export async function clickWithDialog(
  page: Page,
  click: () => Promise<void>,
  action: 'accept' | 'dismiss',
): Promise<string> {
  const handled = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Нативный диалог не появился')), 5000)
    page.once('dialog', (dialog) => {
      clearTimeout(timer)
      const message = dialog.message()
      const done = action === 'accept' ? dialog.accept() : dialog.dismiss()
      void done.then(() => resolve(message), reject)
    })
  })
  await Promise.all([handled, click()])
  return handled
}
