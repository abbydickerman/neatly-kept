# Requirements Document

## Introduction

A layout and plan system that restructures the digital bullet journal around three core components: My Stuff (the user's active workspace combining weekly, monthly, and derived daily views), Layout Pick (a gallery for browsing and selecting layout templates), and Plan Picks (composable add-ons that inject structured content like meal planning or exercise tracking into the user's active layouts). This system enables users to select visual layout templates, layer multiple plan add-ons, and view a computed daily slice that merges their weekly column, active plan items, and monthly context into a single focused view.

## Glossary

- **App**: The digital bullet journal application
- **My_Stuff**: The user's primary workspace displaying their currently active Weekly_Layout, Monthly_Layout, and computed Daily_View
- **Layout_Pick**: A gallery interface where users browse and select Layout_Templates to activate
- **Plan_Picks**: A gallery interface where users browse and activate Plan add-ons
- **Layout_Template**: A predefined visual structure defining the arrangement of content areas for either a weekly or monthly spread (e.g., day columns, side panels, trackers, notes areas)
- **Weekly_Layout**: The user's currently active Layout_Template of category "weekly," defining the visual structure for their week spread
- **Monthly_Layout**: The user's currently active Layout_Template of category "monthly," defining the visual structure for their month spread
- **Daily_View**: A computed view that combines today's slice from the Weekly_Layout (the column for the current day of the week) with relevant Plan items and Monthly_Layout context
- **Plan**: A pre-built add-on that injects structured content widgets into the user's active layouts (e.g., meal slots, workout entries, habit checkboxes)
- **Plan_Widget**: A discrete content block injected by a Plan into a specific location within a layout (e.g., a breakfast/lunch/dinner slot for a Diet Plan)
- **Layout_Category**: A classification for Layout_Templates, either "weekly" or "monthly"
- **Sidebar**: The application's main navigation panel containing sections for My_Stuff, Layout_Pick, and Plan_Picks

## Requirements

### Requirement 1: Sidebar Navigation

**User Story:** As a user, I want a sidebar with clear sections for my workspace, layout gallery, and plan gallery, so that I can navigate between the three main areas of the app.

#### Acceptance Criteria

1. THE App SHALL display a Sidebar with three navigation sections labeled "My Stuff," "Layout Pick," and "Plan Picks"
2. WHEN the user selects a Sidebar section, THE App SHALL display the corresponding view in the main content area and visually indicate the active section in the Sidebar
3. WHEN the App is opened, THE App SHALL default to displaying the My_Stuff section as the active view

### Requirement 2: Layout Template Browsing

**User Story:** As a user, I want to browse a gallery of layout templates organized by category, so that I can find and select the visual structure that fits my journaling style.

#### Acceptance Criteria

1. WHEN the user navigates to Layout_Pick, THE App SHALL display all available Layout_Templates organized by Layout_Category ("weekly" and "monthly")
2. THE App SHALL display a name, visual preview, and brief description for each Layout_Template in the gallery
3. WHEN the user filters Layout_Templates by Layout_Category, THE App SHALL display only templates matching the selected category
4. THE App SHALL provide at least 2 built-in Layout_Templates for the "weekly" category and at least 2 built-in Layout_Templates for the "monthly" category
5. WHEN the user searches Layout_Templates by name, THE App SHALL display templates whose name contains the search term, case-insensitive

### Requirement 3: Layout Activation

**User Story:** As a user, I want to pick a layout template and have it become my active weekly or monthly layout, so that my workspace reflects my chosen visual structure.

#### Acceptance Criteria

1. WHEN the user selects a Layout_Template of category "weekly" from Layout_Pick, THE App SHALL set that template as the user's active Weekly_Layout and display it in My_Stuff
2. WHEN the user selects a Layout_Template of category "monthly" from Layout_Pick, THE App SHALL set that template as the user's active Monthly_Layout and display it in My_Stuff
3. THE App SHALL allow the user to have exactly one active Weekly_Layout and exactly one active Monthly_Layout at any time
4. WHEN the user activates a new Layout_Template that replaces an existing active layout of the same category, THE App SHALL preserve all existing entries and Plan_Widgets associated with the previous layout and transfer them to the new layout structure
5. IF the user has no active Weekly_Layout or Monthly_Layout, THEN THE App SHALL display a prompt in My_Stuff directing the user to Layout_Pick to select a template

