import axios from 'axios'
import { useState } from 'react'

import { lookupClientByLogin } from '../../api/auth'
import { getUserErrorMessage } from '../../lib/user-error-message'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Sheet } from '../ui/kit'

const LOGIN_PATTERN = /^[a-z0-9_.-]{3,32}$/

type InviteClientSheetProps = {
  trainerUserId: string
  pending: boolean
  published: boolean
  publicationPending: boolean
  onTogglePublication: () => void
  onClose: () => void
  onInvite: (clientUserId: string) => void
}

export function InviteClientSheet({
  pending,
  published,
  publicationPending,
  onTogglePublication,
  onClose,
  onInvite,
}: InviteClientSheetProps) {
  const [login, setLogin] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const trimmed = login.trim().toLowerCase()

  const submit = async () => {
    setLookupError('')
    if (!LOGIN_PATTERN.test(trimmed)) {
      setLookupError('Логин: латиница, цифры и символы _ . -, от 3 до 32.')
      return
    }
    setLookingUp(true)
    try {
      const client = await lookupClientByLogin(trimmed)
      onInvite(client.user_id)
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status === 404) setLookupError('Клиент с таким логином не найден.')
      else if (status === 403) setLookupError('Искать клиентов может только тренер.')
      else setLookupError(getUserErrorMessage(error, 'Не удалось найти клиента.'))
    } finally {
      setLookingUp(false)
    }
  }

  const busy = pending || lookingUp

  return (
    <Sheet title="Пригласить клиента" onClose={onClose}>
      <label className="grid gap-2 text-[17px] font-semibold" htmlFor="invite-client-login">
        Логин
        <Input
          id="invite-client-login"
          value={login}
          autoComplete="off"
          placeholder="Логин клиента"
          onChange={(event) => setLogin(event.target.value)}
        />
      </label>
      {lookupError ? <p className="mt-2 text-[15px] text-destructive">{lookupError}</p> : null}
      <Button type="button" size="lg" className="mt-4 w-full" disabled={!trimmed || busy} onClick={() => void submit()}>
        {busy ? 'Отправляем…' : 'Отправить приглашение'}
      </Button>
      <button
        type="button"
        className="mt-4 flex min-h-12 w-full items-center justify-between text-left text-[17px]"
        disabled={publicationPending}
        onClick={onTogglePublication}
      >
        <span>Видимость профиля</span>
        <span className="font-semibold">{published ? 'Виден клиентам' : 'Не опубликован'}</span>
      </button>
    </Sheet>
  )
}
