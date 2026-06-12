import type { Entry } from './models';

// === Layout Template Types ===

export type LayoutCategory = 'weekly' | 'monthly';

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: LayoutCategory;
  previewImageUrl?: string;
  isBuiltIn: boolean;
  structure: LayoutTemplateStructure;
  injectionZones: InjectionZone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LayoutTemplateStructure {
  // For weekly: defines the 7 day columns + optional side panels
  // For monthly: defines the month grid + optional zones
  areas: TemplateArea[];
}

export interface TemplateArea {
  id: string;
  type: 'day-column' | 'side-panel' | 'month-grid' | 'header' | 'notes';
  dayOfWeek?: number; // 0=Sunday, 1=Monday, ... 6=Saturday (for day-column type)
  label: string;
  // Position as percentage of total template area
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InjectionZone {
  id: string;
  name: string;
  type: 'daily-content' | 'supplementary' | 'monthly-goals' | 'monthly-summary';
  // Which template area this zone belongs to
  parentAreaId: string;
  // Position within the parent area (relative percentages)
  position: 'top' | 'bottom' | 'after-entries';
}

// === User Selection Types ===

export interface UserLayoutSelection {
  id: string;
  userId: string;
  templateId: string;
  category: LayoutCategory;
  activatedAt: Date;
}

// === Plan Types ===

export interface Plan {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  widgetDefinitions: PlanWidgetDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanWidgetDefinition {
  widgetType: string; // e.g., 'breakfast', 'lunch', 'dinner', 'workout', 'grocery-list'
  label: string; // Display label: "Breakfast", "Workout"
  targetZoneType: InjectionZone['type']; // Which zone type this widget injects into
  frequency: 'daily' | 'weekly' | 'monthly'; // How often this widget appears
  inputType: 'free-text' | 'checklist'; // Type of user input
}

export interface PlanActivation {
  id: string;
  userId: string;
  planId: string;
  isActive: boolean;
  activatedAt: Date;
  deactivatedAt?: Date;
}

// === Plan Widget Data Types ===

export interface PlanWidgetDataRecord {
  id: string;
  userId: string;
  planId: string;
  widgetType: string;
  date: Date;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// === Computed View Types ===

export interface InjectedWidget {
  planId: string;
  planName: string;
  definition: PlanWidgetDefinition;
  data: PlanWidgetDataRecord | null;
  activationOrder: number; // For rendering order within a zone
}

export interface ComputedDailyView {
  date: Date;
  dayOfWeek: number;
  // The day column extracted from the weekly template
  dayColumn: TemplateArea | null;
  // Entries for this day
  entries: Entry[];
  // Plan widgets injected into the daily content zone
  dailyWidgets: InjectedWidget[];
  // Monthly context (goals, summary from the monthly layout)
  monthlyContext: {
    monthlyGoalsWidgets: InjectedWidget[];
    monthlyTemplate: LayoutTemplate | null;
  };
  // Whether user has active layouts
  hasWeeklyLayout: boolean;
  hasMonthlyLayout: boolean;
}
