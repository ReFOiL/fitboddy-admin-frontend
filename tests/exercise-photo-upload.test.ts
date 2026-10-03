import type { AxiosProgressEvent } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '../src/api/client'
import { uploadTrainerExercisePhoto } from '../src/api/exercises'
import { EXERCISE_PHOTO_UPLOAD_TIMEOUT_MS } from '../src/lib/exercise-photos'

vi.mock('../src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

describe('uploadTrainerExercisePhoto', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset()
  })

  it('uses a long timeout and reports upload progress without rewriting the image url', async () => {
    const imageUrl = '/api/v1/trainers/media/a?exp=1710000000&sig=ab+cd%2Fef'
    vi.mocked(apiClient.post).mockImplementation(async (_url, _body, config) => {
      const onUploadProgress = (config as { onUploadProgress?: (event: AxiosProgressEvent) => void } | undefined)
        ?.onUploadProgress
      const event = { loaded: 7, total: 10, bytes: 7, lengthComputable: true }
      onUploadProgress?.(event)
      onUploadProgress?.(event)
      onUploadProgress?.({ loaded: 10, total: 10, bytes: 10, lengthComputable: true })
      return {
        data: {
          trainer_user_id: 't',
          row_id: 'r',
          position: 'start',
          image_url: imageUrl,
        },
      }
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'start.png', { type: 'image/png' })
    const onProgress = vi.fn()
    const result = await uploadTrainerExercisePhoto('trainer 1', 'row 2', 'start', file, onProgress)

    expect(result.image_url).toBe(imageUrl)
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    const [url, body, config] = vi.mocked(apiClient.post).mock.calls[0]
    expect(url).toBe('/api/v1/trainers/trainer%201/exercises/row%202/photos/start')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    expect(config).toMatchObject({
      timeout: EXERCISE_PHOTO_UPLOAD_TIMEOUT_MS,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    expect(EXERCISE_PHOTO_UPLOAD_TIMEOUT_MS).toBeGreaterThan(12_000)
    expect(onProgress.mock.calls).toEqual([[70], [100]])
  })
})
