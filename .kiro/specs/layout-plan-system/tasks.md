# Implementation Plan: Layout Plan System

## Overview

Implement the three-section architecture (My Stuff, Layout Pick, Plan Picks) with new database tables for layout templates, user selections, plans, plan activations, and plan widget data. Build out services, API routes, Zustand stores, and UI components to support template browsing, layout activation, plan activation/deactivation, widget data persistence, and the computed daily view.

## Tasks

- [x] 1. Define types and database schema for the layout plan system
  - [x] 1.1 Create TypeScript types for layout templates, plans, and computed views
    - Create `src/types/layout-plan.ts` with all interfaces: `LayoutCategory`, `LayoutTemplate`, `LayoutTemplateStructure`, `TemplateArea`, `InjectionZone`, `UserLayoutSelection`, `Plan`, `PlanWidgetDefinition`, `PlanActivation`, `PlanWidgetDataRecord`, `InjectedWidget`, `ComputedDailyView`
    - Export all types from `src/types/index.ts`
    - _Requirements: 2.1, 3.1, 6.1, 8.1, 9.1_

  - [x] 1.2 Add new database tables to the schema
    - Add `layoutTemplates`, `userLayoutSelections`, `plans`, `planActivations`, and `planWidgetData` tables to `src/db/schema.ts` following the design's Drizzle ORM definitions
    - Include all indexes and unique constraints as specified
    - _Requirements: 3.1, 3.3, 8.1, 9.6, 13.2_

  - [x] 1.3 Create seed data file with built-in templates and plans
    - Create `src/db/seeds/layout-plan-seeds.ts` containing the built-in weekly templates (Classic Weekly Spread, Minimal Weekly), built-in monthly templates (at least 2), and all 5 built-in plans (Diet Plan, Exercise Plan, Habit Tracker, Reading List, Goal Tracker) as defined in the design
    - _Requirements: 2.4, 7.2_

- [x] 2. Implement layout template service
  - [x] 2.1 Create the layout template service
    - Create `src/services/layout-template-service.ts` implementing `getAllTemplates()`, `getTemplatesByCategory(category)`, `searchTemplates(term)`, and `getTemplateById(id)`
    - Use Drizzle ORM to query the `layoutTemplates` table
    - Search uses case-insensitive `ilike` on the name column
    - _Requirements: 2.1, 2.3, 2.5_

  - [ ]* 2.2 Write property tests for template category filtering
    - **Property 1: Template category filtering correctness**
    - **Validates: Requirements 2.1, 2.3**

  - [ ]* 2.3 Write property tests for template search
    - **Property 2: Template search correctness**
    - **Validates: Requirements 2.5**

  - [ ]* 2.4 Write unit tests for layout template service
    - Test `getAllTemplates`, `getTemplatesByCategory`, `searchTemplates`, and `getTemplateById` methods
    - _Requirements: 2.1, 2.3, 2.5_

