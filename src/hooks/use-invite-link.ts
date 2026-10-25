import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getMyInviteLink, rotateMyInviteLink } from '../api/relations'
import { queryKeys } from '../api/queryKeys'
import { getUserErrorMessage } from '../lib/user-error-message'

export function useTrainerInviteLink() {
  const queryClient = useQueryClient()
  const inviteLinkQuery = useQuery({
    queryKey: queryKeys.relations.inviteLink,
    queryFn: getMyInviteLink,
  })
  const rotateInviteLinkMutation = useMutation({
    mutationFn: rotateMyInviteLink,
    onSuccess: (link) => {
      queryClient.setQueryData(queryKeys.relations.inviteLink, link)
      toast.success('Код обновлён')
    },
    onError: (error) => {
      toast.error(getUserErrorMessage(error, 'Не удалось обновить код.'))
    },
  })

  return { inviteLinkQuery, rotateInviteLinkMutation }
}
