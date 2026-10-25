import axios from 'axios'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { acceptInviteCode, getPublicInvite } from '../api/relations'
import { queryKeys } from '../api/queryKeys'
import { BrandLogo } from '../components/brand/BrandLogo'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { QueryState } from '../components/shared'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import {
  classifyInviteAcceptError,
  clearPendingInviteCode,
  loginPath,
  normalizeInviteCode,
  savePendingInviteCode,
  trainerInviteName,
  trainerInviteTitle,
  type InviteAcceptFailure,
} from '../lib/invite'

function InviteFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
        <BrandLogo className="h-10" />
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-8 w-full max-w-lg">{children}</div>
    </main>
  )
}

function InviteCard({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4">
        <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
        {body ? <p className="text-[17px] text-secondary-foreground">{body}</p> : null}
        {children}
      </CardContent>
    </Card>
  )
}

function GuestInvite({ title }: { title: string }) {
  return (
    <InviteFrame>
      <InviteCard title={title} body="Создайте аккаунт или войдите, чтобы тренироваться вместе.">
        <Button asChild size="lg" className="h-14 w-full">
          <Link to={loginPath('register')}>Зарегистрироваться</Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-14 w-full">
          <Link to={loginPath('login')}>Войти</Link>
        </Button>
      </InviteCard>
    </InviteFrame>
  )
}

export function InviteLandingPage() {
  const { code: rawCode = '' } = useParams()
  const code = normalizeInviteCode(rawCode)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, meQuery } = useAuth()
  const [failure, setFailure] = useState<InviteAcceptFailure | null>(null)
  const startedCode = useRef<string | null>(null)

  // До ответа сети: 401 на /me уводит на /login полной перезагрузкой, код должен уже лежать в sessionStorage.
  useEffect(() => {
    if (code) savePendingInviteCode(code)
  }, [code])

  const inviteQuery = useQuery({
    queryKey: queryKeys.relations.publicInvite(code ?? 'invalid'),
    queryFn: () => getPublicInvite(code!),
    enabled: Boolean(code),
    retry: false,
  })

  const acceptMutation = useMutation({
    mutationFn: (force: boolean) => acceptInviteCode(code!, force),
    onMutate: () => setFailure(null),
    onSuccess: async () => {
      clearPendingInviteCode()
      await queryClient.invalidateQueries({ queryKey: ['relations'] })
      toast.success('Вы подключены к тренеру')
      navigate(APP_PATHS.home, { replace: true })
    },
    onError: (error) => {
      const next = classifyInviteAcceptError(error)
      if (next.kind === 'forbidden' || next.kind === 'not_found') clearPendingInviteCode()
      setFailure(next)
    },
  })
  const { mutate: acceptInvite } = acceptMutation

  useEffect(() => {
    if (!inviteQuery.isError) return
    const status = axios.isAxiosError(inviteQuery.error) ? inviteQuery.error.response?.status : undefined
    if (status === 404) clearPendingInviteCode()
  }, [inviteQuery.error, inviteQuery.isError])

  useEffect(() => {
    if (!code || !user || !inviteQuery.isSuccess) return
    if (startedCode.current === code) return
    startedCode.current = code
    acceptInvite(false)
  }, [acceptInvite, code, inviteQuery.isSuccess, user])

  const leaveWithCurrentTrainer = () => {
    clearPendingInviteCode()
    navigate(APP_PATHS.home, { replace: true })
  }

  if (!code) {
    return (
      <InviteFrame>
        <InviteCard title="Приглашение не найдено" body="Проверьте ссылку или попросите тренера прислать новую." />
      </InviteFrame>
    )
  }

  if (inviteQuery.isLoading) {
    return (
      <InviteFrame>
        <p className="py-10 text-center text-[17px]" aria-busy="true">
          Загрузка…
        </p>
      </InviteFrame>
    )
  }

  if (inviteQuery.isError) {
    const status = axios.isAxiosError(inviteQuery.error) ? inviteQuery.error.response?.status : undefined
    if (status === 404) {
      return (
        <InviteFrame>
          <InviteCard title="Приглашение не найдено" body="Ссылка устарела или код указан с ошибкой." />
        </InviteFrame>
      )
    }
    return (
      <InviteFrame>
        <QueryState isError errorTitle="Не удалось открыть приглашение" onRetry={() => void inviteQuery.refetch()}>
          {null}
        </QueryState>
      </InviteFrame>
    )
  }

  const invite = inviteQuery.data
  if (!invite) return null
  const title = trainerInviteTitle(invite)
  const name = trainerInviteName(invite)

  if (!isAuthenticated) return <GuestInvite title={title} />

  if (meQuery.isPending) {
    return (
      <InviteFrame>
        <p className="py-10 text-center text-[17px]" aria-busy="true">
          Проверяем сессию…
        </p>
      </InviteFrame>
    )
  }

  if (!user) return <GuestInvite title={title} />

  if (failure?.kind === 'already_linked') {
    const prompt = name
      ? `Вы уже занимаетесь с другим тренером. Перейти к ${name}?`
      : 'Вы уже занимаетесь с другим тренером. Перейти к этому тренеру?'
    return (
      <InviteFrame>
        <InviteCard title={title} body={prompt}>
          <Button
            type="button"
            size="lg"
            className="h-14 w-full"
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate(true)}
          >
            {acceptMutation.isPending ? 'Переходим…' : 'Перейти'}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 w-full"
            disabled={acceptMutation.isPending}
            onClick={leaveWithCurrentTrainer}
          >
            Остаться
          </Button>
        </InviteCard>
      </InviteFrame>
    )
  }

  if (failure?.kind === 'forbidden') {
    return (
      <InviteFrame>
        <InviteCard title="Эта ссылка для клиентов" body="Войдите как клиент или зарегистрируйте клиентский аккаунт.">
          <Button type="button" size="lg" variant="secondary" className="h-14 w-full" onClick={() => navigate(APP_PATHS.home)}>
            На главную
          </Button>
        </InviteCard>
      </InviteFrame>
    )
  }

  if (failure?.kind === 'not_found') {
    return (
      <InviteFrame>
        <InviteCard title="Приглашение не найдено" body="Ссылка устарела или код указан с ошибкой." />
      </InviteFrame>
    )
  }

  if (failure?.kind === 'other') {
    return (
      <InviteFrame>
        <InviteCard title={title} body={failure.message}>
          <Button
            type="button"
            size="lg"
            className="h-14 w-full"
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate(false)}
          >
            Повторить
          </Button>
        </InviteCard>
      </InviteFrame>
    )
  }

  if (failure) {
    const unexpected: never = failure
    return unexpected
  }

  return (
    <InviteFrame>
      <p className="py-10 text-center text-[17px]" aria-busy="true">
        {name ? `Подключаем к ${name}…` : 'Подключаем к тренеру…'}
      </p>
    </InviteFrame>
  )
}
