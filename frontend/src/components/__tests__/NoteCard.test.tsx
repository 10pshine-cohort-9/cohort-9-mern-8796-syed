import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NoteCard } from '../NoteCard';
import { Note } from '../../types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NoteCard Component', () => {
  const sampleNote: Note = {
    _id: 'note-123',
    id: 'note-123',
    title: 'Project Architecture Notes',
    content: '<b>Important</b> content for project planning',
    createdAt: '2026-08-15T12:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
    userId: 'user-456',
  };

  const mockDeleteRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (isDeleting = false): ReturnType<typeof render> => {
    return render(
      <BrowserRouter>
        <NoteCard note={sampleNote} onDeleteRequest={mockDeleteRequest} isDeleting={isDeleting} />
      </BrowserRouter>
    );
  };

  it('renders title, formatted date, and HTML-stripped content preview', () => {
    renderComponent();

    expect(screen.getByText('Project Architecture Notes')).toBeInTheDocument();
    expect(screen.getByText(/Important content for project planning/)).toBeInTheDocument();
    expect(screen.getByText(/Aug 15, 2026/)).toBeInTheDocument();
  });

  it('navigates to edit page when clicking the title link', () => {
    renderComponent();

    const titleBtn = screen.getByRole('button', { name: /open note: project architecture notes/i });
    fireEvent.click(titleBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/notes/note-123/edit');
  });

  it('navigates to edit page when clicking the Edit button', () => {
    renderComponent();

    const editBtn = screen.getByRole('button', { name: /edit note project architecture notes/i });
    fireEvent.click(editBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/notes/note-123/edit');
  });

  it('calls onDeleteRequest when clicking the Delete button', () => {
    renderComponent();

    const deleteBtn = screen.getByRole('button', { name: /delete note project architecture notes/i });
    fireEvent.click(deleteBtn);

    expect(mockDeleteRequest).toHaveBeenCalledWith(sampleNote);
  });

  it('disables delete button and shows deleting text when isDeleting is true', () => {
    renderComponent(true);

    const deleteBtn = screen.getByRole('button', { name: /delete note project architecture notes/i });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveTextContent('Deleting...');
  });
});
