// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskActions } from './TaskActions';

describe('TaskActions', () => {
  it('shows all valid actions for incomplete state (Requirement 3.6)', () => {
    const onAction = vi.fn();
    render(<TaskActions currentState="incomplete" onAction={onAction} />);

    expect(screen.getByRole('button', { name: /complete task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /migrate task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel task/i })).toBeInTheDocument();
  });

  it('shows no actions for complete state (Requirement 3.6)', () => {
    const onAction = vi.fn();
    render(<TaskActions currentState="complete" onAction={onAction} />);

    expect(screen.queryByRole('button', { name: /complete task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /migrate task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel task/i })).not.toBeInTheDocument();
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
  });

  it('shows no actions for migrated state (Requirement 3.6)', () => {
    const onAction = vi.fn();
    render(<TaskActions currentState="migrated" onAction={onAction} />);

    expect(screen.queryByRole('button', { name: /complete task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /migrate task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel task/i })).not.toBeInTheDocument();
    expect(screen.getByText(/migrated/i)).toBeInTheDocument();
  });

  it('shows no actions for cancelled state (Requirement 3.6)', () => {
    const onAction = vi.fn();
    render(<TaskActions currentState="cancelled" onAction={onAction} />);

    expect(screen.queryByRole('button', { name: /complete task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /migrate task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel task/i })).not.toBeInTheDocument();
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  });

  it('calls onAction with "complete" when complete button is clicked', () => {
    const onAction = vi.fn();
    render(<TaskActions currentState="incomplete" onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: /complete task/i }));
    expect(onAction).toHaveBeenCalledWith('complete');
  });

  it('calls onAction with "migrate" when migrate button is clicked', () => {
    const onAction = vi.fn();
    render(<TaskActions currentState="incomplete" onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: /migrate task/i }));
    expect(onAction).toHaveBeenCalledWith('migrate');
  });

  it('calls onAction with "cancel" when cancel button is clicked', () => {
    const onAction = vi.fn();
    render(<TaskActions currentState="incomplete" onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel task/i }));
    expect(onAction).toHaveBeenCalledWith('cancel');
  });
});
