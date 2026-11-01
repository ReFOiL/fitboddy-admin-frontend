import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

import { expect, test } from './support/test'
import { signIn } from './support/session'
import { IDS, TOKENS } from './support/api-mock'

const TALL_URL = 'http://127.0.0.1:4173/tall-photo.png'
const ORIGINAL_PATH = '/tmp/photo-crop-verify/tall-phone.png'

function crc32(buf: Buffer): number {
  let crc = ~0
  for (const byte of buf) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Шумное вертикальное фото, как снимок с телефона: PNG почти не сжимается. */
function tallPhonePng(width: number, height: number): Buffer {
  let seed = 0x12345678
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1)
    raw[row] = 0
    const band = Math.round((y / height) * 255)
    for (let x = 0; x < width; x += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const index = row + 1 + x * 3
      raw[index] = seed & 255
      raw[index + 1] = (seed >>> 8) & 255
      raw[index + 2] = band
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const tallPng = tallPhonePng(720, 1600)
mkdirSync('/tmp/photo-crop-verify', { recursive: true })
writeFileSync(ORIGINAL_PATH, tallPng)

function withTallPhoto(body: string, list: boolean): string {
  const data = JSON.parse(body) as unknown
  if (list && Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object' && (item as { row_id?: string }).row_id === 'row-bench') {
        ;(item as { start_image_url: string }).start_image_url = TALL_URL
      }
    }
    return JSON.stringify(data)
  }
  if (data && typeof data === 'object' && (data as { row_id?: string }).row_id === 'row-bench') {
    ;(data as { start_image_url: string }).start_image_url = TALL_URL
    return JSON.stringify(data)
  }
  return body
}

test('тренер кадрирует вертикальное фото в 4:3, клиент видит тот же кадр', async ({ page, api }) => {
  test.setTimeout(120_000)
  const uploads: Array<{ path: string; bytes: number; text: string }> = []

  await page.route('**/tall-photo.png', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: tallPng })
  })
  await page.unroute('**/api/v1/**')
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'POST' && /\/photos\/(start|end)$/.test(url.pathname)) {
      const bytes = request.postDataBuffer() ?? Buffer.alloc(0)
      uploads.push({ path: url.pathname, bytes: bytes.length, text: bytes.toString('latin1') })
      const position = url.pathname.endsWith('/end') ? 'end' : 'start'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trainer_user_id: IDS.trainer,
          row_id: 'row-bench',
          position,
          image_url: TALL_URL,
        }),
      })
      return
    }
    const response = api.handle(request)
    if (request.method() === 'GET' && /\/exercises\/row-bench$/.test(url.pathname)) {
      response.body = withTallPhoto(response.body, false)
    }
    if (request.method() === 'GET' && /\/exercises$/.test(url.pathname)) {
      response.body = withTallPhoto(response.body, true)
    }
    await route.fulfill(response)
  })

  await signIn(page, TOKENS.trainer)
  await page.goto('/exercises/row-bench')
  await expect(page.getByText('Фото упражнения')).toBeVisible()
  const stored = page.getByAltText('Исходное положение')
  await expect(stored).toBeVisible()
  await expect
    .poll(() => stored.evaluate((img: HTMLImageElement) => img.naturalHeight))
    .toBeGreaterThan(1000)

  const frame = await stored.evaluate((img: HTMLImageElement) => {
    const parent = img.parentElement
    if (!parent) return null
    const image = img.getBoundingClientRect()
    const box = parent.getBoundingClientRect()
    const style = getComputedStyle(img)
    const parentStyle = getComputedStyle(parent)
    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      width: image.width,
      height: image.height,
      boxWidth: box.width,
      boxHeight: box.height,
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
      aspectRatio: parentStyle.aspectRatio,
    }
  })
  expect(frame).not.toBeNull()
  expect(frame!.naturalHeight).toBeGreaterThan(frame!.naturalWidth)
  expect(frame!.objectFit).toBe('cover')
  expect(frame!.objectPosition).toBe('50% 50%')
  expect(frame!.aspectRatio).toBe('4 / 3')
  expect(frame!.boxWidth / frame!.boxHeight).toBeCloseTo(4 / 3, 1)
  expect(frame!.height).toBeLessThan(frame!.naturalHeight / 2)

  await stored.scrollIntoViewIfNeeded()
  await page.getByLabel('Заменить фото').setInputFiles(ORIGINAL_PATH)
  const dialog = page.getByRole('dialog', { name: 'Кадр старта' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Перетащи фото и масштабируй — в кадр попадёт только то, что внутри рамки.')).toBeVisible()
  await expect(dialog.getByText('4 : 3')).toBeVisible()
  const done = dialog.getByRole('button', { name: 'Готово' })
  await expect(done).toBeEnabled()
  const zoom = dialog.getByRole('slider', { name: 'Масштаб' })
  await zoom.fill('2.2')
  await expect(zoom).toHaveValue('2.2')
  await dialog.getByRole('button', { name: 'Сбросить' }).click()
  await expect(zoom).toHaveValue('1')

  await done.click()
  await expect(page.getByText('Фото загружено')).toBeVisible()
  expect(uploads).toHaveLength(1)
  const upload = uploads[0]
  const header = upload.text.slice(0, 700)
  const payload = Buffer.from(upload.text, 'latin1')
  expect(upload.path).toContain('/photos/start')
  expect(header).toMatch(/filename="start\.(jpg|webp)"/)
  expect(header).toMatch(/image\/(jpeg|webp)/)
  expect(upload.bytes).toBeLessThan(tallPng.length / 2)
  expect(payload.includes(Buffer.from([0xff, 0xd8, 0xff])) || header.includes('image/webp')).toBe(true)

  await page.addInitScript((access: string) => {
    localStorage.setItem('platform_access_token', access)
    localStorage.setItem('platform_refresh_token', `${access}-refresh`)
  }, TOKENS.anna)
  await page.goto(`/plan/exercises/row-bench?trainer=${IDS.trainer}`)
  const clientPhoto = page.getByAltText('Старт')
  await expect(clientPhoto).toBeVisible()
  await expect
    .poll(() => clientPhoto.evaluate((img: HTMLImageElement) => img.naturalHeight))
    .toBeGreaterThan(1000)
  const clientFrame = await clientPhoto.evaluate((img: HTMLImageElement) => {
    const parent = img.parentElement
    const box = parent?.getBoundingClientRect()
    return {
      objectFit: getComputedStyle(img).objectFit,
      aspectRatio: parent ? getComputedStyle(parent).aspectRatio : '',
      ratio: box && box.height ? box.width / box.height : 0,
    }
  })
  expect(clientFrame.objectFit).toBe('cover')
  expect(clientFrame.aspectRatio).toBe('4 / 3')
  expect(clientFrame.ratio).toBeCloseTo(4 / 3, 1)
})
