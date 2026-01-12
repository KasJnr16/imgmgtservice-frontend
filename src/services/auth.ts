import apiClient from './api';

export interface SignupRequestDTO {
  email: string;
  name: string;
  address: string;
  dateOfBirth: string;
  registeredDate: string;
  password: string;
  role: string;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface AuthTokenResponseDTO {
  token: string;
}

export async function signupAndLogin(payload: SignupRequestDTO): Promise<AuthTokenResponseDTO> {
  const { data } = await apiClient.post<AuthTokenResponseDTO>('/auth/signup-and-login', payload);
  return data;
}

export async function login(payload: LoginRequestDTO): Promise<AuthTokenResponseDTO> {
  const { data } = await apiClient.post<AuthTokenResponseDTO>('/auth/login', payload);
  return data;
}
