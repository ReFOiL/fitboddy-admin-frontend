import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Dumbbell, Video } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { getTrainerExercise, queryKeys } from '../api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { APP_PATHS } from '../config'
import { useAuth } from '../hooks/use-auth'

export function ClientExerciseDetailsPage() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const { rowId } = useParams<{ rowId: string }>()
  const [searchParams] = useSearchParams()
  const trainerUserId = searchParams.get('trainer') ?? ''

  const exerciseQuery = useQuery({
    queryKey: queryKeys.exercises.trainerExercise(trainerUserId, rowId ?? ''),
    queryFn: async () => getTrainerExercise(trainerUserId, rowId ?? ''),
    enabled: Boolean(isClient && trainerUserId && rowId),
    retry: false,
  })

  const exercise = exerciseQuery.data

  if (!isClient) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            Упражнение
          </CardTitle>
          <CardDescription>Этот раздел доступен только клиентам.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!rowId || !trainerUserId) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Упражнение не выбрано</CardTitle>
          <CardDescription>Открой упражнение из своего плана.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild type="button" variant="secondary" size="sm">
            <Link to={APP_PATHS.planGeneration}>
              <ArrowLeft size={14} />
              К плану
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild type="button" variant="secondary" size="sm">
        <Link to={APP_PATHS.planGeneration}>
          <ArrowLeft size={14} />
          Назад к плану
        </Link>
      </Button>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={18} className="text-primary" />
            {exercise?.exercise_name ?? 'Упражнение'}
          </CardTitle>
          <CardDescription>Подробности упражнения из каталога твоего тренера.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {exerciseQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : null}
          {exerciseQuery.isError ? (
            <span className="text-sm text-destructive">Не удалось загрузить упражнение.</span>
          ) : null}
          {!exerciseQuery.isLoading && !exerciseQuery.isError && exercise ? (
            <>
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
                <div className="mb-2 text-sm font-medium">Описание</div>
                {exercise.description?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm text-secondary-foreground">{exercise.description}</p>
                ) : (
                  <span className="text-sm text-secondary-foreground">Тренер пока не добавил описание.</span>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Video size={16} className="text-primary" />
                  Видео
                </div>
                {exercise.video_url ? (
                  <video
                    key={exercise.video_url}
                    src={exercise.video_url}
                    controls
                    className="max-h-96 w-full rounded-xl border border-border/60 bg-background/40"
                  />
                ) : (
                  <span className="text-sm text-secondary-foreground">Видео пока не загружено.</span>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
