import type { TaskState, TaskAction } from '@/types/models';
import type { TaskStateMachine } from '@/types/services';

const TERMINAL_STATES: ReadonlySet<TaskState> = new Set([
  'complete',
  'migrated',
  'cancelled',
]);

const TRANSITION_MAP: Record<TaskAction, TaskState> = {
  complete: 'complete',
  migrate: 'migrated',
  cancel: 'cancelled',
};

const VALID_ACTIONS_FROM_INCOMPLETE: readonly TaskAction[] = [
  'complete',
  'migrate',
  'cancel',
];

export const DEFAULT_TASK_STATE: TaskState = 'incomplete';

export const taskStateMachine: TaskStateMachine = {
  transition(currentState: TaskState, action: TaskAction): TaskState | null {
    if (currentState !== 'incomplete') {
      return null;
    }
    return TRANSITION_MAP[action] ?? null;
  },

  getValidActions(currentState: TaskState): TaskAction[] {
    if (currentState === 'incomplete') {
      return [...VALID_ACTIONS_FROM_INCOMPLETE];
    }
    return [];
  },

  isTerminalState(state: TaskState): boolean {
    return TERMINAL_STATES.has(state);
  },
};
