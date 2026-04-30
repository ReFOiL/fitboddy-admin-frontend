import { apiClient } from './client'
import type { AvatarUploadResponse, ProfileMetaResponse, ProfileResponse, UpsertProfileRequest } from '../types/profile'

export async function getProfile(userId: string): Promise<ProfileResponse> {
  const { data } = await apiClient.get<ProfileResponse>(`/api/v1/profiles/${encodeURIComponent(userId)}`)
  return data
}

export async function upsertProfile(userId: string, payload: UpsertProfileRequest): Promise<ProfileResponse> {
  const { data } = await apiClient.put<ProfileResponse>(`/api/v1/profiles/${encodeURIComponent(userId)}`, payload)
  return data
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<AvatarUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<AvatarUploadResponse>(`/api/v1/profiles/${encodeURIComponent(userId)}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getProfileMeta(): Promise<ProfileMetaResponse> {
  const { data } = await apiClient.get<ProfileMetaResponse>('/api/v1/profiles/meta')
  return data
}
