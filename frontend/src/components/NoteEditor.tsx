import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { CreateNoteInput } from '../types';

interface NoteEditorProps {
  initialTitle?: string;
  initialContent?: string;
  isSubmitting?: boolean;
  error?: string | null;
  mode: 'create' | 'edit';
  onSubmit: (data: CreateNoteInput) => Promise<void>;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  initialTitle = '',
  initialContent = '',
  isSubmitting = false,
  error = null,
  mode,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string }>({});
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [localSubmitError, setLocalSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialTitle, initialContent]);

  const validate = (): boolean => {
    const errors: { title?: string; content?: string } = {};

    if (!title.trim()) {
      errors.title = 'Title is required.';
    } else if (title.trim().length > 200) {
      errors.title = 'Title cannot exceed 200 characters.';
    }

    if (!content.trim()) {
      errors.content = 'Content is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLocalSubmitError(null);

    if (!validate()) {
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLocalSubmitError(err.message);
      } else {
        setLocalSubmitError('An error occurred while saving the note. Please try again.');
      }
    }
  };

  const sanitizeHtml = (rawHtml: string): string => {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'h3', 'ul', 'ol', 'li', 'p', 'code', 'pre', 'br', 'span'],
      ALLOWED_ATTR: [],
    });
  };

  const formatText = (prefix: string, suffix: string = ''): void => {
    const textarea = document.getElementById('note-content-input') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const activeError = error || localSubmitError;

  return (
    <div className="note-editor-container">
      <div className="note-editor-header">
        <h2>{mode === 'create' ? 'Create New Note' : 'Edit Note'}</h2>
        <div className="editor-tab-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'write'}
            className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`}
            onClick={() => setActiveTab('write')}
          >
            ✏️ Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preview'}
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {activeError && (
        <div className="alert-banner alert-banner-danger" role="alert">
          <span>⚠️ {activeError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="note-title-input" className="form-label">
            Title <span className="required-star">*</span>
          </label>
          <input
            id="note-title-input"
            type="text"
            className={`form-input ${fieldErrors.title ? 'is-invalid' : ''}`}
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) {
                setFieldErrors((prev) => ({ ...prev, title: undefined }));
              }
            }}
            disabled={isSubmitting}
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? 'title-error' : undefined}
            required
          />
          {fieldErrors.title && (
            <p id="title-error" className="field-error" role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {activeTab === 'write' ? (
          <div className="form-group">
            <div className="content-label-row">
              <label htmlFor="note-content-input" className="form-label">
                Content <span className="required-star">*</span>
              </label>
              <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting toolbar">
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => formatText('<b>', '</b>')}
                  title="Bold"
                  aria-label="Bold text"
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => formatText('<i>', '</i>')}
                  title="Italic"
                  aria-label="Italic text"
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => formatText('<h3>', '</h3>')}
                  title="Heading"
                  aria-label="Heading"
                >
                  H3
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => formatText('<ul>\n  <li>', '</li>\n</ul>')}
                  title="Bullet List"
                  aria-label="Bullet list"
                >
                  • List
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={() => formatText('<code>', '</code>')}
                  title="Code block"
                  aria-label="Code block"
                >
                  &lt;/&gt;
                </button>
              </div>
            </div>

            <textarea
              id="note-content-input"
              className={`form-input textarea-input ${fieldErrors.content ? 'is-invalid' : ''}`}
              placeholder="Write your note content here..."
              rows={10}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (fieldErrors.content) {
                  setFieldErrors((prev) => ({ ...prev, content: undefined }));
                }
              }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.content}
              aria-describedby={fieldErrors.content ? 'content-error' : undefined}
              required
            />
            {fieldErrors.content && (
              <p id="content-error" className="field-error" role="alert">
                {fieldErrors.content}
              </p>
            )}
          </div>
        ) : (
          <div className="form-group">
            <span className="form-label">Content Preview</span>
            <div className="note-preview-box">
              {content.trim() ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
              ) : (
                <em className="text-muted">Nothing to preview yet.</em>
              )}
            </div>
          </div>
        )}

        <div className="editor-form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner spinner-sm"></span>
                <span>Saving...</span>
              </>
            ) : mode === 'create' ? (
              'Create Note'
            ) : (
              'Save Changes'
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
