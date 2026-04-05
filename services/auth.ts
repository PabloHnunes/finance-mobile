import { api, saveTokens, clearTokens } from './api';

interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

interface CreateUserRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  cpf: string;
  birthDate: string;
  street: string;
  neighborhood: string;
  state: string;
  city: string;
  number: string;
  zipCode: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  cpf: string;
  birthDate: string;
  street: string;
  neighborhood: string;
  state: string;
  city: string;
  number: string;
  zipCode: string;
  createdAt: string;
  updatedAt: string;
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', credentials);
  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function register(userData: CreateUserRequest): Promise<User> {
  const { data } = await api.post<User>('/users', userData);
  return data;
}

export async function logout(): Promise<void> {
  await clearTokens();
}
