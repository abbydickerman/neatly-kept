import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { SaveQueue } from './save-queue';
import type { SaveOperation } from '@/types/persistence';

function createOperation(overrides: Partial<SaveOperation> = {}): SaveOperation {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: overrides.type ?? 'create',
    entity: overrides.entity ?? 'entry',
    data: overrides.data ?? { text: 'test' },
    attempts: overrides.attempts ?? 0,
    maxAttempts: overrides.maxAttempts ?? 4, // 1 initial + 3 retries
    retryDelayMs: overrides.retryDelayMs ?? 5000,
  };
}

describe('SaveQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('enqueue', () => {
    it('adds an operation to the queue and processes it', async () => {
      const executor = vi.fn().mockResolvedValue(true);
      const queue = new SaveQueue({ executor });

      const op = createOperation();
      queue.enqueue(op);

      // Let the microtask queue flush
      await vi.runAllTimersAsync();

      expect(executor).toHaveBeenCalledTimes(1);
      expect(queue.hasUnsavedChanges).toBe(false);
    });

    it('sets hasUnsavedChanges to true when operation is pending', () => {
      const executor = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
      const queue = new SaveQueue({ executor });

      const op = createOperation();
      queue.enqueue(op);

      expect(queue.hasUnsavedChanges).toBe(true);
    });

    it('removes operation from queue on success', async () => {
      const executor = vi.fn().mockResolvedValue(true);
      const queue = new SaveQueue({ executor });

      const op = createOperation();
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      expect(queue.hasUnsavedChanges).toBe(false);
      expect(queue.getStatus()).toBe('idle');
    });
  });

  describe('getStatus', () => {
    it('returns idle when queue is empty', () => {
      const queue = new SaveQueue({ executor: vi.fn() });
      expect(queue.getStatus()).toBe('idle');
    });

    it('returns saving when operations are being processed', () => {
      const executor = vi.fn().mockReturnValue(new Promise(() => {}));
      const queue = new SaveQueue({ executor });

      queue.enqueue(createOperation());

      // Status should be saving since the executor is running
      expect(queue.getStatus()).toBe('saving');
    });

    it('returns failed when an operation has permanently failed', async () => {
      const executor = vi.fn().mockResolvedValue(false);
      const queue = new SaveQueue({ executor });

      // maxAttempts = 1 means no retries, fails immediately
      const op = createOperation({ maxAttempts: 1 });
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      expect(queue.getStatus()).toBe('failed');
    });
  });

  describe('retry logic', () => {
    it('retries up to maxAttempts times before marking as failed', async () => {
      const executor = vi.fn().mockResolvedValue(false);
      const onPermanentFailure = vi.fn();
      const queue = new SaveQueue({ executor, onPermanentFailure });

      // maxAttempts = 4 means 1 initial + 3 retries
      const op = createOperation({ maxAttempts: 4, retryDelayMs: 5000 });
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      expect(executor).toHaveBeenCalledTimes(4);
      expect(onPermanentFailure).toHaveBeenCalledTimes(1);
      expect(queue.getStatus()).toBe('failed');
    });

    it('waits retryDelayMs between retry attempts', async () => {
      let callCount = 0;
      const executor = vi.fn().mockImplementation(async () => {
        callCount++;
        return false;
      });
      const queue = new SaveQueue({ executor });

      const op = createOperation({ maxAttempts: 3, retryDelayMs: 5000 });
      queue.enqueue(op);

      // First attempt happens immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(callCount).toBe(1);

      // After 4999ms, second attempt should not have happened yet
      await vi.advanceTimersByTimeAsync(4999);
      expect(callCount).toBe(1);

      // After 5000ms total delay, second attempt fires
      await vi.advanceTimersByTimeAsync(1);
      expect(callCount).toBe(2);

      // After another 5000ms, third attempt fires
      await vi.advanceTimersByTimeAsync(5000);
      expect(callCount).toBe(3);
    });

    it('succeeds on retry and removes operation from queue', async () => {
      let attempt = 0;
      const executor = vi.fn().mockImplementation(async () => {
        attempt++;
        return attempt >= 3; // succeeds on 3rd attempt
      });
      const queue = new SaveQueue({ executor });

      const op = createOperation({ maxAttempts: 4, retryDelayMs: 5000 });
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      expect(executor).toHaveBeenCalledTimes(3);
      expect(queue.hasUnsavedChanges).toBe(false);
      expect(queue.getStatus()).toBe('idle');
    });

    it('calls onPermanentFailure when all retries exhausted', async () => {
      const executor = vi.fn().mockResolvedValue(false);
      const onPermanentFailure = vi.fn();
      const queue = new SaveQueue({ executor, onPermanentFailure });

      const op = createOperation({ maxAttempts: 4, retryDelayMs: 5000 });
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      expect(onPermanentFailure).toHaveBeenCalledWith(
        expect.objectContaining({ id: op.id, attempts: 4 })
      );
    });

    it('increments attempts counter on each try', async () => {
      const attempts: number[] = [];
      const executor = vi.fn().mockImplementation(async (op: SaveOperation) => {
        attempts.push(op.attempts);
        return false;
      });
      const queue = new SaveQueue({ executor });

      const op = createOperation({ maxAttempts: 4, retryDelayMs: 5000 });
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      expect(attempts).toEqual([1, 2, 3, 4]);
    });
  });

  describe('retry method', () => {
    it('resets a failed operation and re-processes it', async () => {
      let callCount = 0;
      const executor = vi.fn().mockImplementation(async () => {
        callCount++;
        // Fail on first 2 attempts, succeed after retry() is called
        return callCount > 2;
      });
      const queue = new SaveQueue({ executor });

      const op = createOperation({ maxAttempts: 2, retryDelayMs: 5000 });
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      // Should have failed after 2 attempts
      expect(queue.getStatus()).toBe('failed');
      expect(callCount).toBe(2);

      // Now retry
      await queue.retry(op.id);
      await vi.runAllTimersAsync();

      // Should succeed on the next attempt
      expect(queue.hasUnsavedChanges).toBe(false);
      expect(queue.getStatus()).toBe('idle');
    });

    it('does nothing for non-existent operation id', async () => {
      const executor = vi.fn().mockResolvedValue(true);
      const queue = new SaveQueue({ executor });

      await queue.retry('non-existent-id');
      expect(executor).not.toHaveBeenCalled();
    });
  });

  describe('hasUnsavedChanges', () => {
    it('is false when queue is empty', () => {
      const queue = new SaveQueue({ executor: vi.fn() });
      expect(queue.hasUnsavedChanges).toBe(false);
    });

    it('is true when operations are pending', () => {
      const executor = vi.fn().mockReturnValue(new Promise(() => {}));
      const queue = new SaveQueue({ executor });

      queue.enqueue(createOperation());
      expect(queue.hasUnsavedChanges).toBe(true);
    });

    it('is true when operations have failed (still in queue)', async () => {
      const executor = vi.fn().mockResolvedValue(false);
      const queue = new SaveQueue({ executor });

      queue.enqueue(createOperation({ maxAttempts: 1 }));
      await vi.runAllTimersAsync();

      expect(queue.hasUnsavedChanges).toBe(true);
    });

    it('is false after all operations succeed', async () => {
      const executor = vi.fn().mockResolvedValue(true);
      const queue = new SaveQueue({ executor });

      queue.enqueue(createOperation());
      queue.enqueue(createOperation());

      await vi.runAllTimersAsync();

      expect(queue.hasUnsavedChanges).toBe(false);
    });
  });

  describe('multiple operations', () => {
    it('processes operations sequentially', async () => {
      const order: string[] = [];
      const executor = vi.fn().mockImplementation(async (op: SaveOperation) => {
        order.push(op.id);
        return true;
      });
      const queue = new SaveQueue({ executor });

      const op1 = createOperation({ id: 'op-1' });
      const op2 = createOperation({ id: 'op-2' });

      queue.enqueue(op1);
      queue.enqueue(op2);

      await vi.runAllTimersAsync();

      expect(order).toEqual(['op-1', 'op-2']);
    });
  });

  describe('property-based tests', () => {
    const arbOperationType = fc.constantFrom<'create' | 'update' | 'delete'>(
      'create',
      'update',
      'delete'
    );

    const arbEntity = fc.constantFrom('entry', 'layout', 'collection', 'calendarConfig');

    const arbSaveOperation = fc.record({
      id: fc.uuid(),
      type: arbOperationType,
      entity: arbEntity,
      data: fc.anything(),
      attempts: fc.constant(0),
      maxAttempts: fc.integer({ min: 1, max: 10 }),
      retryDelayMs: fc.constant(5000),
    }) as fc.Arbitrary<SaveOperation>;

    /**
     * **Validates: Requirements 8.6**
     * hasUnsavedChanges is true if and only if there are pending operations in the queue.
     */
    it('hasUnsavedChanges is true iff pending operations exist', () => {
      fc.assert(
        fc.property(
          fc.array(arbSaveOperation, { minLength: 0, maxLength: 5 }),
          (operations) => {
            const executor = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
            const queue = new SaveQueue({ executor });

            if (operations.length === 0) {
              expect(queue.hasUnsavedChanges).toBe(false);
            } else {
              for (const op of operations) {
                queue.enqueue(op);
              }
              expect(queue.hasUnsavedChanges).toBe(true);
            }

            queue.dispose();
          }
        )
      );
    });

    /**
     * **Validates: Requirements 8.4**
     * Total attempts never exceed maxAttempts for any operation.
     */
    it('total attempts never exceed maxAttempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 6 }),
          async (maxAttempts) => {
            vi.useFakeTimers();
            let totalCalls = 0;
            const executor = vi.fn().mockImplementation(async () => {
              totalCalls++;
              return false; // always fail
            });
            const queue = new SaveQueue({ executor });

            const op = createOperation({ maxAttempts, retryDelayMs: 100 });
            queue.enqueue(op);

            await vi.runAllTimersAsync();

            expect(totalCalls).toBe(maxAttempts);
            queue.dispose();
            vi.useRealTimers();
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * **Validates: Requirements 8.4**
     * With maxAttempts=4 (1 initial + 3 retries), exactly 4 attempts are made.
     */
    it('performs exactly 1 initial + 3 retries with default config', async () => {
      vi.useFakeTimers();
      const executor = vi.fn().mockResolvedValue(false);
      const queue = new SaveQueue({ executor });

      const op = createOperation({ maxAttempts: 4, retryDelayMs: 5000 });
      queue.enqueue(op);

      await vi.runAllTimersAsync();

      expect(executor).toHaveBeenCalledTimes(4);
      queue.dispose();
    });

    /**
     * **Validates: Requirements 8.5**
     * After all retries exhausted, operation is marked as permanently failed.
     */
    it('marks operation as failed after all retries exhausted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (maxAttempts) => {
            vi.useFakeTimers();
            const onPermanentFailure = vi.fn();
            const executor = vi.fn().mockResolvedValue(false);
            const queue = new SaveQueue({ executor, onPermanentFailure });

            const op = createOperation({ maxAttempts, retryDelayMs: 100 });
            queue.enqueue(op);

            await vi.runAllTimersAsync();

            expect(onPermanentFailure).toHaveBeenCalledTimes(1);
            expect(queue.getOperationState(op.id)).toBe('failed');
            queue.dispose();
            vi.useRealTimers();
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * **Validates: Requirements 8.6**
     * Successful operations are removed from queue, making hasUnsavedChanges false.
     */
    it('successful save removes operation and clears unsaved flag', async () => {
      await fc.assert(
        fc.asyncProperty(arbSaveOperation, async (op) => {
          vi.useFakeTimers();
          const executor = vi.fn().mockResolvedValue(true);
          const queue = new SaveQueue({ executor });

          queue.enqueue(op);
          expect(queue.hasUnsavedChanges).toBe(true);

          await vi.runAllTimersAsync();

          expect(queue.hasUnsavedChanges).toBe(false);
          expect(queue.getStatus()).toBe('idle');
          queue.dispose();
          vi.useRealTimers();
        }),
        { numRuns: 20 }
      );
    });
  });
});
