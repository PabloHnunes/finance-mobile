import { api } from './api';

export interface User {
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
  profileImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  street?: string;
  neighborhood?: string;
  state?: string;
  city?: string;
  number?: string;
  zipCode?: string;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const { data: user } = await api.put<User>(`/users/${id}`, data);
  return user;
}

export async function uploadProfileImage(id: string, imageUri: string): Promise<User> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() ?? 'profile.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('file', { uri: imageUri, name: filename, type } as any);
  const { data: user } = await api.put<User>(`/users/${id}/profile-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return user;
}
