import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { taskStateMachine, DEFAULT_TASK_STATE } from './task-state-machine';
import type { TaskState, TaskAction } from '@/types/models';

const ALL_STATES: TaskState[] = ['incomplete', 'complete', 'migrated', 'cancelled'];
const TERMINAL_STATES: TaskState[] = ['complete', 'migrated', 'cancelled'];
const ALL_ACTIONS: TaskAction[] = ['complete', 'migrate', 'cancel'];

describe('TaskStateMachine', () => {
  describe('transition', () => {
    it('transitions from incomplete to complete on complete action', () => {
      expect(taskStateMachine.transition('incomplete', 'complete')).toBe('complete');
    });

    it('transitions from incomplete to migrated on migrate action', () => {
      expect(taskStateMachine.transition('incomplete', 'migrate')).toBe('migrated');
    });

    it('transitions from incomplete to cancelled on cancel action', () => {
      expect(taskStateMachine.transition('incomplete', 'cancel')).toBe('cancelled');
    });

    it('returns null for any action on a terminal state', () => {
      for (const state of TERMINAL_STATES) {
        for (const action of ALL_ACTIONS) {
          expect(taskStateMachine.transition(state, action)).toBeNull();
        }
      }
    });
  });

  describe('getValidActions', () => {
    it('returns all actions for incomplete state', () => {
      const actions = taskStateMachine.getValidActions('incomplete');
      expect(actions).toEqual(expect.arrayContaining(['complete', 'migrate', 'cancel']));
      expect(actions).toHaveLength(3);
    });

    it('returns empty array for terminal states', () => {
      for (const state of TERMINAL_STATES) {
        expect(taskStateMachine.getValidActions(state)).toEqual([]);
      }
    });
  });

  describe('isTerminalState', () => {
    it('returns false for incomplete', () => {
      expect(taskStateMachine.isTerminalState('incomplete')).toBe(false);
    });

    it('returns true for complete', () => {
      expect(taskStateMachine.isTerminalState('complete')).toBe(true);
    });

    it('returns true for migrated', () => {
      expect(taskStateMachine.isTerminalState('migrated')).toBe(true);
    });

    it('returns true for cancelled', () => {
      expect(taskStateMachine.isTerminalState('cancelled')).toBe(true);
    });
  });

  describe('default state', () => {
    it('assigns incomplete as the default state for new tasks', () => {
      expect(DEFAULT_TASK_STATE).toBe('incomplete');
    });
  });

  describe('property-based tests', () => {
    const arbTaskState = fc.constantFrom<TaskState>(...ALL_STATES);
    const arbTerminalState = fc.constantFrom<TaskState>(...TERMINAL_STATES);
    const arbAction = fc.constantFrom<TaskAction>(...ALL_ACTIONS);

    /**
     * **Validates: Requirements 3.5, 3.6**
     * For any action applied to a terminal state, transition returns null.
     */
    it('rejects all transitions from terminal states', () => {
      fc.assert(
        fc.property(arbTerminalState, arbAction, (state, action) => {
          expect(taskStateMachine.transition(state, action)).toBeNull();
        })
      );
    });

    /**
     * **Validates: Requirements 3.1, 3.2, 3.4**
     * For any action applied to incomplete, transition returns a terminal state.
     */
    it('all transitions from incomplete produce a terminal state', () => {
      fc.assert(
        fc.property(arbAction, (action) => {
          const result = taskStateMachine.transition('incomplete', action);
          expect(result).not.toBeNull();
          expect(taskStateMachine.isTerminalState(result!)).toBe(true);
        })
      );
    });

    /**
     * **Validates: Requirements 3.5, 3.6**
     * getValidActions returns empty for terminal states and non-empty for incomplete.
     */
    it('getValidActions is consistent with isTerminalState', () => {
      fc.assert(
        fc.property(arbTaskState, (state) => {
          const actions = taskStateMachine.getValidActions(state);
          if (taskStateMachine.isTerminalState(state)) {
            expect(actions).toHaveLength(0);
          } else {
            expect(actions.length).toBeGreaterThan(0);
          }
        })
      );
    });

    /**
     * **Validates: Requirements 3.5, 3.6**
     * Every valid action from a state produces a successful (non-null) transition.
     */
    it('every valid action produces a successful transition', () => {
      fc.assert(
        fc.property(arbTaskState, (state) => {
          const validActions = taskStateMachine.getValidActions(state);
          for (const action of validActions) {
            expect(taskStateMachine.transition(state, action)).not.toBeNull();
          }
        })
      );
    });

    /**
     * **Validates: Requirements 3.6**
     * Terminal states have no valid actions and reject all transitions.
     */
    it('terminal states are truly terminal - no way out', () => {
      fc.assert(
        fc.property(arbTerminalState, arbAction, (state, action) => {
          expect(taskStateMachine.getValidActions(state)).toHaveLength(0);
          expect(taskStateMachine.transition(state, action)).toBeNull();
        })
      );
    });
  });
});
