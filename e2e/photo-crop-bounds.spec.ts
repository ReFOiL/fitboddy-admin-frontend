import { join } from 'node:path'

import type { Page } from '@playwright/test'

import { expect, test } from './support/test'
import { signIn } from './support/session'
import { TOKENS } from './support/api-mock'

const CAT = join(process.cwd(), 'e2e/fixtures/source-cat.jpg')
const PORTRAIT = join(process.cwd(), 'e2e/fixtures/portrait-photo.png')

type Box = { top: number; right: number; bottom: number; left: number; width: number; height: number }

type CropGeometry = {
  crop: Box
  image: Box
  translateX: number
  translateY: number
  naturalWidth: number
  naturalHeight: number
}

function readCropGeometry(): CropGeometry | null {
  const crop = document.querySelector('.reactEasyCrop_CropArea')
  const image = document.querySelector('.reactEasyCrop_Image')
  if (!(crop instanceof HTMLElement) || !(image instanceof HTMLImageElement) || image.naturalWidth === 0) return null
  const cropBox = crop.getBoundingClientRect()
  const imageBox = image.getBoundingClientRect()
  const translated = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(image.style.transform)
  const box = (rect: DOMRect): Box => ({
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  })
  return {
    crop: box(cropBox),
    image: box(imageBox),
    translateX: translated ? Number(translated[1]) : 0,
    translateY: translated ? Number(translated[2]) : 0,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  }
}

async function geometry(page: Page): Promise<CropGeometry | null> {
  return page.evaluate(readCropGeometry)
}

/** Сколько пикселей фото вылезает за рамку. Отрицательное — дыра внутри кадра. */
function overflow(frame: CropGeometry) {
  return {
    top: frame.crop.top - frame.image.top,
    bottom: frame.image.bottom - frame.crop.bottom,
    left: frame.crop.left - frame.image.left,
    right: frame.image.right - frame.crop.right,
  }
}

function coversCrop(frame: CropGeometry, slack = 2): boolean {
  const edges = overflow(frame)
  return edges.top >= -slack && edges.bottom >= -slack && edges.left >= -slack && edges.right >= -slack
}

async function openCrop(page: Page, inputId: string, file: string, title: string) {
  await signIn(page, TOKENS.trainer)
  await page.goto('/exercises/row-bench')
  await expect(page.getByText('Фото упражнения')).toBeVisible()
  await page.locator(inputId).setInputFiles(file)
  const dialog = page.getByRole('dialog', { name: title })
  await expect(dialog).toBeVisible()
  return dialog
}

async function dragCrop(page: Page, dx: number, dy: number) {
  const crop = page.locator('.reactEasyCrop_CropArea')
  const box = await crop.boundingBox()
  if (!box) throw new Error('Рамка кадра не на экране')
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + dx, startY + dy, { steps: 10 })
  await page.mouse.up()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

test('широкое фото закрывает кадр 4:3 и двигается только влево-вправо', async ({ page }) => {
  test.setTimeout(90_000)
  const dialog = await openCrop(page, '#exercise_photo_upload_start', CAT, 'Кадр старта')

  await expect
    .poll(async () => {
      const frame = await geometry(page)
      if (!frame || frame.naturalWidth !== 960 || frame.crop.width < 80) return 'фото ещё не встало в рамку'
      const edges = overflow(frame)
      if (!coversCrop(frame)) return `в кадре пусто ${JSON.stringify(edges)}`
      if (edges.top >= 6 || edges.bottom >= 6) {
        return `сверху/снизу есть запас ${edges.top.toFixed(1)}/${edges.bottom.toFixed(1)}`
      }
      if (edges.left <= 8 || edges.right <= 8) {
        return `по бокам нет запаса ${edges.left.toFixed(1)}/${edges.right.toFixed(1)}`
      }
      if (Math.abs(frame.crop.width / frame.crop.height - 4 / 3) > 0.05) return 'рамка не 4:3'
      return 'ok'
    })
    .toBe('ok')

  await dialog.screenshot({ path: test.info().outputPath('landscape-min-zoom.png') })

  await dragCrop(page, 0, -140)
  const afterVertical = await geometry(page)
  expect(afterVertical).not.toBeNull()
  expect(Math.abs(afterVertical!.translateY)).toBeLessThan(2)
  expect(coversCrop(afterVertical!)).toBe(true)
  expect(overflow(afterVertical!).top).toBeLessThan(6)
  expect(overflow(afterVertical!).bottom).toBeLessThan(6)

  await dragCrop(page, -90, 0)
  const afterHorizontal = await geometry(page)
  expect(afterHorizontal).not.toBeNull()
  expect(Math.abs(afterHorizontal!.translateX)).toBeGreaterThan(8)
  expect(Math.abs(afterHorizontal!.translateY)).toBeLessThan(2)
  expect(coversCrop(afterHorizontal!)).toBe(true)
  await dialog.screenshot({ path: test.info().outputPath('landscape-panned-left.png') })

  await dialog.getByRole('slider', { name: 'Масштаб' }).fill('2.4')
  await dragCrop(page, 0, -70)
  await expect.poll(async () => (await geometry(page))?.translateY ?? 0).toBeLessThan(-8)
  const zoomed = await geometry(page)
  expect(zoomed && coversCrop(zoomed)).toBe(true)

  await dialog.getByRole('button', { name: 'Сбросить' }).click()
  await expect
    .poll(async () => {
      const frame = await geometry(page)
      if (!frame) return null
      const edges = overflow(frame)
      return Math.abs(frame.translateX) < 2 && Math.abs(frame.translateY) < 2 && edges.top < 6 && edges.bottom < 6
    })
    .toBe(true)
})

test('вертикальное фото закрывает кадр 4:3 и двигается только вверх-вниз', async ({ page }) => {
  test.setTimeout(90_000)
  await openCrop(page, '#exercise_photo_upload_end', PORTRAIT, 'Кадр финиша')

  await expect
    .poll(async () => {
      const frame = await geometry(page)
      if (!frame || frame.naturalHeight <= frame.naturalWidth || frame.crop.width < 80) return null
      const edges = overflow(frame)
      return edges.left < 4 && edges.right < 4 && edges.top > 8 && edges.bottom > 8 && coversCrop(frame)
    })
    .toBe(true)
  await page.getByRole('dialog', { name: 'Кадр финиша' }).screenshot({
    path: test.info().outputPath('portrait-min-zoom.png'),
  })

  await dragCrop(page, -120, 0)
  const afterHorizontal = await geometry(page)
  expect(afterHorizontal).not.toBeNull()
  expect(Math.abs(afterHorizontal!.translateX)).toBeLessThan(2)
  expect(coversCrop(afterHorizontal!)).toBe(true)

  await dragCrop(page, 0, -80)
  await expect.poll(async () => (await geometry(page))?.translateY ?? 0).toBeLessThan(-8)
  const afterVertical = await geometry(page)
  expect(afterVertical && coversCrop(afterVertical)).toBe(true)
})
