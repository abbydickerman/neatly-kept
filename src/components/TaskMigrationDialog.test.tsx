// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskMigrationDialog } from './TaskMigrationDialog';
import type { JournalPage } from '@/types/models';

describe('TaskMigrationDialog', () => {
  const pages: JournalPage[] = [
    { id: 'page-1', userId: 'user-1', layoutId: 'layout-1', title: 'Daily Log', createdAt: new Date(), updatedAt: new Date() },
    { id: 'page-2', userId: 'user-1', layoutId: 'layout-1', title: 'Weekly Spread', createdAt: new Date(), updatedAt: new Date() },
    { id: 'page-3', userId: 'user-1', layoutId: 'layout-1', title: 'Monthly Log', createdAt: new Date(), updatedAt: new Date() },
  ];

  const defaultProps = {
    isOpen: true,
    availablePages: pages,
    currentPageId: 'page-1',
    onMigrate: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TaskMigrationDialog {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders dialog when isOpen is true', () => {
    render(<TaskMigrationDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Migrate Task')).toBeInTheDocument();
  });

  it('excludes current page from target options (Requirement 3.3)', () => {
    render(<TaskMigrationDialog {...defaultProps} />);

    // Current page should not be in the dropdown
    const options = screen.getAllByRole('option');
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).not.toContain('Daily Log');
    expect(optionTexts).toContain('Weekly Spread');
    expect(optionTexts).toContain('Monthly Log');
  });

  it('disables migrate button when no page is selected (Requirement 3.7)', () => {
    render(<TaskMigrationDialog {...defaultProps} />);

    const migrateButton = screen.getByRole('button', { name: /migrate/i });
    expect(migrateButton).toBeDisabled();
  });

  it('enables migrate button when a page is selected', () => {
    render(<TaskMigrationDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/target page/i), {
      target: { value: 'page-2' },
    });

    const migrateButton = screen.getByRole('button', { name: /^migrate$/i });
    expect(migrateButton).not.toBeDisabled();
  });

  it('calls onMigrate with selected page ID', () => {
    const onMigrate = vi.fn();
    render(<TaskMigrationDialog {...defaultProps} onMigrate={onMigrate} />);

    fireEvent.change(screen.getByLabelText(/target page/i), {
      target: { value: 'page-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^migrate$/i }));

    expect(onMigrate).toHaveBeenCalledWith('page-2');
  });

  it('calls onCancel when cancel button is clicked (Requirement 3.7)', () => {
    const onCancel = vi.fn();
    render(<TaskMigrationDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows message when no other pages are available', () => {
    render(
      <TaskMigrationDialog
        {...defaultProps}
        availablePages={[pages[0]]}
        currentPageId="page-1"
      />
    );

    expect(screen.getByText(/no other pages available/i)).toBeInTheDocument();
  });
});
