import axios from 'axios'

import {
  absoluteInviteUrl,
  classifyInviteAcceptError,
  clearPendingInviteCode,
  normalizeInviteCode,
  pathAfterAuth,
  readPendingInviteCode,
  savePendingInviteCode,
  trainerInviteTitle,
} from '../src/lib/invite'
import { APP_PATHS } from '../src/config'

function axiosError(status: number, data: unknown) {
  const error = new axios.AxiosError('request failed')
  error.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: {} as never,
  }
  return error
}

describe('invite codes', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('нормализует код и отбрасывает похожие символы', () => {
    expect(normalizeInviteCode(' ab3k9z ')).toBe('AB3K9Z')
    expect(normalizeInviteCode('AB3K9O')).toBeNull()
    expect(normalizeInviteCode('AB3K9')).toBeNull()
  })

  it('хранит код приглашения до входа и анкеты', () => {
    savePendingInviteCode('ab3k9z')
    expect(readPendingInviteCode()).toBe('AB3K9Z')
    expect(pathAfterAuth('client', APP_PATHS.profileOnboarding)).toBe(APP_PATHS.profileOnboarding)
    expect(pathAfterAuth('client', APP_PATHS.home)).toBe('/i/AB3K9Z')
    expect(pathAfterAuth('trainer', APP_PATHS.home)).toBe('/i/AB3K9Z')
    clearPendingInviteCode()
    expect(pathAfterAuth('client', APP_PATHS.home)).toBe(APP_PATHS.home)
  })

  it('собирает абсолютную ссылку из invite_path', () => {
    expect(absoluteInviteUrl('/i/AB3K9Z', 'https://fitboddy.test')).toBe('https://fitboddy.test/i/AB3K9Z')
  })

  it('узнаёт 409 already_linked и 403', () => {
    expect(
      classifyInviteAcceptError(
        axiosError(409, {
          detail: {
            reason: 'already_linked',
            message: 'client already linked to another trainer',
            current_trainer_user_id: 'trainer-2',
          },
        }),
      ),
    ).toEqual({ kind: 'already_linked', currentTrainerUserId: 'trainer-2' })

    expect(classifyInviteAcceptError(axiosError(403, { detail: 'forbidden' }))).toEqual({ kind: 'forbidden' })
    expect(trainerInviteTitle({ trainer_display_name: 'Марина', trainer_login: 'marina', trainer_user_id: 't', code: 'AB3K9Z' })).toBe(
      'Тренер Марина приглашает вас',
    )
    expect(trainerInviteTitle({ trainer_display_name: null, trainer_login: null, trainer_user_id: 't', code: 'AB3K9Z' })).toBe(
      'Тренер приглашает вас',
    )
  })
})
