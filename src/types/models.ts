// === User & Auth ===

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  defaultLayoutId?: string;
  theme: 'light' | 'dark' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

// === Core Entities ===

export interface Layout {
  id: string;
  userId: string;
  name: string; // 1-50 characters
  isBuiltIn: boolean;
  contentAreas: ContentArea[]; // 1-20 areas
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentArea {
  id: string;
  type: ContentAreaType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 5-100
  height: number; // percentage 5-100
}

export type ContentAreaType = 'text' | 'checklist' | 'image' | 'blank';

export interface JournalPage {
  id: string;
  userId: string;
  layoutId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entry {
  id: string;
  userId: string;
  pageId: string;
  type: EntryType;
  text: string; // 1-500 characters
  signifiers: Signifier[]; // max 3: at most 1 priority + up to 2 category
  date?: Date; // required for Events, optional for Tasks
  state?: TaskState; // only for Tasks
  createdAt: Date;
  updatedAt: Date;
}

export type EntryType = 'task' | 'event' | 'note';

export type TaskState = 'incomplete' | 'complete' | 'migrated' | 'cancelled';

export type TaskAction = 'complete' | 'migrate' | 'cancel';

export interface Signifier {
  id: string;
  symbol: string;
  category: 'type' | 'priority' | 'category';
  label: string;
}

// === Collections ===

export interface Collection {
  id: string;
  userId: string;
  name: string; // 1-100 characters
  layoutId: string;
  isTemplate: boolean;
  templateType?: 'habit-tracker' | 'reading-list' | 'goal-tracking';
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionEntry {
  collectionId: string;
  entryId: string;
  addedAt: Date;
}

// === Calendar ===

export interface CalendarConfig {
  id: string;
  userId: string;
  weekStartDay: WeekDay; // default: 'monday'
  colorTheme: string;
  layoutDensity: LayoutDensity;
  visibleEntryTypes: EntryType[]; // default: all types
  customSizing?: CalendarSizing;
}

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type LayoutDensity = 'compact' | 'standard' | 'expanded';

export interface CalendarSizing {
  areas: { id: string; widthPercent: number; heightPercent: number }[];
}

export type CalendarPeriodType = 'daily' | 'weekly' | 'monthly';

export interface CalendarPeriod {
  type: CalendarPeriodType;
  startDate: Date;
  endDate: Date;
}

// === Template Gallery ===

export interface GalleryTemplate {
  id: string;
  name: string; // 1-50 characters
  description: string; // 1-300 characters
  category: TemplateCategory;
  tags: string[]; // max 5 tags
  contentAreas: ContentArea[];
  previewImageUrl?: string;
  authorId?: string; // null for system templates
  authorName: string;
  usageCount: number;
  isFeatured: boolean;
  status: TemplateStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateCategory =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'tracker'
  | 'creative'
  | 'planning'
  | 'other';

export type TemplateStatus = 'published' | 'pending_review' | 'rejected' | 'draft';

export interface TemplateSubmission {
  id: string;
  userId: string;
  templateId: string;
  layoutId: string; // source layout being submitted
  description: string;
  category: TemplateCategory;
  tags: string[];
  status: TemplateStatus;
  reviewNotes?: string;
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  search?: string;
  sortBy?: 'popular' | 'newest' | 'name';
}

export interface TemplateSubmissionMetadata {
  description: string; // 1-300 characters
  category: TemplateCategory;
  tags: string[]; // max 5 tags, each 1-30 characters
}
