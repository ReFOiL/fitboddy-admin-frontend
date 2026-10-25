import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { InviteClientSheet } from '../components/trainer/InviteClientSheet'
import { QueryState } from '../components/shared'
import { Button } from '../components/ui/button'
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
  const link = inviteLinkQuery.data
  const inviteUrl = link ? absoluteInviteUrl(link.invite_path || `/i/${link.code}`) : ''

  const copyLink = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Не удалось скопировать. Выделите ссылку вручную.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
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
        <div className="px-1 py-8">
          <p className="text-center text-[17px] text-secondary-foreground">Постоянная ссылка для новых клиентов</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex h-14 items-center justify-center rounded-2xl border border-border bg-card px-4 font-mono text-[22px] font-bold tracking-[0.28em]">
              {link.code}
            </p>
            <Button type="button" size="lg" className="h-14 flex-1" onClick={() => void copyLink()}>
              Скопировать ссылку
            </Button>
          </div>
          <p className="mt-4 break-all text-center text-[15px] text-secondary-foreground">{inviteUrl}</p>
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
