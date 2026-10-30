import { useQuery } from '@tanstack/react-query'

import { previewTrainerCatalogSync } from '../api/exercises'
import { queryKeys } from '../api/queryKeys'
import { catalogSyncHasPendingChanges } from '../lib/catalog-sync'

const CATALOG_SYNC_ATTENTION_STALE_MS = 60_000

export type CatalogSyncAttentionStatus = 'loading' | 'ready' | 'error'

export function useCatalogSyncAttention(trainerUserId: string): {
  showDot: boolean
  status: CatalogSyncAttentionStatus
} {
  const previewQuery = useQuery({
    queryKey: queryKeys.exercises.catalogSyncPreview(trainerUserId),
    queryFn: () => previewTrainerCatalogSync(trainerUserId),
    enabled: trainerUserId.length > 0,
    retry: false,
    staleTime: CATALOG_SYNC_ATTENTION_STALE_MS,
    select: catalogSyncHasPendingChanges,
  })

  // Повторный запрос может упасть, не стирая уже известный ответ. Точка остаётся на последнем предпросмотре.
  if (previewQuery.data !== undefined) return { showDot: previewQuery.data, status: 'ready' }
  if (previewQuery.isError) return { showDot: false, status: 'error' }
  return { showDot: false, status: 'loading' }
}
