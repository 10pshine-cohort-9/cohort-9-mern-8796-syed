import { ApiError, authApi, notesApi, setOnUnauthorizedCallback } from '../api';

describe('api.ts service layer', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    setOnUnauthorizedCallback(null);
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('ApiError', () => {
    it('creates an instance of ApiError with message and status', () => {
      const err = new ApiError('Not found', 404);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.name).toBe('ApiError');
      expect(err.message).toBe('Not found');
      expect(err.status).toBe(404);
    });
  });

  describe('request helper via authApi', () => {
    it('includes Authorization header when token is stored in localStorage', async () => {
      localStorage.setItem('token', 'fake-jwt-token');

      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Success',
          data: { user: { id: '1', name: 'Test', email: 'test@example.com', createdAt: '', updatedAt: '' } },
        }),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      try {
        const res = await authApi.getMe();
        expect(res.user.name).toBe('Test');
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/auth/me'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer fake-jwt-token',
              'Content-Type': 'application/json',
            }),
          })
        );
      } catch (err: unknown) {
        expect(err).toBeUndefined();
      }
    });

    it('throws Network ApiError when fetch rejects', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

      await expect(authApi.getMe()).rejects.toThrow(ApiError);
      await expect(authApi.getMe()).rejects.toThrow('Network error');
    });

    it('re-throws ApiError intact if fetch throws ApiError instance', async () => {
      const apiErr = new ApiError('Custom error', 500);
      globalThis.fetch = jest.fn().mockRejectedValue(apiErr) as unknown as typeof fetch;

      await expect(authApi.getMe()).rejects.toThrow(apiErr);
    });

    it('throws ApiError when response JSON parsing fails', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      } as unknown as Response) as unknown as typeof fetch;

      await expect(authApi.getMe()).rejects.toThrow('An unexpected server response was received.');
    });

    it('throws ApiError when parsed json is not an object', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => 'string response',
      } as unknown as Response) as unknown as typeof fetch;

      await expect(authApi.getMe()).rejects.toThrow('An unexpected server response was received.');
    });

    it('triggers onUnauthorizedCallback on 401 response status', async () => {
      const mockCallback = jest.fn();
      setOnUnauthorizedCallback(mockCallback);

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Unauthorized access token',
        }),
      } as unknown as Response) as unknown as typeof fetch;

      await expect(authApi.getMe()).rejects.toThrow('Unauthorized access token');
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('uses fallback error message when success is false without custom message', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
        }),
      } as unknown as Response) as unknown as typeof fetch;

      await expect(authApi.getMe()).rejects.toThrow('Request failed with status 400');
    });
  });

  describe('authApi methods', () => {
    it('register calls POST /auth/register', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: { token: 't1', user: { id: '1', name: 'N', email: 'e@test.com', createdAt: '', updatedAt: '' } },
        }),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const res = await authApi.register({ name: 'N', email: 'e@test.com', password: 'password123' });
      expect(res.token).toBe('t1');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('login calls POST /auth/login', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { token: 't1', user: { id: '1', name: 'N', email: 'e@test.com', createdAt: '', updatedAt: '' } },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await authApi.login({ email: 'e@test.com', password: 'password123' });
      expect(res.token).toBe('t1');
    });

    it('updateProfile calls PUT /auth/profile', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { user: { id: '1', name: 'New Name', email: 'e@test.com', createdAt: '', updatedAt: '' } },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await authApi.updateProfile({ name: 'New Name', email: 'e@test.com' });
      expect(res.user.name).toBe('New Name');
    });

    it('changePassword calls PUT /auth/change-password', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { token: 'new-token' },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await authApi.changePassword({ currentPassword: 'p1', newPassword: 'p2' });
      expect(res.token).toBe('new-token');
    });

    it('logout calls POST /auth/logout', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { userId: '1' },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await authApi.logout();
      expect(res.userId).toBe('1');
    });
  });

  describe('notesApi methods', () => {
    it('list appends query params when provided', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { notes: [], total: 0, page: 1, limit: 10, totalPages: 0 },
        }),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await notesApi.list({ search: 'query', page: 2, limit: 5, sortBy: 'title', sortOrder: 'asc' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notes?search=query&page=2&limit=5&sortBy=title&sortOrder=asc'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('list calls /notes without params when query is empty', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { notes: [], total: 0, page: 1, limit: 10, totalPages: 0 },
        }),
      } as unknown as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await notesApi.list();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/notes$/),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('getById calls GET /notes/:id', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { note: { id: 'n1', title: 'Note 1', content: 'Content', userId: 'u1', createdAt: '', updatedAt: '' } },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await notesApi.getById('n1');
      expect(res.note.id).toBe('n1');
    });

    it('create calls POST /notes', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: { note: { id: 'n1', title: 'Title', content: 'Content', userId: 'u1', createdAt: '', updatedAt: '' } },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await notesApi.create({ title: 'Title', content: 'Content' });
      expect(res.note.title).toBe('Title');
    });

    it('update calls PUT /notes/:id', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { note: { id: 'n1', title: 'Updated Title', content: 'Content', userId: 'u1', createdAt: '', updatedAt: '' } },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await notesApi.update('n1', { title: 'Updated Title' });
      expect(res.note.title).toBe('Updated Title');
    });

    it('delete calls DELETE /notes/:id', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { message: 'Note deleted', noteId: 'n1' },
        }),
      } as unknown as Response) as unknown as typeof fetch;

      const res = await notesApi.delete('n1');
      expect(res.noteId).toBe('n1');
    });
  });
});
