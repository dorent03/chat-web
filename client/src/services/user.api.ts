import api from './api';
import type { User } from '../types';

/** Get a user by ID */
export async function getUser(id: string): Promise<User> {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
}

/** Update current user profile */
export async function updateProfile(data: {
  username?: string;
  email?: string;
  avatar_url?: string | null;
}): Promise<User> {
  const response = await api.patch<User>('/users/me', data);
  return response.data;
}

/** Change current user password */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.patch('/users/me/password', data);
}

/** Search users by username */
export async function searchUsers(query: string): Promise<User[]> {
  const response = await api.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  return response.data;
}

/** Upload an avatar image */
export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await api.post<User>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
