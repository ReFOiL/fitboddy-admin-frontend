export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  profiles: {
    detail: (userId: string) => ['profiles', 'detail', userId] as const,
    meta: ['profiles', 'meta'] as const,
  },
  relations: {
    trainerClients: (trainerUserId: string, status: string) => ['relations', 'trainer-clients', trainerUserId, status] as const,
    trainerClientsPaginated: (
      trainerUserId: string,
      status: string,
      page: number,
      pageSize: number,
      search: string,
    ) => ['relations', 'trainer-clients-paginated', trainerUserId, status, page, pageSize, search] as const,
    trainerFunnel: (trainerUserId: string) => ['relations', 'trainer-funnel', trainerUserId] as const,
    trainerPublicationStatus: (trainerUserId: string) =>
      ['relations', 'trainer-publication-status', trainerUserId] as const,
    clientActiveRelation: (clientUserId: string) => ['relations', 'client-active-relation', clientUserId] as const,
    trainers: ['relations', 'trainers'] as const,
    incomingInvites: (clientUserId: string) => ['relations', 'incoming-invites', clientUserId] as const,
  },
  exercises: {
    trainerCatalog: (trainerUserId: string, includeArchived: boolean) =>
      ['exercises', 'trainer-catalog', trainerUserId, includeArchived ? 'all' : 'active'] as const,
    trainerExercise: (trainerUserId: string, rowId: string) =>
      ['exercises', 'trainer-exercise', trainerUserId, rowId] as const,
    platformExercise: (rowId: string) => ['exercises', 'platform-exercise', rowId] as const,
    platformCatalog: ['exercises', 'platform-catalog'] as const,
  },
  plans: {
    activeByUser: (userId: string) => ['plans', 'active-by-user', userId] as const,
    today: ['plans', 'today'] as const,
    clientLoads: (clientUserId: string, trainerUserId: string) =>
      ['plans', 'client-loads', clientUserId, trainerUserId] as const,
    clientPlatformLoads: (clientUserId: string) => ['plans', 'client-platform-loads', clientUserId] as const,
  },
}
