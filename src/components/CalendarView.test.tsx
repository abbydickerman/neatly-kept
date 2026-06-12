// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { CalendarView } from './CalendarView';
import type { CalendarService } from '@/types/services';
import type { Entry, CalendarConfig } from '@/types/models';

afterEach(() => {
  cleanup();
});

// Mock calendar service factory
function createMockCalendarService(
  entries: Entry[] = [],
  config?: Partial<CalendarConfig>
): CalendarService {
  const defaultConfig: CalendarConfig = {
    id: 'config-1',
    userId: 'user-1',
    weekStartDay: 'monday',
    colorTheme: 'default',
    layoutDensity: 'standard',
    visibleEntryTypes: ['task', 'event', 'note'],
    ...config,
  };

  return {
    getEntriesForPeriod: vi.fn().mockResolvedValue(entries),
    getCalendarConfig: vi.fn().mockResolvedValue(defaultConfig),
    updateCalendarConfig: vi.fn().mockImplementation(async (changes) => ({
      ...defaultConfig,
      ...changes,
    })),
  };
}

function createMockEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: `entry-${Math.random().toString(36).slice(2)}`,
    userId: 'user-1',
    pageId: 'page-1',
    type: 'task',
    text: 'Test entry',
    signifiers: [],
    date: new Date('2024-06-15'),
    state: 'incomplete',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CalendarView', () => {
  it('renders loading state initially', () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);
    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('renders calendar view after loading config', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    });
  });

  it('displays daily, weekly, monthly period tabs', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /daily/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /weekly/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /monthly/i })).toBeInTheDocument();
    });
  });

  it('defaults to weekly view', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      const weeklyTab = screen.getByRole('tab', { name: /weekly/i });
      expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('switches period type when tab is clicked', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /weekly/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /daily/i }));
    });

    expect(screen.getByRole('tab', { name: /daily/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /weekly/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows empty state when no entries exist for period', async () => {
    const service = createMockCalendarService([]);
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No entries for this period')).toBeInTheDocument();
    });
  });

  it('displays entries grouped by date', async () => {
    const entries = [
      createMockEntry({ text: 'Morning meeting', type: 'event', date: new Date('2024-06-15') }),
      createMockEntry({ text: 'Buy groceries', type: 'task', date: new Date('2024-06-15') }),
    ];
    const service = createMockCalendarService(entries);
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('Morning meeting')).toBeInTheDocument();
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    });
  });

  it('navigates to next period', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Next weekly')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Next weekly'));
    });

    // Service should be called again with new period
    expect((service.getEntriesForPeriod as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to previous period', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Previous weekly')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Previous weekly'));
    });

    expect((service.getEntriesForPeriod as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('opens settings panel when settings button is clicked', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Calendar settings')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Calendar settings'));
    });

    expect(screen.getByTestId('calendar-settings')).toBeInTheDocument();
  });

  it('applies color theme from config', async () => {
    const service = createMockCalendarService([], { colorTheme: 'ocean' });
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      const view = screen.getByTestId('calendar-view');
      expect(view).toHaveAttribute('data-color-theme', 'ocean');
    });
  });

  it('applies layout density from config', async () => {
    const service = createMockCalendarService([], { layoutDensity: 'compact' });
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      const view = screen.getByTestId('calendar-view');
      expect(view).toHaveAttribute('data-layout-density', 'compact');
    });
  });

  it('filters entries by visible entry types', async () => {
    const entries = [
      createMockEntry({ text: 'A task', type: 'task', date: new Date('2024-06-15') }),
      createMockEntry({ text: 'An event', type: 'event', date: new Date('2024-06-15') }),
      createMockEntry({ text: 'A note', type: 'note', date: new Date('2024-06-15') }),
    ];
    const service = createMockCalendarService(entries, {
      visibleEntryTypes: ['task'],
    });
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('A task')).toBeInTheDocument();
      expect(screen.queryByText('An event')).not.toBeInTheDocument();
      expect(screen.queryByText('A note')).not.toBeInTheDocument();
    });
  });

  it('shows calendar grid with no entries when all types hidden', async () => {
    const entries = [
      createMockEntry({ text: 'A task', type: 'task', date: new Date('2024-06-15') }),
    ];
    const service = createMockCalendarService(entries, {
      visibleEntryTypes: [],
    });
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-empty-state')).toBeInTheDocument();
    });
  });

  it('has a resizable content area with resize handle', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-resize-handle')).toBeInTheDocument();
    });

    const handle = screen.getByTestId('calendar-resize-handle');
    expect(handle).toHaveAttribute('role', 'separator');
    expect(handle).toHaveAttribute('aria-valuemin', '10');
    expect(handle).toHaveAttribute('aria-valuemax', '90');
  });

  it('updates config when color theme is changed in settings', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Calendar settings')).toBeInTheDocument();
    });

    // Open settings
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Calendar settings'));
    });

    // Change color theme
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Color theme'), { target: { value: 'ocean' } });
    });

    expect(service.updateCalendarConfig).toHaveBeenCalledWith({ colorTheme: 'ocean' });
  });

  it('updates config when layout density is changed', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Calendar settings')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Calendar settings'));
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Layout density'), { target: { value: 'compact' } });
    });

    expect(service.updateCalendarConfig).toHaveBeenCalledWith({ layoutDensity: 'compact' });
  });

  it('updates config when week start day is changed', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Calendar settings')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Calendar settings'));
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Week start day'), { target: { value: 'sunday' } });
    });

    expect(service.updateCalendarConfig).toHaveBeenCalledWith({ weekStartDay: 'sunday' });
  });

  it('toggles entry type visibility', async () => {
    const service = createMockCalendarService();
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Calendar settings')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Calendar settings'));
    });

    // Uncheck tasks
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Show tasks'));
    });

    expect(service.updateCalendarConfig).toHaveBeenCalledWith({
      visibleEntryTypes: ['event', 'note'],
    });
  });

  it('calls onConfigChange callback when config is updated', async () => {
    const service = createMockCalendarService();
    const onConfigChange = vi.fn();
    render(<CalendarView calendarService={service} onConfigChange={onConfigChange} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Calendar settings')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Calendar settings'));
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Color theme'), { target: { value: 'forest' } });
    });

    expect(onConfigChange).toHaveBeenCalled();
  });

  it('displays entry type markers with correct symbols', async () => {
    const entries = [
      createMockEntry({ text: 'Task item', type: 'task', date: new Date('2024-06-15') }),
      createMockEntry({ text: 'Event item', type: 'event', date: new Date('2024-06-15') }),
      createMockEntry({ text: 'Note item', type: 'note', date: new Date('2024-06-15') }),
    ];
    const service = createMockCalendarService(entries);
    render(<CalendarView calendarService={service} refreshIntervalMs={0} />);

    await waitFor(() => {
      expect(screen.getByText('Task item')).toBeInTheDocument();
    });

    // Check entry type data attributes
    const taskEntry = screen.getByText('Task item').closest('[data-entry-type]');
    expect(taskEntry).toHaveAttribute('data-entry-type', 'task');

    const eventEntry = screen.getByText('Event item').closest('[data-entry-type]');
    expect(eventEntry).toHaveAttribute('data-entry-type', 'event');

    const noteEntry = screen.getByText('Note item').closest('[data-entry-type]');
    expect(noteEntry).toHaveAttribute('data-entry-type', 'note');
  });
});
