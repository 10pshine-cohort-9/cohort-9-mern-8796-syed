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
    expect(textarea.value).toBe('**text**sample text');
  });

  it('automatically continues bullet list when Enter key is pressed', () => {
    renderComponent('create', 'Title', '- First bullet item');

    const textarea = screen.getByLabelText(/content/i) as HTMLTextAreaElement;
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;

    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(textarea.value).toBe('- First bullet item\n- ');
  });

  it('removes HTML tags and markdown formatting without removing plain text comparison if (a<b) return or arithmetic expressions such as 2 * 3 * 4', () => {
    const formattedContent = '**bold text** and *italic text* and <b>html bold</b> with if (a<b) return and 2 * 3 * 4 and 2 > 1';
    renderComponent('create', 'Title', formattedContent);

    const textarea = screen.getByLabelText(/content/i) as HTMLTextAreaElement;
    textarea.selectionStart = 0;
    textarea.selectionEnd = formattedContent.length;

    const clearBtn = screen.getByRole('button', { name: /clear formatting/i });
    fireEvent.click(clearBtn);

    expect(textarea.value).toBe('bold text and italic text and html bold with if (a<b) return and 2 * 3 * 4 and 2 > 1');
  });

  it('does not trigger Ctrl+B formatting when Alt key is pressed (AltGr protection)', () => {
    renderComponent('create', 'Title', 'plain text');

    const textarea = screen.getByLabelText(/content/i) as HTMLTextAreaElement;
    textarea.selectionStart = 0;
    textarea.selectionEnd = 10;

    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true, altKey: true });

    expect(textarea.value).toBe('plain text');
  });

  it('renders both lowercase [x] and uppercase [X] task markers as checked checkboxes in preview tab', () => {
    renderComponent('create', 'Title', '- [x] task one\n- [X] task two\n- [ x ] task three\n- [ X ] task four');

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('preserves literal markdown elements inside fenced and inline code blocks without rendering HTML elements', () => {
    const codeMarkdown = '```\n# Fenced Header\n- Fenced Bullet\n```\n`# Inline Header`';
    renderComponent('create', 'Title', codeMarkdown);

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);

    expect(screen.queryByRole('heading', { name: 'Fenced Header' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Inline Header' })).not.toBeInTheDocument();
    expect(screen.getByText(/# Fenced Header/)).toBeInTheDocument();
    expect(screen.getByText(/- Fenced Bullet/)).toBeInTheDocument();
    expect(screen.getByText(/# Inline Header/)).toBeInTheDocument();
    expect(screen.getByText(/# Fenced Header/).closest('pre')).not.toBeNull();
    expect(screen.getByText(/# Inline Header/).closest('code')).not.toBeNull();
  });

  it('leaves literal placeholder-like text unchanged in the preview', () => {
    const contentWithLiteralPlaceholder = '___INLINE_CODE_PLACEHOLDER_0___ and ___CODE_BLOCK_PLACEHOLDER_0___';
    renderComponent('create', 'Title', contentWithLiteralPlaceholder);

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);

    expect(screen.getByText(/___INLINE_CODE_PLACEHOLDER_0___ and ___CODE_BLOCK_PLACEHOLDER_0___/)).toBeInTheDocument();
  });

  it('preserves leading indentation when continuing task list on Enter key', () => {
    renderComponent('create', 'Title', '  - [x] Indented task item');

    const textarea = screen.getByLabelText(/content/i) as HTMLTextAreaElement;
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;

    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(textarea.value).toBe('  - [x] Indented task item\n  - [ ] ');
  });

  it('renders indented bullet and numbered lists correctly in preview tab', () => {
    renderComponent('create', 'Title', '  - indented bullet item\n  * star bullet item\n  1. indented numbered item');

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);

    expect(screen.getByText('indented bullet item')).toBeInTheDocument();
    expect(screen.getByText('star bullet item')).toBeInTheDocument();
    expect(screen.getByText('indented numbered item')).toBeInTheDocument();
    expect(screen.getByText('indented bullet item').closest('ul')).not.toBeNull();
    expect(screen.getByText('indented numbered item').closest('ol')).not.toBeNull();
  });
});
