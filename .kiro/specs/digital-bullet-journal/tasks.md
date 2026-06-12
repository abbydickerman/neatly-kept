# Implementation Plan: Digital Bullet Journal

## Overview

A full-stack web application implementing the bullet journal methodology with React + TypeScript frontend, Vercel serverless backend, and PostgreSQL database. Implementation proceeds from data models and core logic through services, API routes, UI components, and finally integration/wiring.

## Tasks

- [x] 1. Set up project structure, core types, and database schema
  - [x] 1.1 Initialize Next.js project with TypeScript and configure dependencies
    - Create Next.js app with TypeScript, install dependencies: fast-check, next-auth, @neondatabase/serverless, drizzle-orm (or prisma), zustand (or similar state management)
    - Configure tsconfig, eslint, and project directory structure matching the design's test organization
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 1.2 Define core TypeScript interfaces and data models
    - Create type definitions for Layout, ContentArea, JournalPage, Entry, EntryType, TaskState, Signifier, Collection, CollectionEntry, CalendarConfig, GalleryTemplate, TemplateSubmission
    - Create type definitions for service interfaces: LayoutService, EntryService, TaskStateMachine, CollectionService, CalendarService, TemplateGalleryService, SyncManager
    - Define SaveOperation, SaveStatus, SyncStatus, SyncResult, SyncConflict, PersistenceState types
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 7.1, 8.1_

  - [x] 1.3 Create PostgreSQL schema and database migrations
    - Implement SQL migrations for all tables: users, user_preferences, layouts, journal_pages, entries, collections, collection_entries, calendar_configs, gallery_templates, template_submissions
    - Add all indexes defined in the design (idx_entries_user_page, idx_entries_user_date, etc.)
    - Set up database connection configuration for Neon PostgreSQL
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 2. Implement layout engine and validation
  - [x] 2.1 Implement layout validation logic
    - Create validateLayout function enforcing: 1-20 content areas, each with width/height between 5-100%, valid content area types (text, checklist, image, blank)
    - Create validateLayoutName function enforcing trimmed length 1-50 characters
    - Create layout name uniqueness check (case-insensitive per user)
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

  - [x] 2.2 Implement LayoutService with built-in layouts and CRUD operations
    - Create built-in layouts: daily log, weekly spread, monthly log, blank page
    - Implement getBuiltInLayouts, getCustomLayouts, getAllLayouts, createCustomLayout, updateCustomLayout, deleteCustomLayout
    - Ensure deleteCustomLayout preserves journal pages referencing the deleted layout
    - _Requirements: 1.2, 2.3, 2.4, 2.7_

