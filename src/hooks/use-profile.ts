import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getProfile,
  getProfileMeta,
  getTrainerProfilePreview,
  queryKeys,
  saveProfileDraft,
  upsertProfile,
  uploadProfileAvatar,
} from '../api'
import { getUserErrorMessage } from '../lib/user-error-message'
import type { ProfileDraftRequest, ProfileResponse, UpsertProfileRequest } from '../types/profile'

export function useTrainerProfilePreview(trainerUserId: string) {
  return useQuery({
    queryKey: ['profiles', 'trainer-preview', trainerUserId],
    queryFn: async () => getTrainerProfilePreview(trainerUserId),
    enabled: Boolean(trainerUserId),
    retry: false,
  })
}

export function useProfile(targetUserId: string) {
  const queryClient = useQueryClient()
  const cacheProfile = (profile: ProfileResponse) => {
    const resolvedUserId = profile.user_id || targetUserId
    queryClient.setQueryData(queryKeys.profiles.detail(resolvedUserId), profile)
    if (resolvedUserId !== targetUserId) {
      queryClient.setQueryData(queryKeys.profiles.detail(targetUserId), profile)
    }
  }

  const profileQuery = useQuery({
    queryKey: queryKeys.profiles.detail(targetUserId),
    queryFn: async () => getProfile(targetUserId),
    enabled: Boolean(targetUserId),
    retry: false,
    refetchOnMount: 'always',
  })

  const metaQuery = useQuery({
    queryKey: queryKeys.profiles.meta,
    queryFn: getProfileMeta,
    retry: false,
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: UpsertProfileRequest) => upsertProfile(targetUserId, payload),
    onSuccess: (profile) => {
      const resolvedUserId = profile.user_id || targetUserId
      cacheProfile(profile)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profiles.detail(resolvedUserId),
        exact: true,
      })
      toast.success('Профиль сохранен')
    },
    onError: (error) => {
      toast.error(getUserErrorMessage(error, 'Не удалось сохранить профиль.'))
    },
  })

  const draftMutation = useMutation({
    mutationFn: async (payload: ProfileDraftRequest) => saveProfileDraft(targetUserId, payload),
    onSuccess: cacheProfile,
    onError: (error) => {
      toast.error(getUserErrorMessage(error, 'Не удалось сохранить ответы.'))
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => uploadProfileAvatar(targetUserId, file),
    onSuccess: () => {
      toast.success('Аватар загружен')
    },
    onError: (error) => {
      toast.error(getUserErrorMessage(error, 'Не удалось загрузить аватар.'))
    },
  })

  return {
    profileQuery,
    metaQuery,
    draftMutation,
    upsertMutation,
    uploadAvatarMutation,
  }
}
