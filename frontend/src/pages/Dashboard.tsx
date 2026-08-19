import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, notesApi } from '../services/api';
import { Note } from '../types';
import { NoteCard } from '../components/NoteCard';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Stale request tracking
  const requestIdRef = useRef<number>(0);

  // Delete modal state & focus management
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadNotes = useCallback(async (search?: string): Promise<void> => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await notesApi.list({ search: search?.trim() || undefined });
      if (currentRequestId === requestIdRef.current) {
        setNotes(result.notes);
      }
    } catch (err: unknown) {
      if (currentRequestId === requestIdRef.current) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load notes. Please check your internet connection and try again.');
        }
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadNotes(debouncedSearch);
  }, [debouncedSearch, loadNotes]);

  // Modal open/close focus management & Escape key listener
  useEffect(() => {
    if (!noteToDelete) return;

    // Save element that had focus before opening modal
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // Focus cancel button inside modal
    const focusTimer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setNoteToDelete(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus on close
      lastFocusedElementRef.current?.focus();
    };
  }, [noteToDelete]);

  const handleCreateNote = (): void => {
    navigate('/notes/new');
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!noteToDelete) return;
    const noteId = noteToDelete._id || noteToDelete.id;
    if (!noteId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await notesApi.delete(noteId);
      setNotes((prev) => prev.filter((n) => (n._id || n.id) !== noteId));
      setNoteToDelete(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete note. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search notes"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button type="button" className="btn btn-primary" onClick={handleCreateNote}>
          ➕ Create Note
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner-danger" role="alert">
          <span>⚠️ {error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadNotes(debouncedSearch)}>
            🔄 Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading your notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">
            {debouncedSearch ? 'No matching notes found' : 'No notes yet'}
          </h3>
          <p className="empty-state-desc">
            {debouncedSearch
              ? `No notes matched "${debouncedSearch}". Try a different keyword.`
              : 'Create your first note to capture ideas, quick thoughts, or detailed notes!'}
          </p>
          {!debouncedSearch && (
            <button type="button" className="btn btn-primary" onClick={handleCreateNote}>
              ✨ Create your first note
            </button>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <NoteCard
              key={note._id || note.id}
              note={note}
              onDeleteRequest={(n) => {
                setDeleteError(null);
                setNoteToDelete(n);
              }}
              isDeleting={isDeleting && (noteToDelete?._id || noteToDelete?.id) === (note._id || note.id)}
            />
          ))}
        </div>
      )}

      {/* Accessible Delete Confirmation Dialog */}
      {noteToDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-desc"
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3 id="delete-modal-title">Confirm Delete</h3>
            </div>
            <div className="modal-body" id="delete-modal-desc">
              {deleteError && (
                <div className="alert-banner alert-banner-danger" role="alert">
                  <span>⚠️ {deleteError}</span>
                </div>
              )}
              <p>
                Are you sure you want to delete <strong>"{noteToDelete.title}"</strong>?
              </p>
              <p className="text-muted text-sm">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                ref={cancelButtonRef}
                type="button"
                className="btn btn-secondary"
                onClick={() => setNoteToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
