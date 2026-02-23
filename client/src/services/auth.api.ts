import api from './api';
import type { AuthResponse, User } from '../types';

/** Register a new user */
export async function register(data: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
}

/** Login with email and password */
export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data);
  return response.data;
}

/** Logout the current user */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/** Refresh the access token using the httpOnly refresh cookie */
export async function refreshToken(): Promise<{ accessToken: string }> {
  const response = await api.post<{ accessToken: string }>('/auth/refresh');
  return response.data;
}

/** Get the currently authenticated user */
export async function getMe(): Promise<User> {
  const response = await api.get<User>('/users/me');
  return response.data;
}