- [x] 3. Implement layout selection service
  - [x] 3.1 Create the layout selection service
    - Create `src/services/layout-selection-service.ts` implementing `getActiveSelection(userId, category)`, `activateTemplate(userId, templateId)`, `getActiveWeeklyTemplate(userId)`, and `getActiveMonthlyTemplate(userId)`
    - `activateTemplate` uses upsert logic (insert on conflict update) to enforce one active template per user per category
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 3.2 Write property test for single active layout per category invariant
    - **Property 3: Single active layout per category invariant**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 3.3 Write property test for template switching preserves user data
    - **Property 4: Template switching preserves user data**
    - **Validates: Requirements 3.4**

  - [ ]* 3.4 Write unit tests for layout selection service
    - Test activation, replacement, and retrieval of selections
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Implement plan service
  - [x] 4.1 Create the plan service
    - Create `src/services/plan-service.ts` implementing `getAllPlans()`, `getPlanById(id)`, `getActivePlans(userId)`, `activatePlan(userId, planId)`, `deactivatePlan(userId, planId)`, and `isPlanActive(userId, planId)`
    - `activatePlan` upserts with `isActive: true` and sets `activatedAt`
    - `deactivatePlan` sets `isActive: false` and records `deactivatedAt` without deleting the record
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 4.2 Write property test for plan deactivation hides widgets but preserves data
    - **Property 13: Plan deactivation hides widgets but preserves data**
    - **Validates: Requirements 8.3, 13.4**

  - [ ]* 4.3 Write property test for plan activation/deactivation/reactivation round-trip
    - **Property 14: Plan activation/deactivation/reactivation round-trip**
    - **Validates: Requirements 8.4**

  - [ ]* 4.4 Write unit tests for plan service
    - Test activation, deactivation, reactivation, and listing active plans
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [x] 5. Checkpoint - Verify services compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement plan widget service and daily view computer
  - [x] 6.1 Create the plan widget service
    - Create `src/services/plan-widget-service.ts` implementing `getWidgetsForDate(userId, date)`, `getWidgetData(userId, planId, widgetType, date)`, and `saveWidgetData(userId, planId, widgetType, date, value)`
    - `getWidgetsForDate` joins `planActivations` (where `isActive = true`) with `plans` to resolve widget definitions, then left-joins `planWidgetData` to attach existing data
    - `saveWidgetData` uses upsert on the unique constraint (userId, planId, widgetType, date)
    - _Requirements: 9.6, 10.3, 11.2, 13.1_

  - [ ]* 6.2 Write property test for widget data persistence round-trip
    - **Property 17: Widget data persistence round-trip**
    - **Validates: Requirements 9.6**

  - [ ]* 6.3 Write property test for widget data date isolation
    - **Property 18: Widget data is date-isolated**
    - **Validates: Requirements 10.4, 11.3**

  - [ ]* 6.4 Write property test for multiple active plans produce combined widgets
    - **Property 15: Multiple active plans produce combined widgets without conflict**
    - **Validates: Requirements 8.5, 9.2**

  - [x] 6.5 Create the daily view computer service
    - Create `src/services/daily-view-computer.ts` implementing `computeDailyView(userId, date)`
    - Extracts the day column from the active weekly template matching the target day-of-week
    - Fetches entries for the date, active plan widgets for the date, and monthly context
    - Returns a `ComputedDailyView` object
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [ ]* 6.6 Write property test for day column extraction correctness
    - **Property 5: Day column extraction correctness**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 6.7 Write property test for plan activation injects widgets into correct zones
    - **Property 12: Plan activation injects widgets into correct zones**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 6.8 Write unit tests for daily view computer
    - Test computed view with and without active layouts, with and without active plans
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 7. Implement API routes for layout templates and selections
  - [x] 7.1 Create layout templates API route
    - Create `src/app/api/layout-templates/route.ts` with GET handler
    - Support query params: `category` (filter), `search` (name search)
    - Return JSON array of templates
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 7.2 Create layout selections API routes
    - Create `src/app/api/layout-selections/route.ts` with GET (active selections) and POST (activate template) handlers
    - POST body: `{ templateId: string }`; resolves category from template
    - Authenticate user via session
    - _Requirements: 3.1, 3.2_

  - [ ]* 7.3 Write unit tests for layout API routes
    - Test GET with filters, POST activation, and error cases
    - _Requirements: 2.1, 2.3, 3.1, 3.2_

- [x] 8. Implement API routes for plans and plan widget data
  - [x] 8.1 Create plans API routes
    - Create `src/app/api/plans/route.ts` with GET handler (list all plans with active status for current user)
    - Create `src/app/api/plans/[id]/activate/route.ts` with POST handler (activate plan)
    - Create `src/app/api/plans/[id]/deactivate/route.ts` with POST handler (deactivate plan)
    - _Requirements: 7.1, 7.3, 8.1, 8.3_

  - [x] 8.2 Create plan widget data API routes
    - Create `src/app/api/plan-widget-data/route.ts` with GET (query by date) and PUT (save widget data) handlers
    - GET query params: `date` (required)
    - PUT body: `{ planId, widgetType, date, value }`
    - _Requirements: 9.6, 13.1_

  - [x] 8.3 Create daily view API route
    - Create `src/app/api/daily-view/route.ts` with GET handler
    - Query param: `date` (defaults to today)
    - Returns the computed daily view for the authenticated user
    - _Requirements: 6.1, 6.2_

  - [ ]* 8.4 Write unit tests for plans and widget data API routes
    - Test plan activation/deactivation, widget data save/retrieve, and daily view computation
    - _Requirements: 7.1, 8.1, 8.3, 9.6, 6.1_

