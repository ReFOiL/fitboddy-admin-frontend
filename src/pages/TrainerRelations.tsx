import { useDeferredValue, useState } from 'react'

import { useAuth } from '../hooks/use-auth'
import { useRelations } from '../hooks/use-relations'
import { TrainerClientsCard } from '../components/trainer-relations/TrainerClientsCard'
import { TrainerVisibilityCard } from '../components/trainer-relations/TrainerVisibilityCard'

export function TrainerRelationsPage() {
  const { user } = useAuth()
  const trainerUserId = user?.role === 'trainer' ? user.user_id : ''
  const [myClientsPage, setMyClientsPage] = useState(1)
  const [myClientsSearch, setMyClientsSearch] = useState('')
  const myClientsSearchDeferred = useDeferredValue(myClientsSearch)

  const { trainerClientsPaginatedQuery, trainerPublicationStatusQuery, upsertDiscoveryProfileMutation, leaveRelationMutation } = useRelations({
    trainerUserId,
    clientUserId: '',
    trainerClientsPage: {
      status: 'active',
      page: myClientsPage,
      pageSize: 6,
      search: myClientsSearchDeferred,
    },
  })

  const selfVisibleAsTrainer = Boolean(trainerPublicationStatusQuery.data?.is_published)
  const trainerVisibilityLabel = trainerPublicationStatusQuery.isLoading
    ? 'Проверяем...'
    : trainerPublicationStatusQuery.isError
      ? 'Не удалось определить'
      : selfVisibleAsTrainer
        ? 'Виден клиентам'
        : 'Не опубликован'
  const trainerVisibilityToggleDisabled =
    upsertDiscoveryProfileMutation.isPending || trainerPublicationStatusQuery.isLoading || trainerPublicationStatusQuery.isError

  const myClientsPageData = trainerClientsPaginatedQuery.data
  const myClients = myClientsPageData?.items ?? []
  const myClientsTotal = myClientsPageData?.total ?? 0
  const myClientsTotalPages = myClientsPageData?.total_pages ?? 1
  const myClientsPageSize = myClientsPageData?.page_size ?? 6
  const myClientsRangeStart = myClientsTotal === 0 ? 0 : (myClientsPage - 1) * myClientsPageSize + 1
  const myClientsRangeEnd = Math.min(myClientsPage * myClientsPageSize, myClientsTotal)

  return (
    <div className="space-y-6">
      <TrainerVisibilityCard
        visibilityLabel={trainerVisibilityLabel}
        selfVisibleAsTrainer={selfVisibleAsTrainer}
        disabled={trainerVisibilityToggleDisabled}
        onToggle={() => {
          if (!user?.user_id) return
          upsertDiscoveryProfileMutation.mutate({
            userId: user.user_id,
            payload: {
              role: 'trainer',
              is_visible: !selfVisibleAsTrainer,
            },
          })
        }}
      />

      <TrainerClientsCard
        searchValue={myClientsSearch}
        onSearchChange={(value) => {
          setMyClientsSearch(value)
          setMyClientsPage(1)
        }}
        total={myClientsTotal}
        page={myClientsPage}
        totalPages={myClientsTotalPages}
        rangeStart={myClientsRangeStart}
        rangeEnd={myClientsRangeEnd}
        isLoading={trainerClientsPaginatedQuery.isLoading}
        isError={trainerClientsPaginatedQuery.isError}
        clients={myClients}
        leaveDisabled={leaveRelationMutation.isPending}
        onLeaveClient={(relationId) => {
          if (!user?.user_id) return
          leaveRelationMutation.mutate({
            relationId,
            actingUserId: user.user_id,
          })
        }}
        onClearSearch={() => {
          setMyClientsSearch('')
          setMyClientsPage(1)
        }}
        onPrevPage={() => setMyClientsPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setMyClientsPage((current) => Math.min(myClientsTotalPages, current + 1))}
      />
    </div>
  )
}
