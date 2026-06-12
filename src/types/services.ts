import type {
  Layout,
  Entry,
  EntryType,
  TaskState,
  TaskAction,
  Collection,
  CollectionEntry,
  CalendarConfig,
  CalendarPeriod,
  GalleryTemplate,
  TemplateFilters,
  TemplateSubmission,
  TemplateSubmissionMetadata,
} from './models';
import type { SyncResult, SyncStatus, SaveOperation, SaveStatus } from './persistence';

// === Validation ===

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// === Layout Service ===

export interface LayoutService {
  getBuiltInLayouts(): Layout[];
  getCustomLayouts(): Promise<Layout[]>;
  getAllLayouts(): Promise<Layout[]>;
  createCustomLayout(layout: Omit<Layout, 'id' | 'createdAt'>): Promise<Layout>;
  updateCustomLayout(id: string, changes: Partial<Layout>): Promise<Layout>;
  deleteCustomLayout(id: string): Promise<void>;
  validateLayout(layout: Layout): ValidationResult;
}

// === Entry Service ===

export interface EntryService {
  createEntry(entry: Omit<Entry, 'id' | 'createdAt'>): Promise<Entry>;
  updateEntry(id: string, changes: Partial<Entry>): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;
  getEntriesByPage(pageId: string): Promise<Entry[]>;
  getEntriesByDateRange(start: Date, end: Date): Promise<Entry[]>;
  validateEntry(entry: Entry): ValidationResult;
}

// === Task State Machine ===

export interface TaskStateMachine {
  transition(currentState: TaskState, action: TaskAction): TaskState | null;
  getValidActions(currentState: TaskState): TaskAction[];
  isTerminalState(state: TaskState): boolean;
}

// === Collection Service ===

export interface CollectionService {
  createCollection(
    collection: Omit<Collection, 'id' | 'createdAt'>
  ): Promise<Collection>;
  updateCollection(id: string, changes: Partial<Collection>): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  addEntryToCollection(entryId: string, collectionId: string): Promise<void>;
  removeEntryFromCollection(entryId: string, collectionId: string): Promise<void>;
  getCollectionEntries(collectionId: string): Promise<CollectionEntry[]>;
  getCollectionsForEntry(entryId: string): Promise<Collection[]>;
}

// === Calendar Service ===

export interface CalendarService {
  getEntriesForPeriod(period: CalendarPeriod): Promise<Entry[]>;
  getCalendarConfig(): Promise<CalendarConfig>;
  updateCalendarConfig(config: Partial<CalendarConfig>): Promise<CalendarConfig>;
}

// === Template Gallery Service ===

export interface TemplateGalleryService {
  browseTemplates(filters?: TemplateFilters): Promise<GalleryTemplate[]>;
  getTemplateById(id: string): Promise<GalleryTemplate | null>;
  useTemplate(templateId: string): Promise<Layout>;
  submitTemplate(
    layout: Layout,
    metadata: TemplateSubmissionMetadata
  ): Promise<TemplateSubmission>;
}

// === Sync Manager ===

export interface SyncManager {
  pushChanges(): Promise<SyncResult>;
  pullChanges(since: Date): Promise<SyncResult>;
  getStatus(): SyncStatus;
  resolveConflict(conflictId: string, resolution: 'local' | 'remote'): Promise<void>;
}

// === Save Queue ===

export interface SaveQueue {
  enqueue(operation: SaveOperation): void;
  getStatus(): SaveStatus;
  retry(operationId: string): Promise<void>;
}

// === Repository (Generic Persistence) ===

export interface Repository<T> {
  getById(id: string): Promise<T | null>;
  getAll(): Promise<T[]>;
  create(item: T): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  query(predicate: (item: T) => boolean): Promise<T[]>;
}
