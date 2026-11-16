import { AlertBanner } from '../components/shared'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { Button } from '../components/ui/button'
import { PageTitle, Row } from '../components/ui/kit'
import { APP_PATHS } from '../config'
import { useTrainerRelationActions, useTrainerRelations, useUserIdGuard } from '../hooks'
import { useAuth } from '../hooks/use-auth'
import { cn } from '../lib/utils'

const clientLinks = [
  {
    label: 'План',
    description: 'Расписание и параметры плана',
    path: APP_PATHS.planGeneration,
  },
  {
    label: 'Профиль',
    description: 'Личные данные',
    path: APP_PATHS.profile,
  },
] as const

const trainerLinks = [
  {
    label: 'Как это работает',
    description: 'От приглашения до сохранённого плана',
    path: APP_PATHS.howItWorks,
  },
  {
    label: 'Аналитика',
    description: 'Сводка по клиентам',
    path: APP_PATHS.analytics,
  },
  {
    label: 'Настройки плана',
    description: 'Правила для новых планов',
    path: APP_PATHS.planRules,
  },
  {
    label: 'Пригласить клиента',
    description: 'Постоянная ссылка и код',
    path: APP_PATHS.trainerInvite,
  },
  {
    label: 'Профиль',
    description: 'Имя, фото и описание',
    path: APP_PATHS.profile,
  },
] as const

export function MorePage() {
  const { user, logoutMutation } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const trainerUserId = isTrainer ? (user?.user_id ?? '') : ''
  const { withUserId } = useUserIdGuard()
  const { trainerPublicationStatusQuery, upsertDiscoveryProfileMutation, leaveRelationMutation } = useTrainerRelations({
    trainerUserId,
  })
  const { togglePublication } = useTrainerRelationActions({
    withUserId,
    upsertDiscoveryProfileMutation,
    leaveRelationMutation,
  })
  const published = Boolean(trainerPublicationStatusQuery.data?.is_published)
  const publicationPending = upsertDiscoveryProfileMutation.isPending
  const links = isTrainer ? trainerLinks : clientLinks

  return (
    <section className="mx-auto max-w-lg" aria-labelledby="more-title">
      <PageTitle>
        <span id="more-title">Ещё</span>
      </PageTitle>
      <div className="mt-4 border-t border-border">
        {links.map((item) => (
          <Row key={item.path} title={item.label} subtitle={item.description} href={item.path} />
        ))}
        {isTrainer ? (
          <button
            type="button"
            role="switch"
            aria-checked={published}
            aria-label="Показывать в каталоге"
            className="flex min-h-16 w-full items-center justify-between gap-3 border-b border-border px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
            disabled={publicationPending || trainerPublicationStatusQuery.isLoading}
            onClick={() => togglePublication(!published)}
          >
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold">Показывать в каталоге</span>
              <span className="mt-0.5 block text-[15px] text-secondary-foreground">
                {trainerPublicationStatusQuery.isLoading
                  ? 'Проверяем статус…'
                  : published
                    ? 'Клиенты видят вас в поиске'
                    : 'Скрыто из поиска клиентов'}
              </span>
            </span>
            <span
              className={cn(
                'inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold',
                published ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
              )}
            >
              {published ? 'Вкл' : 'Выкл'}
            </span>
          </button>
        ) : null}
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-1 py-3">
          <span>
            <span className="block text-[17px] font-semibold">Тема</span>
            <span className="mt-0.5 block text-[15px] text-secondary-foreground">Светлая или тёмная</span>
          </span>
          <ThemeToggle />
        </div>
      </div>

      {logoutMutation.isError ? (
        <AlertBanner tone="destructive" title="Не удалось выйти" role="alert">
          Проверьте соединение и попробуйте ещё раз.
        </AlertBanner>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="mt-6 w-full"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
      >
        {logoutMutation.isPending ? 'Выходим…' : 'Выйти'}
      </Button>
    </section>
  )
}
