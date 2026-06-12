import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// === Users (managed by NextAuth.js adapter) ===

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  hashedPassword: text("hashed_password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === NextAuth.js Accounts (OAuth providers) ===

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ]
);

// === NextAuth.js Verification Tokens (email verification) ===

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
);

// === User Preferences ===

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    defaultLayoutId: uuid("default_layout_id"),
    theme: varchar("theme", { length: 20 }).default("system"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [uniqueIndex("user_preferences_user_id_unique").on(table.userId)]
);

// === Layouts ===

export const layouts = pgTable(
  "layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    isBuiltIn: boolean("is_built_in").default(false),
    contentAreas: jsonb("content_areas").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("layouts_user_id_name_unique").on(table.userId, table.name),
    index("idx_layouts_user").on(table.userId),
  ]
);

// === Journal Pages ===

export const journalPages = pgTable("journal_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  layoutId: uuid("layout_id").references(() => layouts.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Entries ===

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    pageId: uuid("page_id")
      .references(() => journalPages.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 10 }).notNull(),
    text: varchar("text", { length: 500 }).notNull(),
    signifiers: jsonb("signifiers").default([]),
    date: date("date"),
    state: varchar("state", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_entries_user_page").on(table.userId, table.pageId),
    index("idx_entries_user_date").on(table.userId, table.date),
    index("idx_entries_user_type").on(table.userId, table.type),
  ]
);

// === Collections ===

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    layoutId: uuid("layout_id").references(() => layouts.id, {
      onDelete: "set null",
    }),
    isTemplate: boolean("is_template").default(false),
    templateType: varchar("template_type", { length: 30 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_collections_user").on(table.userId)]
);

// === Collection Entries (junction table) ===

export const collectionEntries = pgTable(
  "collection_entries",
  {
    collectionId: uuid("collection_id")
      .references(() => collections.id, { onDelete: "cascade" })
      .notNull(),
    entryId: uuid("entry_id")
      .references(() => entries.id, { onDelete: "cascade" })
      .notNull(),
    addedAt: timestamp("added_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.entryId] }),
  ]
);

// === Calendar Config ===

export const calendarConfigs = pgTable(
  "calendar_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    weekStartDay: varchar("week_start_day", { length: 10 }).default("monday"),
    colorTheme: varchar("color_theme", { length: 50 }).default("default"),
    layoutDensity: varchar("layout_density", { length: 10 }).default(
      "standard"
    ),
    visibleEntryTypes: jsonb("visible_entry_types").default([
      "task",
      "event",
      "note",
    ]),
    customSizing: jsonb("custom_sizing"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [uniqueIndex("calendar_configs_user_id_unique").on(table.userId)]
);

// === Template Gallery ===

export const galleryTemplates = pgTable(
  "gallery_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull(),
    description: varchar("description", { length: 300 }).notNull(),
    category: varchar("category", { length: 20 }).notNull(),
    tags: jsonb("tags").default([]),
    contentAreas: jsonb("content_areas").notNull(),
    previewImageUrl: text("preview_image_url"),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorName: varchar("author_name", { length: 255 }).notNull(),
    usageCount: integer("usage_count").default(0),
    isFeatured: boolean("is_featured").default(false),
    status: varchar("status", { length: 20 }).default("published"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_gallery_templates_category").on(table.category),
    index("idx_gallery_templates_status").on(table.status),
    index("idx_gallery_templates_featured").on(table.isFeatured),
  ]
);

// === Template Submissions (future) ===

export const templateSubmissions = pgTable("template_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  templateId: uuid("template_id").references(() => galleryTemplates.id, {
    onDelete: "set null",
  }),
  layoutId: uuid("layout_id").references(() => layouts.id, {
    onDelete: "set null",
  }),
  description: varchar("description", { length: 300 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  tags: jsonb("tags").default([]),
  status: varchar("status", { length: 20 }).default("pending_review"),
  reviewNotes: text("review_notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// === Layout Templates (predefined visual structures for Layout Plan System) ===

export const layoutTemplates = pgTable(
  "layout_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    category: varchar("category", { length: 20 }).notNull(), // 'weekly' | 'monthly'
    previewImageUrl: text("preview_image_url"),
    isBuiltIn: boolean("is_built_in").default(true),
    structure: jsonb("structure").notNull(), // LayoutTemplateStructure
    injectionZones: jsonb("injection_zones").notNull(), // InjectionZone[]
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_layout_templates_category").on(table.category),
    index("idx_layout_templates_builtin").on(table.isBuiltIn),
  ]
);

// === User Layout Selections (which template a user has active) ===

export const userLayoutSelections = pgTable(
  "user_layout_selections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    templateId: uuid("template_id")
      .references(() => layoutTemplates.id, { onDelete: "restrict" })
      .notNull(),
    category: varchar("category", { length: 20 }).notNull(), // 'weekly' | 'monthly'
    activatedAt: timestamp("activated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("user_layout_selections_user_category_unique").on(
      table.userId,
      table.category
    ),
    index("idx_user_layout_selections_user").on(table.userId),
  ]
);

// === Plans (predefined add-on definitions) ===

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    isBuiltIn: boolean("is_built_in").default(true),
    widgetDefinitions: jsonb("widget_definitions").notNull(), // PlanWidgetDefinition[]
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_plans_builtin").on(table.isBuiltIn)]
);

// === Plan Activations (which plans a user has active) ===

export const planActivations = pgTable(
  "plan_activations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    planId: uuid("plan_id")
      .references(() => plans.id, { onDelete: "cascade" })
      .notNull(),
    isActive: boolean("is_active").default(true),
    activatedAt: timestamp("activated_at").defaultNow(),
    deactivatedAt: timestamp("deactivated_at"),
  },
  (table) => [
    uniqueIndex("plan_activations_user_plan_unique").on(
      table.userId,
      table.planId
    ),
    index("idx_plan_activations_user").on(table.userId),
    index("idx_plan_activations_active").on(table.userId, table.isActive),
  ]
);

// === Plan Widget Data (user-entered content within plan widgets) ===

export const planWidgetData = pgTable(
  "plan_widget_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    planId: uuid("plan_id")
      .references(() => plans.id, { onDelete: "cascade" })
      .notNull(),
    widgetType: varchar("widget_type", { length: 50 }).notNull(), // e.g., 'breakfast', 'lunch', 'workout'
    date: date("date").notNull(),
    value: text("value").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("plan_widget_data_unique").on(
      table.userId,
      table.planId,
      table.widgetType,
      table.date
    ),
    index("idx_plan_widget_data_user_date").on(table.userId, table.date),
    index("idx_plan_widget_data_plan").on(table.userId, table.planId),
  ]
);