### Requirement 4: My Stuff Weekly View

**User Story:** As a user, I want to see my active weekly layout as a full spread, so that I can view and interact with my entire week at once.

#### Acceptance Criteria

1. WHEN the user selects the weekly view within My_Stuff, THE App SHALL display the active Weekly_Layout as a complete spread showing all seven day columns and any side panels defined by the template
2. THE App SHALL populate each day column in the Weekly_Layout with the entries and Plan_Widgets assigned to that day
3. WHEN the user creates an entry within a day column of the Weekly_Layout, THE App SHALL associate that entry with the corresponding date
4. WHEN the user navigates to the next or previous week, THE App SHALL update the Weekly_Layout to display entries and Plan_Widgets for the adjacent week

### Requirement 5: My Stuff Monthly View

**User Story:** As a user, I want to see my active monthly layout as a full spread, so that I can view and plan at the month level.

#### Acceptance Criteria

1. WHEN the user selects the monthly view within My_Stuff, THE App SHALL display the active Monthly_Layout showing the complete month structure as defined by the template
2. THE App SHALL populate the Monthly_Layout with entries and Plan_Widgets assigned to the displayed month
3. WHEN the user creates an entry within the Monthly_Layout, THE App SHALL associate that entry with the corresponding month
4. WHEN the user navigates to the next or previous month, THE App SHALL update the Monthly_Layout to display entries and Plan_Widgets for the adjacent month

### Requirement 6: Computed Daily View

**User Story:** As a user, I want a daily view that automatically shows today's slice from my weekly layout combined with my plan items and monthly context, so that I have a focused view of what matters today.

#### Acceptance Criteria

1. WHEN the user selects the daily view within My_Stuff, THE App SHALL display a computed view combining the current day's column from the active Weekly_Layout, all Plan_Widgets assigned to the current day, and relevant monthly context from the active Monthly_Layout
2. THE App SHALL derive the daily column by extracting the content area corresponding to today's day of the week from the Weekly_Layout (e.g., Monday's column on a Monday)
3. WHEN the user navigates to the next or previous day, THE App SHALL recompute the Daily_View for the target date using the corresponding day column from the Weekly_Layout and that day's Plan_Widgets
4. WHEN the user creates an entry within the Daily_View, THE App SHALL associate the entry with the displayed date and reflect it in the Weekly_Layout's corresponding day column
5. IF the user has no active Weekly_Layout, THEN THE App SHALL display the Daily_View with only Plan_Widgets and monthly context, along with a prompt to select a Weekly_Layout

### Requirement 7: Plan Browsing

**User Story:** As a user, I want to browse available plan add-ons, so that I can discover structured content options to enhance my journaling.

#### Acceptance Criteria

1. WHEN the user navigates to Plan_Picks, THE App SHALL display all available Plans with a name, description, and preview of the widgets each Plan provides
2. THE App SHALL provide at least the following built-in Plans: Diet Plan, Exercise Plan, Habit Tracker, Reading List, and Goal Tracker
3. THE App SHALL indicate which Plans are currently active for the user with a visual marker distinguishing active Plans from inactive Plans
4. WHEN the user views a Plan's details, THE App SHALL display a description of all Plan_Widgets that the Plan injects (e.g., "Adds breakfast, lunch, and dinner slots to each day")

### Requirement 8: Plan Activation and Deactivation

**User Story:** As a user, I want to activate and deactivate plans without losing my data, so that I can customize my daily experience and try different plans freely.

#### Acceptance Criteria

1. WHEN the user activates a Plan, THE App SHALL inject the Plan's defined Plan_Widgets into the user's active Weekly_Layout and Daily_View for each applicable day
2. WHEN the user activates a Plan that includes weekly-level widgets (e.g., a grocery list for the Diet Plan), THE App SHALL inject those widgets into the Weekly_Layout's designated side panel or supplementary area
3. WHEN the user deactivates a Plan, THE App SHALL hide the Plan's Plan_Widgets from the layout views without deleting any user-entered data associated with those widgets
4. WHEN the user reactivates a previously deactivated Plan, THE App SHALL restore the Plan_Widgets and display all previously entered data intact
5. THE App SHALL allow the user to have multiple Plans active simultaneously, with each Plan's widgets rendered in the layout without overlap or conflict
6. IF a Plan is activated and no active Weekly_Layout exists, THEN THE App SHALL store the Plan activation and apply the Plan_Widgets when the user subsequently selects a Weekly_Layout

