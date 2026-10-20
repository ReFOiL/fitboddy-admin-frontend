import { AlertBanner } from '../components/shared'
import { Button } from '../components/ui/button'
import { PageTitle, Row } from '../components/ui/kit'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'

const moreLinks = [
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

export function MorePage() {
  const { logoutMutation } = useAuth()

  return (
    <section className="mx-auto max-w-lg" aria-labelledby="more-title">
      <PageTitle>
        <span id="more-title">Ещё</span>
      </PageTitle>
      <div className="mt-4 border-t border-border">
        {moreLinks.map((item) => (
          <Row key={item.path} title={item.label} subtitle={item.description} href={item.path} />
        ))}
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
