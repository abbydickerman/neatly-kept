// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EntryItem } from './EntryItem';
import type { Entry, JournalPage } from '@/types/models';

describe('EntryItem', () => {
  const taskEntry: Entry = {
    id: 'entry-1',
    userId: 'user-1',
    pageId: 'page-1',
    type: 'task',
    text: 'Buy groceries',
    signifiers: [{ id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task' }],
    state: 'incomplete',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const eventEntry: Entry = {
    id: 'entry-2',
    userId: 'user-1',
    pageId: 'page-1',
    type: 'event',
    text: 'Team meeting',
    signifiers: [{ id: 'sig-circle', symbol: '○', category: 'type', label: 'Event' }],
    date: new Date('2024-03-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const noteEntry: Entry = {
    id: 'entry-3',
    userId: 'user-1',
    pageId: 'page-1',
    type: 'note',
    text: 'Remember to call dentist',
    signifiers: [{ id: 'sig-dash', symbol: '–', category: 'type', label: 'Note' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('displays task entry with bullet signifier (Requirement 4.2)', () => {
    render(<EntryItem entry={taskEntry} />);

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('displays event entry with circle signifier (Requirement 4.2)', () => {
    render(<EntryItem entry={eventEntry} />);

    expect(screen.getByText('Team meeting')).toBeInTheDocument();
    expect(screen.getByText('○')).toBeInTheDocument();
  });

  it('displays note entry with dash signifier (Requirement 4.2)', () => {
    render(<EntryItem entry={noteEntry} />);

    expect(screen.getByText('Remember to call dentist')).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('displays signifiers to the left of entry text (Requirement 4.3)', () => {
    const { container } = render(<EntryItem entry={taskEntry} />);

    // The signifier container should come before the text container in DOM order
    const signifierContainer = container.querySelector('.flex-shrink-0');
    const textContainer = container.querySelector('.flex-1');
    expect(signifierContainer).toBeInTheDocument();
    expect(textContainer).toBeInTheDocument();

    // Verify DOM order: signifier before text
    const parent = signifierContainer!.parentElement!;
    const children = Array.from(parent.children);
    expect(children.indexOf(signifierContainer!)).toBeLessThan(children.indexOf(textContainer!));
  });

  it('shows task actions for incomplete task entries', () => {
    render(<EntryItem entry={taskEntry} onTaskAction={vi.fn()} />);

    expect(screen.getByRole('button', { name: /complete task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /migrate task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel task/i })).toBeInTheDocument();
  });

  it('does not show task actions for non-task entries', () => {
    render(<EntryItem entry={noteEntry} />);

    expect(screen.queryByRole('button', { name: /complete task/i })).not.toBeInTheDocument();
  });

  it('applies strikethrough style for completed tasks', () => {
    const completedTask: Entry = { ...taskEntry, state: 'complete' };
    render(<EntryItem entry={completedTask} />);

    const textElement = screen.getByText('Buy groceries');
    expect(textElement).toHaveClass('line-through');
  });

  it('applies strikethrough style for cancelled tasks', () => {
    const cancelledTask: Entry = { ...taskEntry, state: 'cancelled' };
    render(<EntryItem entry={cancelledTask} />);

    const textElement = screen.getByText('Buy groceries');
    expect(textElement).toHaveClass('line-through');
  });

  it('opens migration dialog when migrate action is clicked (Requirement 3.3)', () => {
    const pages: JournalPage[] = [
      { id: 'page-1', userId: 'user-1', layoutId: 'layout-1', title: 'Current Page', createdAt: new Date(), updatedAt: new Date() },
      { id: 'page-2', userId: 'user-1', layoutId: 'layout-1', title: 'Target Page', createdAt: new Date(), updatedAt: new Date() },
    ];

    render(
      <EntryItem
        entry={taskEntry}
        availablePages={pages}
        onTaskAction={vi.fn()}
        onMigrate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /migrate task/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Migrate Task')).toBeInTheDocument();
  });

  it('displays multiple signifiers (Requirement 4.3)', () => {
    const entryWithMultipleSignifiers: Entry = {
      ...taskEntry,
      signifiers: [
        { id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task' },
        { id: 'sig-priority', symbol: '★', category: 'priority', label: 'High Priority' },
        { id: 'sig-cat', symbol: '♦', category: 'category', label: 'Personal' },
      ],
    };

    render(<EntryItem entry={entryWithMultipleSignifiers} />);

    expect(screen.getByText('•')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.getByText('♦')).toBeInTheDocument();
  });
});
