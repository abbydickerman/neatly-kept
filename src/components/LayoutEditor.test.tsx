/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LayoutEditor } from './LayoutEditor';
import type { Layout } from '@/types';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 9),
});

const mockUserId = 'user-123';

const mockExistingLayouts: Layout[] = [
  {
    id: 'layout-1',
    userId: mockUserId,
    name: 'Daily Log',
    isBuiltIn: true,
    contentAreas: [
      { id: 'area-1', type: 'text', x: 0, y: 0, width: 100, height: 100 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'layout-2',
    userId: mockUserId,
    name: 'My Custom',
    isBuiltIn: false,
    contentAreas: [
      { id: 'area-2', type: 'checklist', x: 0, y: 0, width: 50, height: 50 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('LayoutEditor', () => {
  let onSave: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSave = vi.fn().mockResolvedValue(undefined);
    onDelete = vi.fn().mockResolvedValue(undefined);
    onCancel = vi.fn();
  });

  function renderEditor(props?: Partial<React.ComponentProps<typeof LayoutEditor>>) {
    return render(
      <LayoutEditor
        existingLayouts={mockExistingLayouts}
        onSave={onSave}
        onDelete={onDelete}
        onCancel={onCancel}
        userId={mockUserId}
        {...props}
      />
    );
  }

  describe('Rendering', () => {
    it('renders the editor with a name input and canvas', () => {
      renderEditor();
      expect(screen.getByLabelText('Layout name')).toBeInTheDocument();
      expect(screen.getByTestId('layout-canvas')).toBeInTheDocument();
    });

    it('renders with existing layout data when editing', () => {
      renderEditor({ layout: mockExistingLayouts[1] });
      const nameInput = screen.getByLabelText('Layout name') as HTMLInputElement;
      expect(nameInput.value).toBe('My Custom');
    });

    it('shows delete button only when editing an existing layout', () => {
      renderEditor({ layout: mockExistingLayouts[1] });
      expect(screen.getByLabelText('Delete layout')).toBeInTheDocument();
    });

    it('does not show delete button for new layouts', () => {
      renderEditor();
      expect(screen.queryByLabelText('Delete layout')).not.toBeInTheDocument();
    });
  });

  describe('Content Area Management', () => {
    it('starts with one default content area for new layouts', () => {
      renderEditor();
      expect(screen.getByText('1 / 20 areas')).toBeInTheDocument();
    });

    it('adds a content area when clicking add button', () => {
      renderEditor();
      fireEvent.click(screen.getByLabelText('Add content area'));
      expect(screen.getByText('2 / 20 areas')).toBeInTheDocument();
    });

    it('prevents adding more than 20 content areas', () => {
      const manyAreas = Array.from({ length: 20 }, (_, i) => ({
        id: `area-${i}`,
        type: 'text' as const,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      }));

      renderEditor({
        layout: {
          id: 'layout-full',
          userId: mockUserId,
          name: 'Full Layout',
          isBuiltIn: false,
          contentAreas: manyAreas,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const addButton = screen.getByLabelText('Add content area');
      expect(addButton).toBeDisabled();
    });

    it('removes a content area when clicking remove', () => {
      renderEditor();
      // Select the default area by clicking on it
      const area = screen.getByTestId(/^content-area-/);
      fireEvent.click(area);
      // The toolbar should now show the remove button
      const removeBtn = screen.getByLabelText('Remove selected content area');
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
      expect(screen.getByText('0 / 20 areas')).toBeInTheDocument();
    });

    it('allows changing content area type', () => {
      renderEditor();
      // Select the default area
      const areas = screen.getAllByRole('button', { name: /content area/i });
      fireEvent.click(areas[0]);
      // Change type
      const typeSelect = screen.getByLabelText('Content area type');
      fireEvent.change(typeSelect, { target: { value: 'checklist' } });
      expect(screen.getByText('Checklist')).toBeInTheDocument();
    });
  });

  describe('Size Constraints', () => {
    it('clamps width to minimum 5%', () => {
      renderEditor();
      // Select the default area
      const areas = screen.getAllByRole('button', { name: /content area/i });
      fireEvent.click(areas[0]);
      // Try to set width below minimum
      const widthInput = screen.getByLabelText('Width (%)');
      fireEvent.change(widthInput, { target: { value: '2' } });
      expect((widthInput as HTMLInputElement).value).toBe('5');
    });

    it('clamps width to maximum 100%', () => {
      renderEditor();
      const areas = screen.getAllByRole('button', { name: /content area/i });
      fireEvent.click(areas[0]);
      const widthInput = screen.getByLabelText('Width (%)');
      fireEvent.change(widthInput, { target: { value: '150' } });
      expect((widthInput as HTMLInputElement).value).toBe('100');
    });

    it('clamps height to minimum 5%', () => {
      renderEditor();
      const areas = screen.getAllByRole('button', { name: /content area/i });
      fireEvent.click(areas[0]);
      const heightInput = screen.getByLabelText('Height (%)');
      fireEvent.change(heightInput, { target: { value: '1' } });
      expect((heightInput as HTMLInputElement).value).toBe('5');
    });

    it('clamps height to maximum 100%', () => {
      renderEditor();
      const areas = screen.getAllByRole('button', { name: /content area/i });
      fireEvent.click(areas[0]);
      const heightInput = screen.getByLabelText('Height (%)');
      fireEvent.change(heightInput, { target: { value: '200' } });
      expect((heightInput as HTMLInputElement).value).toBe('100');
    });
  });

  describe('Save Validation', () => {
    it('shows error when saving with empty name', async () => {
      renderEditor();
      fireEvent.click(screen.getByLabelText('Save layout'));
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Layout name cannot be empty')).toBeInTheDocument();
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows error when saving with duplicate name', async () => {
      renderEditor();
      const nameInput = screen.getByLabelText('Layout name');
      fireEvent.change(nameInput, { target: { value: 'Daily Log' } });
      fireEvent.click(screen.getByLabelText('Save layout'));
      await waitFor(() => {
        expect(screen.getByText('A layout with this name already exists')).toBeInTheDocument();
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows error for duplicate name case-insensitively', async () => {
      renderEditor();
      const nameInput = screen.getByLabelText('Layout name');
      fireEvent.change(nameInput, { target: { value: 'daily log' } });
      fireEvent.click(screen.getByLabelText('Save layout'));
      await waitFor(() => {
        expect(screen.getByText('A layout with this name already exists')).toBeInTheDocument();
      });
    });

    it('calls onSave with valid data', async () => {
      renderEditor();
      const nameInput = screen.getByLabelText('Layout name');
      fireEvent.change(nameInput, { target: { value: 'New Layout' } });
      fireEvent.click(screen.getByLabelText('Save layout'));
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Layout',
            isBuiltIn: false,
            userId: mockUserId,
          })
        );
      });
    });

    it('allows saving with same name when editing the same layout', async () => {
      renderEditor({ layout: mockExistingLayouts[1] });
      // Name is already 'My Custom' - should be allowed since we're editing it
      fireEvent.click(screen.getByLabelText('Save layout'));
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('retains unsaved changes when validation fails', async () => {
      renderEditor();
      // Add an area, then try to save with empty name
      fireEvent.click(screen.getByLabelText('Add content area'));
      fireEvent.click(screen.getByLabelText('Save layout'));
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      // Areas should still be there
      expect(screen.getByText('2 / 20 areas')).toBeInTheDocument();
    });
  });

  describe('Delete with Confirmation', () => {
    it('shows confirmation dialog when clicking delete', () => {
      renderEditor({ layout: mockExistingLayouts[1] });
      fireEvent.click(screen.getByLabelText('Delete layout'));
      expect(
        screen.getByText('Delete this layout? Pages using it will be preserved.')
      ).toBeInTheDocument();
    });

    it('calls onDelete when confirming deletion', async () => {
      renderEditor({ layout: mockExistingLayouts[1] });
      fireEvent.click(screen.getByLabelText('Delete layout'));
      fireEvent.click(screen.getByLabelText('Confirm delete layout'));
      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith('layout-2');
      });
    });

    it('hides confirmation when cancelling delete', () => {
      renderEditor({ layout: mockExistingLayouts[1] });
      fireEvent.click(screen.getByLabelText('Delete layout'));
      fireEvent.click(screen.getByLabelText('Cancel delete'));
      expect(
        screen.queryByText('Delete this layout? Pages using it will be preserved.')
      ).not.toBeInTheDocument();
    });
  });

  describe('Cancel', () => {
    it('calls onCancel when clicking cancel button', () => {
      renderEditor();
      fireEvent.click(screen.getByLabelText('Cancel editing'));
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
