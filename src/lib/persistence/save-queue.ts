import type { SaveQueue as ISaveQueue } from '@/types/services';
import type { SaveOperation, SaveStatus } from '@/types/persistence';

export type SaveOperationState = 'pending' | 'saving' | 'retrying' | 'failed';

export interface QueuedOperation {
  operation: SaveOperation;
  state: SaveOperationState;
}

export interface SaveQueueOptions {
  /** Function that performs the actual save. Returns true on success, false on failure. */
  executor: (operation: SaveOperation) => Promise<boolean>;
  /** Called when an operation permanently fails after all retries. */
  onPermanentFailure?: (operation: SaveOperation) => void;
}

export class SaveQueue implements ISaveQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private processing = false;
  private executor: (operation: SaveOperation) => Promise<boolean>;
  private onPermanentFailure?: (operation: SaveOperation) => void;
  private timers: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor(options: SaveQueueOptions) {
    this.executor = options.executor;
    this.onPermanentFailure = options.onPermanentFailure;
  }

  enqueue(operation: SaveOperation): void {
    this.queue.set(operation.id, {
      operation: { ...operation, attempts: 0 },
      state: 'pending',
    });
    this.processNext();
  }

  getStatus(): SaveStatus {
    if (this.queue.size === 0) {
      return 'idle';
    }

    const states = Array.from(this.queue.values()).map((q) => q.state);

    if (states.some((s) => s === 'failed')) {
      return 'failed';
    }
    if (states.some((s) => s === 'retrying')) {
      return 'retrying';
    }
    if (states.some((s) => s === 'saving')) {
      return 'saving';
    }
    // All pending
    return 'saving';
  }

  async retry(operationId: string): Promise<void> {
    const queued = this.queue.get(operationId);
    if (!queued) {
      return;
    }

    // Reset attempts and state to allow re-processing
    queued.operation.attempts = 0;
    queued.state = 'pending';
    this.processNext();
  }

  get hasUnsavedChanges(): boolean {
    return this.queue.size > 0;
  }

  get pendingOperations(): SaveOperation[] {
    return Array.from(this.queue.values()).map((q) => q.operation);
  }

  /** Visible for testing: get the state of a specific operation */
  getOperationState(operationId: string): SaveOperationState | undefined {
    return this.queue.get(operationId)?.state;
  }

  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    const pending = Array.from(this.queue.values()).find(
      (q) => q.state === 'pending'
    );

    if (!pending) {
      return;
    }

    this.processing = true;
    await this.executeOperation(pending);
    this.processing = false;

    // Check if there are more pending operations
    this.processNext();
  }

  private async executeOperation(queued: QueuedOperation): Promise<void> {
    queued.state = 'saving';
    queued.operation.attempts += 1;

    const success = await this.executor(queued.operation);

    if (success) {
      this.queue.delete(queued.operation.id);
      return;
    }

    // Failed - check if we can retry
    if (queued.operation.attempts >= queued.operation.maxAttempts) {
      queued.state = 'failed';
      this.onPermanentFailure?.(queued.operation);
      return;
    }

    // Schedule retry after delay
    queued.state = 'retrying';
    await this.waitForRetry(queued.operation.retryDelayMs);

    // After waiting, set back to pending for re-processing
    if (queued.state === 'retrying') {
      queued.state = 'pending';
    }

    // Re-execute
    await this.executeOperation(queued);
  }

  private waitForRetry(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, delayMs);
      this.timers.add(timer);
    });
  }

  /** Clean up any pending timers (useful for tests) */
  dispose(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
