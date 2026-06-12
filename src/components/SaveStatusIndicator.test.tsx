// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import type { SaveOperation, SaveStatus } from '@/types/persistence';

function makeOperation(overrides: Partial<SaveOperation> = {}): SaveOperation {
  return {
    id: 'op-1',
    type: 'update',
    entity: 'entry',
    data: { text: 'hello' },
    attempts: 0,
    maxAttempts: 4,
    retryDelayMs: 5000,
    ...overrides,
  };
}

describe('SaveStatusIndicator', () => {
  it('renders nothing when idle and no unsaved changes', () => {
    const { container } = render(
      <SaveStatusIndicator
        status="idle"
        hasUnsavedChanges={false}
        pendingOperations={[]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays unsaved changes indicator when saving (Requirement 8.6)', () => {
    render(
      <SaveStatusIndicator
        status="saving"
        hasUnsavedChanges={true}
        pendingOperations={[makeOperation()]}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('displays retry notification with attempt info (Requirement 8.4)', () => {
    const op = makeOperation({ attempts: 2, maxAttempts: 4 });

    render(
      <SaveStatusIndicator
        status="retrying"
        hasUnsavedChanges={true}
        pendingOperations={[op]}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/save failed — retrying/i)).toBeInTheDocument();
    expect(screen.getByText(/attempt 2 of 4/i)).toBeInTheDocument();
  });

  it('displays persistent warning when all retries are exhausted (Requirement 8.5)', () => {
    const failedOp = makeOperation({ attempts: 4, maxAttempts: 4 });

    render(
      <SaveStatusIndicator
        status="failed"
        hasUnsavedChanges={true}
        pendingOperations={[failedOp]}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/changes could not be saved/i)).toBeInTheDocument();
    expect(screen.getByText(/1 operation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/retained in memory/i)).toBeInTheDocument();
  });

  it('shows retry button on persistent warning when onRetry is provided', () => {
    const onRetry = vi.fn();
    const failedOp = makeOperation({ id: 'op-fail', attempts: 4, maxAttempts: 4 });

    render(
      <SaveStatusIndicator
        status="failed"
        hasUnsavedChanges={true}
        pendingOperations={[failedOp]}
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledWith('op-fail');
  });

  it('allows dismissing the persistent warning', () => {
    const failedOp = makeOperation({ attempts: 4, maxAttempts: 4 });

    render(
      <SaveStatusIndicator
        status="failed"
        hasUnsavedChanges={true}
        pendingOperations={[failedOp]}
        onRetry={vi.fn()}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows plural text for multiple failed operations', () => {
    const ops = [
      makeOperation({ id: 'op-1', attempts: 4, maxAttempts: 4 }),
      makeOperation({ id: 'op-2', attempts: 4, maxAttempts: 4 }),
    ];

    render(
      <SaveStatusIndicator
        status="failed"
        hasUnsavedChanges={true}
        pendingOperations={ops}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText(/2 operations failed/i)).toBeInTheDocument();
  });
});
