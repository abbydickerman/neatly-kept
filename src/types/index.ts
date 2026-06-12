export type {
  // User & Auth
  User,
  UserPreferences,
  // Core Entities
  Layout,
  ContentArea,
  ContentAreaType,
  JournalPage,
  Entry,
  EntryType,
  TaskState,
  TaskAction,
  Signifier,
  // Collections
  Collection,
  CollectionEntry,
  // Calendar
  CalendarConfig,
  WeekDay,
  LayoutDensity,
  CalendarSizing,
  CalendarPeriodType,
  CalendarPeriod,
  // Template Gallery
  GalleryTemplate,
  TemplateCategory,
  TemplateStatus,
  TemplateSubmission,
  TemplateFilters,
  TemplateSubmissionMetadata,
} from './models';

export type {
  // Persistence
  SaveOperation,
  SaveStatus,
  SyncStatus,
  SyncResult,
  SyncConflict,
  PersistenceState,
  SyncMetadata,
} from './persistence';

export type {
  // Services
  ValidationResult,
  LayoutService,
  EntryService,
  TaskStateMachine,
  CollectionService,
  CalendarService,
  TemplateGalleryService,
  SyncManager,
  SaveQueue,
  Repository,
} from './services';

export type {
  // Layout Plan System
  LayoutCategory,
  LayoutTemplate,
  LayoutTemplateStructure,
  TemplateArea,
  InjectionZone,
  UserLayoutSelection,
  Plan,
  PlanWidgetDefinition,
  PlanActivation,
  PlanWidgetDataRecord,
  InjectedWidget,
  ComputedDailyView,
} from './layout-plan';