- [x] 9. Checkpoint - Verify API routes compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create Zustand stores for navigation, layout selection, and plan activation
  - [x] 10.1 Create the navigation store
    - Create `src/store/navigation-store.ts` implementing `NavigationState` with `activeSection`, `activeView`, `currentDate`, and navigation methods (`navigateDay`, `navigateWeek`, `navigateMonth`)
    - Default section is `'my-stuff'`, default view is `'weekly'`, default date is today
    - _Requirements: 1.2, 1.3, 12.1_

  - [ ]* 10.2 Write property tests for navigation date shifting
    - **Property 8: Week navigation shifts by exactly 7 days**
    - **Property 9: Month navigation shifts by exactly one calendar month**
    - **Property 10: Day navigation shifts by exactly one day**
    - **Validates: Requirements 4.4, 5.4, 6.3**

  - [x] 10.3 Create the layout selection store
    - Create `src/store/layout-selection-store.ts` implementing `LayoutSelectionState` with `activeWeeklyTemplateId`, `activeMonthlyTemplateId`, `activateTemplate`, and `loadSelections`
    - Calls the layout selections API on activation and initial load
    - _Requirements: 3.1, 3.2, 13.2_

  - [x] 10.4 Create the plan activation store
    - Create `src/store/plan-activation-store.ts` implementing `PlanActivationState` with `activePlanIds`, `activatePlan`, `deactivatePlan`, and `loadActivations`
    - Calls the plans API on activation/deactivation
    - _Requirements: 8.1, 8.3, 8.5, 13.2_

  - [ ]* 10.5 Write property test for view switching preserves temporal context
    - **Property 19: View switching preserves temporal context**
    - **Validates: Requirements 12.3, 12.4**

  - [ ]* 10.6 Write unit tests for Zustand stores
    - Test navigation state changes, layout activation, plan activation/deactivation
    - _Requirements: 1.2, 3.1, 8.1, 12.1_

- [x] 11. Build sidebar navigation and view switcher components
  - [x] 11.1 Create the Sidebar component
    - Create `src/components/Sidebar.tsx` with three sections: "My Stuff", "Layout Pick", "Plan Picks"
    - Highlight active section, use navigation store for state
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 11.2 Create the ViewSwitcher component
    - Create `src/components/ViewSwitcher.tsx` with controls for weekly, monthly, and daily views
    - Display within My Stuff, use navigation store
    - _Requirements: 12.1, 12.2_

  - [ ]* 11.3 Write unit tests for Sidebar and ViewSwitcher
    - Test section highlighting, view switching, and default active states
    - _Requirements: 1.1, 1.2, 1.3, 12.1_

- [x] 12. Build Layout Pick gallery components
  - [x] 12.1 Create the LayoutTemplateGallery component
    - Create `src/components/LayoutTemplateGallery.tsx` displaying all templates organized by category with search and filter controls
    - Include `LayoutTemplateCard` sub-component for each template (name, description, preview, active indicator)
    - Call layout templates API with filter/search params
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 12.2 Create the LayoutTemplateCard component
    - Create `src/components/LayoutTemplateCard.tsx` showing template name, visual preview, description, and active indicator
    - On click, activate the template via layout selection store
    - _Requirements: 2.2, 3.1, 3.2_

  - [ ]* 12.3 Write unit tests for LayoutTemplateGallery
    - Test rendering, filtering, searching, and template activation
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.1_

- [x] 13. Build Plan Picks gallery components
  - [x] 13.1 Create the PlanGallery component
    - Create `src/components/PlanGallery.tsx` displaying all plans with name, description, widget preview, and active/inactive indicator
    - Include toggle button for activation/deactivation per plan
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 13.2 Create the PlanCard component
    - Create `src/components/PlanCard.tsx` showing plan name, description, list of widgets it provides, and activation toggle
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ]* 13.3 Write unit tests for PlanGallery and PlanCard
    - Test rendering, active state display, and activation/deactivation toggling
    - _Requirements: 7.1, 7.3, 8.1, 8.3_

