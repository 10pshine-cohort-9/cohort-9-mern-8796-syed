import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NoteEditorPage } from '../NoteEditorPage';
import { notesApi } from '../../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api', () => ({
  notesApi: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public message: string, public statusCode: number = 400) {
      super(message);
    }
  },
}));

describe('NoteEditorPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderInCreateMode = () => {
    return render(
      <BrowserRouter>
        <NoteEditorPage />
      </BrowserRouter>
    );
  };

  const renderInEditMode = (id = 'note-123') => {
    window.history.pushState({}, 'Edit Note', `/notes/${id}/edit`);
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/notes/:id/edit" element={<NoteEditorPage />} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('renders in create mode without fetching initial data', () => {
    renderInCreateMode();

    expect(screen.getByRole('heading', { name: 'Create New Note' })).toBeInTheDocument();
    expect(notesApi.getById).not.toHaveBeenCalled();
  });

  it('fetches existing note details and populates form in edit mode', async () => {
    vi.mocked(notesApi.getById).mockResolvedValueOnce({
      note: {
        _id: 'note-123',
        title: 'Existing Note Title',
        content: 'Existing Note Content',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
      },
    });

    renderInEditMode('note-123');

    expect(screen.getByText('Loading note details...')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Note Title');
    expect(screen.getByLabelText(/content/i)).toHaveValue('Existing Note Content');
  });

  it('displays error card when fetching note details fails in edit mode', async () => {
    vi.mocked(notesApi.getById).mockRejectedValueOnce(new Error('Note not found'));

    renderInEditMode('missing-note');

    expect(await screen.findByText(/Failed to load note details/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  it('creates new note and navigates home when submitting in create mode', async () => {
    vi.mocked(notesApi.create).mockResolvedValueOnce({
      note: {
        _id: 'new-note-id',
        title: 'Created Title',
        content: 'Created Content',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
      },
    });

    renderInCreateMode();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Created Title' } });
    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: 'Created Content' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Note' }));

    await waitFor(() => {
      expect(notesApi.create).toHaveBeenCalledWith({
        title: 'Created Title',
        content: 'Created Content',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
