// === Sync & Persistence ===

export interface SaveOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: unknown;
  attempts: number;
  maxAttempts: number;
  retryDelayMs: number;
}

export type SaveStatus = 'idle' | 'saving' | 'retrying' | 'failed';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'conflict' | 'error';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: unknown;
  remoteVersion: unknown;
}

export interface PersistenceState {
  hasUnsavedChanges: boolean;
  pendingOperations: SaveOperation[];
  lastSyncedAt: Date | null;
  syncStatus: SyncStatus;
}

export interface SyncMetadata {
  entityType: string;
  entityId: string;
  lastSyncedAt: Date;
  localVersion: number;
  serverVersion: number;
  isDirty: boolean;
}