### Requirement 9: Plan Widget Injection

**User Story:** As a user, I want plan widgets to appear within my existing layout structure rather than replacing it, so that my layout's visual design is preserved while gaining plan functionality.

#### Acceptance Criteria

1. WHEN a Plan is activated, THE App SHALL inject Plan_Widgets into designated injection zones within the active Layout_Template without modifying the template's core structure
2. THE App SHALL render Plan_Widgets within their injection zone in the order the corresponding Plans were activated
3. WHEN multiple Plans inject widgets into the same injection zone, THE App SHALL stack the widgets vertically within that zone
4. THE App SHALL define the following injection zones for weekly templates: a daily content zone within each day column and a supplementary zone in the side panel area
5. THE App SHALL define the following injection zones for monthly templates: a monthly goals zone and a monthly summary zone
6. WHEN the user enters data into a Plan_Widget (e.g., typing a meal into a Diet Plan slot), THE App SHALL persist the data and associate it with the specific Plan, date, and widget type

### Requirement 10: Diet Plan Behavior

**User Story:** As a user, I want the Diet Plan to add meal tracking slots to each day and a grocery list to my weekly view, so that I can plan meals alongside my other journal content.

#### Acceptance Criteria

1. WHEN the Diet Plan is activated, THE App SHALL inject a Plan_Widget containing breakfast, lunch, and dinner entry slots into each day's content zone in the Weekly_Layout and Daily_View
2. WHEN the Diet Plan is activated, THE App SHALL inject a grocery list Plan_Widget into the Weekly_Layout's supplementary zone
3. THE App SHALL allow the user to enter free-text content for each meal slot and each grocery list item
4. WHEN the user navigates to a new week, THE App SHALL display empty meal slots for the new week while retaining previously entered meal data for past weeks

### Requirement 11: Exercise Plan Behavior

**User Story:** As a user, I want the Exercise Plan to add workout slots to each day, so that I can log and plan my exercise routine within my journal.

#### Acceptance Criteria

1. WHEN the Exercise Plan is activated, THE App SHALL inject a Plan_Widget containing a workout entry area into each day's content zone in the Weekly_Layout and Daily_View
2. THE App SHALL allow the user to enter free-text content describing the workout for each day
3. WHEN the user navigates to a new week, THE App SHALL display empty workout slots for the new week while retaining previously entered workout data for past weeks

### Requirement 12: View Switching

**User Story:** As a user, I want to switch between weekly, monthly, and daily views within My Stuff, so that I can see my information at different time scales.

#### Acceptance Criteria

1. WHILE the user is in My_Stuff, THE App SHALL display controls allowing the user to switch between the weekly view, monthly view, and daily view
2. WHEN the user switches between views, THE App SHALL display the selected view within 1 second
3. WHEN the user switches from the daily view to the weekly view, THE App SHALL display the week containing the previously viewed day with that day's column visually highlighted
4. WHEN the user switches from the daily view to the monthly view, THE App SHALL display the month containing the previously viewed day

### Requirement 13: Data Persistence for Plans

**User Story:** As a user, I want all data I enter into plan widgets to be saved automatically, so that I never lose my meal logs, workout notes, or other plan-related entries.

#### Acceptance Criteria

1. WHEN the user enters or modifies data within a Plan_Widget, THE App SHALL persist the change within 2 seconds
2. WHEN the user reopens the App, THE App SHALL restore all Plan_Widget data, active Plan states, and active Layout_Template selections to their last persisted state
3. IF a save operation for Plan_Widget data fails, THEN THE App SHALL display a notification indicating the unsaved change and retry the save operation up to 3 times with a 5-second delay between attempts
4. THE App SHALL retain deactivated Plan data indefinitely until the user explicitly deletes it

