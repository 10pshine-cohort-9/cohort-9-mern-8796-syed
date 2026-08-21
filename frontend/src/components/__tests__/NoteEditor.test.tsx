import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NoteEditor } from '../NoteEditor';

describe('NoteEditor Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (mode: 'create' | 'edit' = 'create', initialTitle = '', initialContent = ''): ReturnType<typeof render> => {
    return render(
      <NoteEditor
        mode={mode}
        initialTitle={initialTitle}
        initialContent={initialContent}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
  };

  it('renders correctly in create mode with blank input fields', () => {
    renderComponent('create');

    expect(screen.getByRole('heading', { name: 'Create New Note' })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByLabelText(/content/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create Note' })).toBeInTheDocument();
  });

  it('renders correctly in edit mode with initial data', () => {
    renderComponent('edit', 'Existing Title', 'Existing Content');

    expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Title');
    expect(screen.getByLabelText(/content/i)).toHaveValue('Existing Content');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('switches between Write and Preview tabs correctly', () => {
    renderComponent('create', 'Title', '<b>Bold text</b>');

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);

    expect(screen.getByText('Content Preview')).toBeInTheDocument();
    expect(screen.queryByLabelText(/content/i)).not.toBeInTheDocument();

    const writeTab = screen.getByRole('tab', { name: /write/i });
    fireEvent.click(writeTab);

    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
  });

  it('validates required title and content fields on form submission', async () => {
    renderComponent('create');

    fireEvent.click(screen.getByRole('button', { name: 'Create Note' }));

    try {
      expect(await screen.findByText('Title is required.')).toBeInTheDocument();
      expect(screen.getByText('Content is required.')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    } catch (error) {
      throw new Error(`NoteEditor validation test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it('accepts user input and submits form successfully', async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);
    renderComponent('create');

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Note Title' } });
    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: 'New Note Body' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Note' }));

    try {
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'New Note Title',
          content: 'New Note Body',
        });
      });
    } catch (error) {
      throw new Error(`NoteEditor submission test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it('calls onCancel when Cancel button is clicked', () => {
    renderComponent('create');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('inserts markdown formatting tags when toolbar buttons are clicked', () => {
    renderComponent('create', 'Title', 'sample text');

    const boldBtn = screen.getByRole('button', { name: /bold text/i });
    fireEvent.click(boldBtn);

    const textarea = screen.getByLabelText(/content/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('**');
  });

  it('automatically continues bullet list when Enter key is pressed', () => {
    renderComponent('create', 'Title', '- First bullet item');

    const textarea = screen.getByLabelText(/content/i) as HTMLTextAreaElement;
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;

    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(textarea.value).toBe('- First bullet item\n- ');
  });
});
