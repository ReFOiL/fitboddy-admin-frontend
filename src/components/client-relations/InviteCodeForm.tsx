import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { acceptInviteCode } from '../../api/relations'
import { parseClientInviteInput } from '../../lib/client-invite-code'
import { classifyInviteAcceptError } from '../../lib/invite'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function InviteCodeForm() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const retryRef = useRef<((code: string) => void) | null>(null)
  const mutation = useMutation({
    mutationFn: ({ code, force }: { code: string; force: boolean }) => acceptInviteCode(code, force),
    onSuccess: async () => {
      setValue('')
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['relations'] })
      toast.success('Вы подключены к тренеру')
    },
    onError: (err, variables) => {
      const failure = classifyInviteAcceptError(err)
      if (failure.kind === 'already_linked' && !variables.force) {
        const agreed = window.confirm('Вы уже занимаетесь с другим тренером. Перейти к этому тренеру?')
        if (agreed) retryRef.current?.(variables.code)
        return
      }
      if (failure.kind === 'not_found') {
        setError('Приглашение не найдено. Проверьте код или попросите новую ссылку.')
        return
      }
      if (failure.kind === 'forbidden') {
        setError('Этот код нельзя принять с вашего аккаунта.')
        return
      }
      setError(failure.kind === 'other' ? failure.message : 'Не удалось подключиться.')
    },
  })
  useEffect(() => {
    retryRef.current = (code) => mutation.mutate({ code, force: true })
  }, [mutation])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const code = parseClientInviteInput(value)
    if (!code) {
      setError('Введите код из 6 символов или ссылку от тренера.')
      return
    }
    setError(null)
    mutation.mutate({ code, force: false })
  }

  return (
    <form aria-label="Код или ссылка от тренера" className="rounded-3xl border border-border bg-card p-4" onSubmit={submit}>
      <label htmlFor="trainer-invite-code" className="text-[17px] font-semibold">
        Код или ссылка от тренера
      </label>
      <Input
        id="trainer-invite-code"
        className="mt-3"
        value={value}
        autoCapitalize="characters"
        autoComplete="off"
        placeholder="AB3K9Z или ссылка /i/…"
        onChange={(event) => setValue(event.target.value)}
      />
      {error ? (
        <p className="mt-2 text-[15px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-3 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Подключаем…' : 'Подключиться'}
      </Button>
    </form>
  )
}