- [x] 3. Implement task state machine and entry management
  - [x] 3.1 Implement TaskStateMachine
    - Create transition function: incomplete → complete/migrated/cancelled; reject all transitions from terminal states (return null)
    - Implement getValidActions returning available actions for a given state
    - Implement isTerminalState check for complete, migrated, cancelled
    - Assign 'incomplete' as default state for new tasks
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

  - [x] 3.2 Implement EntryService with validation
    - Create entry validation: require type (task/event/note), require text 1-500 chars (trimmed), reject empty/whitespace-only text
    - Implement signifier validation: max 3 total, max 1 priority, max 2 category
    - Implement createEntry, updateEntry, deleteEntry, getEntriesByPage, getEntriesByDateRange
    - Assign default signifiers: bullet for tasks, circle for events, dash for notes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 3.3 Implement task migration logic
    - Create migrateTask function: create new entry on target page with same text, type 'task', state 'incomplete'; update original entry to state 'migrated' with migration signifier
    - Validate target page exists before migration; retain task in current state if no valid target selected
    - _Requirements: 3.3, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement calendar service and logic
  - [x] 5.1 Implement CalendarService with period filtering
    - Create getEntriesForPeriod filtering entries by date within period start/end (inclusive)
    - Implement daily, weekly, monthly period types with correct date boundaries
    - Implement period navigation (next/previous) returning adjacent period with correct start/end dates
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 5.2 Implement CalendarConfig management
    - Create getCalendarConfig and updateCalendarConfig
    - Implement week start day configuration (Monday-Sunday, default Monday)
    - Implement entry type visibility filtering (show/hide task, event, note independently)
    - Implement calendar sizing constraints: clamp values to 10-90% range
    - Provide at least 3 built-in color themes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6. Implement collection service
  - [x] 6.1 Implement CollectionService with CRUD and linking
    - Create collection name validation: trimmed length 1-100 characters
    - Implement createCollection, updateCollection, deleteCollection
    - Implement addEntryToCollection with 10-collection limit per entry
    - Implement removeEntryFromCollection (preserves entry on source page)
    - Implement getCollectionEntries returning entries sorted by addedAt ascending
    - Implement entry deletion cascade: remove entry from all linked collections
    - Provide pre-built collection templates: habit tracker, reading list, goal tracking
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 7. Implement persistence, sync, and save queue
  - [x] 7.1 Implement IndexedDB offline cache (Repository pattern)
    - Create IndexedDB database `digital-bullet-journal-cache` with stores: layouts, journalPages, entries, collections, collectionEntries, calendarConfig, syncMetadata, galleryTemplatesCache
    - Implement generic Repository<T> with getById, getAll, create, update, delete, query methods
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.2 Implement SaveQueue with retry logic
    - Create SaveQueue with enqueue, getStatus, retry methods
    - Implement retry logic: up to 3 retries with 5-second delay between attempts
    - Track hasUnsavedChanges flag: true if and only if pending operations exist in queue
    - After all retries exhausted, mark operation as permanently failed and show persistent warning
    - _Requirements: 8.4, 8.5, 8.6_

  - [x] 7.3 Implement SyncManager
    - Create pushChanges: push all dirty entities to server, mark clean on success
    - Create pullChanges: fetch updates from server since last sync timestamp
    - Implement conflict resolution with last-write-wins strategy
    - Implement getStatus returning synced/syncing/offline/conflict/error
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement server API routes
  - [x] 9.1 Set up NextAuth.js authentication
    - Configure NextAuth with Google OAuth, GitHub OAuth, and credentials providers
    - Set up JWT session strategy with PostgreSQL adapter
    - Implement session validation middleware for protected API routes
    - _Requirements: 8.3_

  - [x] 9.2 Implement Entries API routes
    - Create GET /api/entries (query by pageId or dateStart/dateEnd)
    - Create POST /api/entries with validation (type required, text 1-500 chars)
    - Create PUT /api/entries/:id with state transition validation
    - Create DELETE /api/entries/:id with cascade to collection_entries
    - Enforce user authorization: reject cross-user access with 403
    - _Requirements: 4.1, 4.5, 4.6, 8.1, 8.3_

  - [x] 9.3 Implement Layouts API routes
    - Create GET /api/layouts (return user's custom + built-in layouts)
    - Create POST /api/layouts with layout validation and name uniqueness check
    - Create PUT /api/layouts/:id with validation
    - Create DELETE /api/layouts/:id (preserve journal pages via ON DELETE SET NULL)
    - Enforce user authorization
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 8.2_

  - [x] 9.4 Implement Collections API routes
    - Create GET /api/collections
    - Create POST /api/collections with name validation (1-100 chars)
    - Create PUT /api/collections/:id
    - Create DELETE /api/collections/:id
    - Create POST /api/collections/:id/entries (add entry, enforce 10-collection limit)
    - Create DELETE /api/collections/:id/entries/:entryId (unlink without deleting entry)
    - Enforce user authorization
    - _Requirements: 7.1, 7.2, 7.5, 8.2_

  - [x] 9.5 Implement Calendar Config and Template Gallery API routes
    - Create GET /api/calendar-config and PUT /api/calendar-config with sizing constraints (10-90%)
    - Create GET /api/templates with filtering (category, search, sort) — public endpoint
    - Create GET /api/templates/:id — public endpoint
    - Enforce user authorization on calendar config
    - _Requirements: 5.5, 6.1, 6.2, 6.3, 6.4, 6.6, 1.1_

- [x] 10. Implement frontend UI components
  - [x] 10.1 Implement Layout Gallery component
    - Create gallery view displaying all available layouts with name and visual preview
    - Render within 1 second of page creation trigger
    - Implement layout selection: apply layout to new JournalPage and navigate to it
    - Implement gallery dismissal: do not create page, return to previous view
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 10.2 Implement Layout Editor component
    - Create drag-and-drop editor for content area sizes, positions, and types
    - Enforce max 20 content areas, min 5% / max 100% size constraints in UI
    - Implement save with name validation and duplicate name error display
    - Implement delete with confirmation (preserves existing pages)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 10.3 Implement Entry Editor and Task Management components
    - Create entry creation form requiring type selection (task/event/note) before save
    - Display entries with type-specific signifiers (bullet/circle/dash)
    - Implement signifier addition (displayed left of entry text, max 3 with priority/category limits)
    - Implement task state transitions: show only valid actions based on current state
    - Implement task migration UI: prompt for target page selection
    - Prevent save of empty text entries with error message
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 10.4 Implement Calendar View component
    - Create daily, weekly, monthly view options with period switching
    - Display events and date-specific tasks within selected period
    - Implement period navigation (next/previous day/week/month)
    - Show empty state indication when no entries exist for a period
    - Implement appearance customization: color theme selection, layout density (compact/standard/expanded)
    - Implement entry type visibility toggles
    - Implement resizable content areas with 10-90% constraints
    - Apply week start day configuration
    - Update calendar within 2 seconds of entry addition
    - Apply color theme within 2 seconds
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 10.5 Implement Collection View component
    - Create collection creation with name input (1-100 chars) and layout assignment
    - Display linked entries sorted by addition date with text, type signifier, and source page name
    - Implement add/remove entry from collection
    - Display pre-built collection templates (habit tracker, reading list, goal tracking)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.6 Implement Template Gallery Browser component
    - Create browsable gallery with category filtering, search, and sort (popular/newest/name)
    - Display template name, description, preview, author, and usage count
    - Implement "use template" action creating a layout in user's account
    - _Requirements: 1.1, 1.3, 1.4_

- [x] 11. Implement persistence indicators and auth UI
  - [x] 11.1 Implement save status indicators and auth flow
    - Display unsaved changes indicator when pending operations exist
    - Show save failure notification with retry information
    - Show persistent warning when all retries exhausted
    - Implement login/signup UI with Google, GitHub, and email/password options
    - Handle session expiry with redirect to login
    - _Requirements: 8.4, 8.5, 8.6_

- [x] 12. Wire everything together and final integration
  - [x] 12.1 Connect frontend services to SyncManager and API
    - Wire LayoutService, EntryService, CollectionService, CalendarService through SyncManager
    - Implement optimistic updates: apply changes to IndexedDB immediately, sync to server in background
    - Handle offline/online transitions: queue operations offline, push on reconnect
    - Ensure entry persistence within 2 seconds, layout/config persistence within 5 seconds
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design specifies React + TypeScript with Next.js on Vercel — all code uses TypeScript
- Template submission (future feature) is included in types but the submission API route is deferred
- Property-based tests and integration tests have been moved to a separate spec: `property-based-testing`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1", "3.2"] },
    { "id": 3, "tasks": ["2.2", "3.3"] },
    { "id": 4, "tasks": ["5.1", "5.2", "6.1"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.4", "9.5"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["12.1"] }
  ]
}
```
