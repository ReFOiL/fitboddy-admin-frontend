import { useState } from 'react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Sheet } from '../ui/kit'

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
  const [clientUserId, setClientUserId] = useState('')
  const trimmed = clientUserId.trim()

  return (
    <Sheet title="Пригласить клиента" onClose={onClose}>
      <label className="grid gap-2 text-[17px] font-semibold" htmlFor="invite-client-id">
        ID клиента
        <Input
          id="invite-client-id"
          value={clientUserId}
          autoComplete="off"
          placeholder="ID из профиля клиента"
          onChange={(event) => setClientUserId(event.target.value)}
        />
      </label>
      <p className="mt-2 text-[15px] text-secondary-foreground">Клиент видит ID в своём профиле.</p>
      <Button type="button" size="lg" className="mt-4 w-full" disabled={!trimmed || pending} onClick={() => onInvite(trimmed)}>
        {pending ? 'Отправляем…' : 'Отправить приглашение'}
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
