import { ArrowLeft, MapPin, UserRound } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { QueryState } from '../components/shared'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'
import { useTrainerProfilePreview } from '../hooks/use-profile'

export function TrainerProfilePreviewPage() {
  const { user } = useAuth()
  const { trainerUserId = '' } = useParams()
  const profileQuery = useTrainerProfilePreview(trainerUserId)

  if (user?.role !== 'client') {
    return <Navigate to={APP_PATHS.home} replace />
  }

  if (profileQuery.isLoading) {
    return <Skeleton className="mx-auto h-80 w-full max-w-xl rounded-2xl" />
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Button asChild variant="secondary">
          <Link to={APP_PATHS.trainers}>
            <ArrowLeft size={16} />
            К тренерам
          </Link>
        </Button>
        <QueryState
          isError
          errorTitle="Не удалось открыть профиль тренера"
          onRetry={() => void profileQuery.refetch()}
        >
          {null}
        </QueryState>
      </div>
    )
  }

  const profile = profileQuery.data
  const name = profile.full_name?.trim() || 'Тренер'

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <Button asChild variant="secondary" className="h-11">
        <Link to={APP_PATHS.trainers}>
          <ArrowLeft size={16} />
          К тренерам
        </Link>
      </Button>

      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="items-center bg-gradient-to-b from-primary/10 to-transparent text-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`Фото тренера ${name}`}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-background"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-primary ring-4 ring-background">
              <UserRound size={42} aria-hidden />
            </div>
          )}
          <CardTitle className="mt-2">{name}</CardTitle>
          <CardDescription>Профиль тренера</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5">
          <section>
            <h2 className="mb-1 text-sm font-medium">Город</h2>
            <p className="flex items-center gap-2 text-sm text-secondary-foreground">
              <MapPin size={16} className="shrink-0 text-primary" aria-hidden />
              {profile.city?.trim() || 'Не указан'}
            </p>
          </section>
          <section>
            <h2 className="mb-1 text-sm font-medium">О тренере</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-secondary-foreground">
              {profile.bio?.trim() || 'Тренер пока не добавил описание.'}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
