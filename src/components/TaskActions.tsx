'use client';

import type { TaskState, TaskAction } from '@/types/models';
import { taskStateMachine } from '@/services/task-state-machine';

interface TaskActionsProps {
  currentState: TaskState;
  onAction: (action: TaskAction) => void;
}

const ACTION_CONFIG: Record<TaskAction, { label: string; icon: string; className: string }> = {
  complete: {
    label: 'Complete',
    icon: '✓',
    className: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
  },
  migrate: {
    label: 'Migrate',
    icon: '>',
    className: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  cancel: {
    label: 'Cancel',
    icon: '✕',
    className: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100',
  },
};

const STATE_LABELS: Record<TaskState, { label: string; className: string }> = {
  incomplete: { label: 'Incomplete', className: 'text-gray-600' },
  complete: { label: 'Complete', className: 'text-green-600' },
  migrated: { label: 'Migrated', className: 'text-blue-600' },
  cancelled: { label: 'Cancelled', className: 'text-red-600 line-through' },
};

/**
 * Displays valid task actions based on current state.
 * Only shows actions that are valid transitions from the current state (Requirement 3.6).
 */
export function TaskActions({ currentState, onAction }: TaskActionsProps) {
  const validActions = taskStateMachine.getValidActions(currentState);
  const isTerminal = taskStateMachine.isTerminalState(currentState);
  const stateInfo = STATE_LABELS[currentState];

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${stateInfo.className}`}>
        {stateInfo.label}
      </span>

      {!isTerminal && validActions.length > 0 && (
        <div className="flex gap-1">
          {validActions.map((action) => {
            const config = ACTION_CONFIG[action];
            return (
              <button
                key={action}
                type="button"
                onClick={() => onAction(action)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded ${config.className} transition-colors`}
                aria-label={`${config.label} task`}
              >
                <span>{config.icon}</span>
                {config.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