- [x] 14. Build My Stuff view components (weekly, monthly, daily)
  - [x] 14.1 Create the WeeklyLayoutView component
    - Create `src/components/WeeklyLayoutView.tsx` rendering the active weekly template structure with day columns, entries, and injected plan widgets
    - Include week navigation (prev/next) and entry creation within day columns
    - Render plan widgets within injection zones ordered by activation timestamp
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4_

  - [x] 14.2 Create the MonthlyLayoutView component
    - Create `src/components/MonthlyLayoutView.tsx` rendering the active monthly template with month grid, entries, and injected plan widgets
    - Include month navigation (prev/next) and entry creation
    - Render monthly-frequency plan widgets in monthly-goals and monthly-summary zones
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.5_

  - [x] 14.3 Create the DailyView component
    - Create `src/components/DailyView.tsx` rendering the computed daily view with day column, entries, plan widgets, and monthly context
    - Include day navigation (prev/next) and entry creation
    - Show prompt to select a weekly layout if none is active
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 14.4 Create the PlanWidgetRenderer component
    - Create `src/components/PlanWidgetRenderer.tsx` rendering a single plan widget based on its `inputType` (free-text input or checklist)
    - Handle data changes and persist via plan widget data API
    - _Requirements: 9.6, 10.3, 11.2, 13.1_

  - [ ]* 14.5 Write property test for entries appear in correct day column
    - **Property 7: Entries appear in correct day column**
    - **Validates: Requirements 4.2**

  - [ ]* 14.6 Write property test for monthly view shows only entries within the displayed month
    - **Property 11: Monthly view shows only entries within the displayed month**
    - **Validates: Requirements 5.2**

  - [ ]* 14.7 Write unit tests for WeeklyLayoutView, MonthlyLayoutView, and DailyView
    - Test rendering with and without layouts, entry creation, widget injection, and navigation
    - _Requirements: 4.1, 5.1, 6.1, 9.1_

- [x] 15. Checkpoint - Verify all components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Wire together the main app page with layout plan system
  - [x] 16.1 Create the main layout plan page
    - Create `src/app/layout-plan/page.tsx` as the entry point combining `Sidebar`, `ViewSwitcher`, and conditional rendering of `LayoutTemplateGallery`, `PlanGallery`, `WeeklyLayoutView`, `MonthlyLayoutView`, or `DailyView` based on navigation store state
    - Show "no layout selected" prompt when appropriate
    - _Requirements: 1.1, 1.2, 1.3, 3.5, 6.5_

  - [x] 16.2 Connect stores to API on page load
    - In the main page component, load layout selections and plan activations from API on mount via store actions (`loadSelections`, `loadActivations`)
    - _Requirements: 13.2_

  - [ ]* 16.3 Write property test for template structure immutability under plan activation
    - **Property 16: Template structure immutability under plan activation**
    - **Validates: Requirements 9.1**

  - [ ]* 16.4 Write property test for application state persistence round-trip
    - **Property 20: Application state persistence round-trip**
    - **Validates: Requirements 13.2**

  - [ ]* 16.5 Write integration tests for the full layout plan page
    - Test section navigation, template activation from gallery, plan activation, and daily view computation end-to-end
    - _Requirements: 1.1, 1.2, 3.1, 8.1, 6.1_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout; all implementation uses TypeScript with Next.js App Router patterns
- Zustand stores use the project's existing store pattern in `src/store/`
- Services follow the naming convention in `src/services/` (kebab-case filenames)
- API routes follow Next.js App Router conventions in `src/app/api/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["6.1", "6.5", "7.1", "7.2"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "6.6", "6.7", "6.8", "7.3", "8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["8.4", "10.1", "10.3", "10.4"] },
    { "id": 6, "tasks": ["10.2", "10.5", "10.6", "11.1", "11.2"] },
    { "id": 7, "tasks": ["11.3", "12.1", "12.2", "13.1", "13.2"] },
    { "id": 8, "tasks": ["12.3", "13.3", "14.1", "14.2", "14.3", "14.4"] },
    { "id": 9, "tasks": ["14.5", "14.6", "14.7", "16.1", "16.2"] },
    { "id": 10, "tasks": ["16.3", "16.4", "16.5"] }
  ]
}
```
