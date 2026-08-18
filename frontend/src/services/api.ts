import { ApiResponse, AuthResult, LoginInput, RegisterInput, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (callback: (() => void) | null): void => {
  onUnauthorizedCallback = callback;
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error. Please check your internet connection or server availability.', 0);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new ApiError('An unexpected server response was received.', response.status);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ApiError('An unexpected server response was received.', response.status);
  }

  const data = parsed as ApiResponse<T>;

  if (!response.ok || !data.success) {
    const errorMessage = data.message || `Request failed with status ${response.status}`;

    if (response.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }

    throw new ApiError(errorMessage, response.status);
  }

  return (data.data !== undefined ? data.data : (data as unknown)) as T;
}

export const authApi = {
  register: async (input: RegisterInput): Promise<AuthResult> => {
    return request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  login: async (input: LoginInput): Promise<AuthResult> => {
    return request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getMe: async (): Promise<{ user: User }> => {
    return request<{ user: User }>('/auth/me', {
      method: 'GET',
    });
  },

  logout: async (): Promise<{ userId: string }> => {
    return request<{ userId: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};
