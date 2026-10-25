import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { InviteClientSheet } from '../components/trainer/InviteClientSheet'
import { QueryState } from '../components/shared'
import { ConfirmSheet, OverflowMenu, ScreenHeader } from '../components/ui/kit'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useTrainerInviteLink } from '../hooks/use-invite-link'
import { useTrainerRelations } from '../hooks/use-relations'
import { absoluteInviteUrl } from '../lib/invite'

export function TrainerInviteLinkPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const { inviteLinkQuery, rotateInviteLinkMutation } = useTrainerInviteLink()
  const relations = useTrainerRelations({ trainerUserId })
  const [rotateOpen, setRotateOpen] = useState(false)
  const [loginInviteOpen, setLoginInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)
  const link = inviteLinkQuery.data
  const inviteUrl = link ? absoluteInviteUrl(link.invite_path || `/i/${link.code}`) : ''

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  const markCopied = () => {
    setCopied(true)
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => {
      setCopied(false)
      copiedTimer.current = null
    }, 2000)
  }

  const copyLink = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      markCopied()
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Не удалось скопировать. Выделите ссылку вручную.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg md:mt-8 md:rounded-2xl md:border md:border-border md:bg-card">
      <ScreenHeader
        title="Приглашение"
        backLabel="К клиентам"
        onBack={() => navigate(APP_PATHS.clients)}
        menu={
          link ? (
            <OverflowMenu
              label="Ещё действия"
              items={[
                {
                  id: 'rotate',
                  label: 'Обновить код',
                  hint: 'Старая ссылка перестанет работать',
                  onSelect: () => setRotateOpen(true),
                },
                {
                  id: 'by-login',
                  label: 'Пригласить по логину',
                  onSelect: () => setLoginInviteOpen(true),
                },
              ]}
            />
          ) : null
        }
      />

      {inviteLinkQuery.isLoading ? <p className="px-1 py-8 text-[17px]">Загрузка…</p> : null}
      {inviteLinkQuery.isError ? (
        <div className="mt-4">
          <QueryState
            isError
            errorTitle="Не удалось получить ссылку"
            onRetry={() => void inviteLinkQuery.refetch()}
          >
            {null}
          </QueryState>
        </div>
      ) : null}

      {link ? (
        <div className="px-1 py-8 md:px-5 md:pb-8 md:pt-6">
          <p className="text-center text-[17px] text-secondary-foreground">Постоянная ссылка для новых клиентов</p>
          <p className="mt-6 flex h-14 items-center justify-center rounded-2xl border border-border bg-card px-4 font-mono text-[22px] font-bold tracking-[0.28em] md:bg-background">
            {link.code}
          </p>
          <div className="mt-4 flex min-h-14 items-center rounded-2xl border border-border bg-card pl-4 pr-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-focus md:bg-background">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="min-w-0 flex-1 break-all py-3 text-left text-[15px] leading-snug focus-visible:outline-none"
            >
              {inviteUrl}
            </button>
            <button
              type="button"
              aria-label={copied ? 'Скопировано' : 'Скопировать ссылку'}
              onClick={() => void copyLink()}
              className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 text-accent-ink hover:bg-secondary focus-visible:outline-none"
            >
              {copied ? <Check size={18} aria-hidden /> : <Copy size={20} aria-hidden />}
              {copied ? <span className="text-[13px] font-semibold">Скопировано</span> : null}
            </button>
          </div>
        </div>
      ) : null}

      {rotateOpen ? (
        <ConfirmSheet
          title="Обновить код"
          body="Старая ссылка перестанет работать."
          confirmLabel="Обновить"
          pending={rotateInviteLinkMutation.isPending}
          onClose={() => setRotateOpen(false)}
          onConfirm={() => {
            rotateInviteLinkMutation.mutate(undefined, {
              onSuccess: () => setRotateOpen(false),
            })
          }}
        />
      ) : null}

      {loginInviteOpen ? (
        <InviteClientSheet
          trainerUserId={trainerUserId}
          pending={relations.createRelationMutation.isPending}
          published={Boolean(relations.trainerPublicationStatusQuery.data?.is_published)}
          publicationPending={relations.upsertDiscoveryProfileMutation.isPending}
          onTogglePublication={() =>
            relations.upsertDiscoveryProfileMutation.mutate({
              userId: trainerUserId,
              payload: { role: 'trainer', is_visible: !relations.trainerPublicationStatusQuery.data?.is_published },
            })
          }
          onClose={() => setLoginInviteOpen(false)}
          onInvite={(clientUserId) =>
            relations.createRelationMutation.mutate(
              { trainer_user_id: trainerUserId, client_user_id: clientUserId, mode: 'invite' },
              { onSuccess: () => setLoginInviteOpen(false) },
            )
          }
        />
      ) : null}
    </div>
  )
}
