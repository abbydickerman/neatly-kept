// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EntryForm } from './EntryForm';

describe('EntryForm', () => {
  const defaultProps = {
    pageId: 'page-1',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders type selection buttons for task, event, and note', () => {
    render(<EntryForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: /task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /event/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /note/i })).toBeInTheDocument();
  });

  it('prevents save when no type is selected (Requirement 4.1)', () => {
    const onSubmit = vi.fn();
    render(<EntryForm {...defaultProps} onSubmit={onSubmit} />);

    // Enter text but don't select type
    fireEvent.change(screen.getByLabelText(/entry text/i), {
      target: { value: 'Some text' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/entry type is required/i)).toBeInTheDocument();
  });

  it('prevents save of empty text entries with error message (Requirement 4.5)', () => {
    const onSubmit = vi.fn();
    render(<EntryForm {...defaultProps} onSubmit={onSubmit} />);

    // Select type but leave text empty
    fireEvent.click(screen.getByRole('button', { name: /task/i }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/entry text is required/i)).toBeInTheDocument();
  });

  it('prevents save of whitespace-only text entries (Requirement 4.5)', () => {
    const onSubmit = vi.fn();
    render(<EntryForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /task/i }));
    fireEvent.change(screen.getByLabelText(/entry text/i), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/entry text is required/i)).toBeInTheDocument();
  });

  it('submits entry with valid type and text', () => {
    const onSubmit = vi.fn();
    render(<EntryForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /task/i }));
    fireEvent.change(screen.getByLabelText(/entry text/i), {
      target: { value: 'Buy groceries' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task',
        text: 'Buy groceries',
      })
    );
  });

  it('includes default type signifier in submitted entry', () => {
    const onSubmit = vi.fn();
    render(<EntryForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /event/i }));
    fireEvent.change(screen.getByLabelText(/entry text/i), {
      target: { value: 'Team meeting' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'event',
        signifiers: expect.arrayContaining([
          expect.objectContaining({ symbol: '○', category: 'type' }),
        ]),
      })
    );
  });

  it('shows date field for event type', () => {
    render(<EntryForm {...defaultProps} />);

    // Date field should not be visible initially
    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument();

    // Select event type
    fireEvent.click(screen.getByRole('button', { name: /event/i }));

    // Date field should now be visible
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<EntryForm {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('resets form after successful submission', () => {
    const onSubmit = vi.fn();
    render(<EntryForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /task/i }));
    fireEvent.change(screen.getByLabelText(/entry text/i), {
      target: { value: 'Test entry' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    // After submission, text should be cleared
    expect(screen.getByLabelText(/entry text/i)).toHaveValue('');
  });
});
