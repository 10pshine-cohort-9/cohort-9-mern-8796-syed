export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface SuccessApiResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
}

export interface ErrorApiResponse {
  success: false;
  message: string;
}

export type ApiResponse<T = unknown> = SuccessApiResponse<T> | ErrorApiResponse;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface Note {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotesListResult {
  notes: Note[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface CreateNoteInput {
  title: string;
  content: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
}

