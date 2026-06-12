// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutGallery } from './LayoutGallery';
import type { Layout } from '@/types/models';

// Mock the layout service to control built-in layouts in tests
vi.mock('@/services/layout-service', () => ({
  getBuiltInLayouts: () => [
    {
      id: 'builtin-daily-log',
      userId: 'system',
      name: 'Daily Log',
      isBuiltIn: true,
      contentAreas: [
        { id: 'daily-header', type: 'text', x: 0, y: 0, width: 100, height: 10 },
        { id: 'daily-tasks', type: 'checklist', x: 0, y: 10, width: 100, height: 60 },
        { id: 'daily-notes', type: 'text', x: 0, y: 70, width: 100, height: 30 },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'builtin-weekly-spread',
      userId: 'system',
      name: 'Weekly Spread',
      isBuiltIn: true,
      contentAreas: [
        { id: 'weekly-header', type: 'text', x: 0, y: 0, width: 100, height: 10 },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'builtin-monthly-log',
      userId: 'system',
      name: 'Monthly Log',
      isBuiltIn: true,
      contentAreas: [
        { id: 'monthly-header', type: 'text', x: 0, y: 0, width: 100, height: 10 },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'builtin-blank-page',
      userId: 'system',
      name: 'Blank Page',
      isBuiltIn: true,
      contentAreas: [
        { id: 'blank-area', type: 'blank', x: 0, y: 0, width: 100, height: 100 },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ],
}));

describe('LayoutGallery', () => {
  const mockOnSelect = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all built-in layouts with their names', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Daily Log')).toBeInTheDocument();
    expect(screen.getByText('Weekly Spread')).toBeInTheDocument();
    expect(screen.getByText('Monthly Log')).toBeInTheDocument();
    expect(screen.getByText('Blank Page')).toBeInTheDocument();
  });

  it('renders as a modal dialog with proper aria attributes', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Layout Gallery');
  });

  it('displays the gallery heading', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    expect(screen.getByText('Choose a Layout')).toBeInTheDocument();
  });

  it('calls onSelect with the chosen layout when a layout is clicked', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    const dailyLogButton = screen.getByRole('button', { name: /Select Daily Log layout/i });
    fireEvent.click(dailyLogButton);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'builtin-daily-log',
        name: 'Daily Log',
      })
    );
  });

  it('calls onDismiss when the close button is clicked', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    const closeButton = screen.getByRole('button', { name: /Close gallery/i });
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the Cancel button is clicked', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders custom layouts alongside built-in layouts', () => {
    const customLayout: Layout = {
      id: 'custom-1',
      userId: 'user-1',
      name: 'My Custom Layout',
      isBuiltIn: false,
      contentAreas: [
        { id: 'custom-area', type: 'text', x: 0, y: 0, width: 50, height: 50 },
      ],
      createdAt: new Date('2024-06-01'),
      updatedAt: new Date('2024-06-01'),
    };

    render(
      <LayoutGallery
        customLayouts={[customLayout]}
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
      />
    );

    // Built-in layouts should still be present
    expect(screen.getByText('Daily Log')).toBeInTheDocument();
    // Custom layout should also appear
    expect(screen.getByText('My Custom Layout')).toBeInTheDocument();
  });

  it('renders visual preview areas for each layout', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    // Each layout button should contain a layout preview
    const layoutButtons = screen.getAllByRole('button', { name: /Select .+ layout/i });
    expect(layoutButtons.length).toBe(4); // 4 built-in layouts
  });

  it('does not call onSelect when dismissed', () => {
    render(<LayoutGallery onSelect={mockOnSelect} onDismiss={mockOnDismiss} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnSelect).not.toHaveBeenCalled();
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
