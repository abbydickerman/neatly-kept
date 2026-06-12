# Requirements Document

## Introduction

A digital bullet journal application that allows users to organize tasks, events, and notes using customizable layouts and a flexible calendar system. The app replicates the analog bullet journal methodology in a digital format, giving users the ability to select, customize, and switch between different page layouts while maintaining a personalized calendar view.

## Glossary

- **App**: The digital bullet journal application
- **Layout**: A predefined or user-customized page template that defines the visual structure and arrangement of content areas on a journal page
- **Journal_Page**: A single page within the bullet journal that uses a specific Layout
- **Entry**: A single item (task, event, or note) recorded on a Journal_Page
- **Task**: An Entry representing an actionable item that can be marked as complete, migrated, or cancelled
- **Event**: An Entry representing a date-specific occurrence or appointment
- **Note**: An Entry representing a piece of information the user wants to record
- **Calendar_View**: A customizable date-based view that displays Events and Tasks across days, weeks, or months
- **Collection**: A themed grouping of Entries across multiple Journal_Pages (e.g., habit tracker, reading list)
- **Signifier**: A visual symbol or icon used to categorize or prioritize an Entry (e.g., bullet, dash, circle, star)
- **Migration**: The act of moving an incomplete Task from one Journal_Page or time period to another

## Requirements

### Requirement 1: Layout Selection

**User Story:** As a user, I want to browse and select from available layouts, so that I can structure my journal pages according to my preferred organization style.

#### Acceptance Criteria

1. WHEN the user creates a new Journal_Page, THE App SHALL present a gallery of available Layouts for selection within 1 second
2. THE App SHALL provide at least the following built-in Layouts: daily log, weekly spread, monthly log, and blank page
3. WHILE the Layout gallery is displayed, THE App SHALL show a name and a visual preview representing the content area arrangement for each Layout
4. WHEN the user selects a Layout from the gallery, THE App SHALL apply that Layout's defined content area structure to the new Journal_Page and navigate the user to the newly created Journal_Page
5. IF the user dismisses the Layout gallery without selecting a Layout, THEN THE App SHALL not create the new Journal_Page and SHALL return the user to their previous view

### Requirement 2: Layout Customization

**User Story:** As a user, I want to customize layouts, so that I can tailor the journal structure to my specific needs.

#### Acceptance Criteria

1. WHEN the user edits a Layout, THE App SHALL allow modification of content area sizes, positions, and types, where available content area types include at minimum: text block, checklist, image area, and blank space
2. WHEN the user edits a Layout, THE App SHALL enforce a maximum of 20 content areas per Layout, with each content area having a minimum size of 5% and a maximum size of 100% of the page dimensions
3. WHEN the user saves a customized Layout, THE App SHALL store the Layout for future reuse and display it in the Layout gallery within the same session
4. WHEN the user creates a custom Layout, THE App SHALL add the custom Layout to the Layout gallery alongside the built-in Layouts
5. THE App SHALL allow the user to name and rename custom Layouts with a name between 1 and 50 characters in length
6. IF the user attempts to save a custom Layout with an empty name or a name that duplicates an existing Layout name, THEN THE App SHALL display an error message indicating the naming conflict and retain the user's unsaved changes
7. WHEN the user deletes a custom Layout, THE App SHALL remove the Layout from the Layout gallery while preserving any existing Journal_Pages that were created using that Layout

### Requirement 3: Task Management

**User Story:** As a user, I want to create and manage tasks within my journal pages, so that I can track actionable items and their completion status.

#### Acceptance Criteria

1. WHEN the user creates a Task, THE App SHALL assign a default Signifier indicating an incomplete status and set the Task state to incomplete
2. WHEN the user marks a Task as complete, THE App SHALL update the Signifier to a visually distinct completion indicator and set the Task state to complete
3. WHEN the user migrates a Task, THE App SHALL prompt the user to select a target Journal_Page, move the Task to the target Journal_Page with an incomplete state, and update the original Entry with a migration Signifier
4. WHEN the user cancels a Task, THE App SHALL update the Signifier to a visually distinct cancellation indicator and set the Task state to cancelled
5. THE App SHALL support the following Task states: incomplete, complete, migrated, and cancelled, each represented by a visually distinct Signifier
6. THE App SHALL allow state changes only from the incomplete state to complete, migrated, or cancelled
7. IF the user attempts to migrate a Task and no valid target Journal_Page is selected, THEN THE App SHALL retain the Task in its current state and location

### Requirement 4: Entry Creation

**User Story:** As a user, I want to quickly log entries using bullet journal notation, so that I can capture information efficiently.

#### Acceptance Criteria

1. WHEN the user creates an Entry, THE App SHALL require the user to specify the Entry type as Task, Event, or Note before the Entry is saved
2. THE App SHALL display each Entry type with a visually unique default Signifier: a bullet symbol for Tasks, a circle symbol for Events, and a dash symbol for Notes
3. WHEN the user adds a Signifier to an Entry, THE App SHALL display the Signifier immediately to the left of the Entry text
4. THE App SHALL allow the user to add up to 3 Signifiers to any Entry, including at most one priority Signifier and up to 2 category Signifiers
5. IF the user attempts to save an Entry with empty text, THEN THE App SHALL prevent the save and display an error message indicating that Entry text is required
6. THE App SHALL accept Entry text between 1 and 500 characters in length

### Requirement 5: Calendar View

**User Story:** As a user, I want a customizable calendar view, so that I can see my events and tasks organized by date.

#### Acceptance Criteria

1. THE App SHALL provide daily, weekly, and monthly Calendar_View options
2. WHEN the user switches between Calendar_View options, THE App SHALL display all Events and date-specific Tasks whose dates fall within the selected time period
3. WHEN the user adds an Event or date-specific Task, THE App SHALL display the Entry on the corresponding date in the Calendar_View within 2 seconds
4. WHEN the user navigates to the next or previous time period, THE App SHALL update the Calendar_View to display the adjacent day, week, or month corresponding to the active Calendar_View option
5. THE App SHALL allow the user to customize the Calendar_View appearance by selecting a color theme and choosing a layout density from the options: compact, standard, and expanded
6. IF the selected time period contains no Events or date-specific Tasks, THEN THE App SHALL display the Calendar_View with an empty state indication for that period

### Requirement 6: Calendar Customization

**User Story:** As a user, I want to personalize my calendar display, so that it matches my workflow and aesthetic preferences.

#### Acceptance Criteria

1. WHEN the user configures the Calendar_View, THE App SHALL allow selection of the week start day from any day Monday through Sunday, with Monday as the default
2. WHEN the user applies a color theme to the Calendar_View, THE App SHALL update the background, text, Entry markers, grid lines, and date headers to reflect the selected theme within 2 seconds
3. THE App SHALL provide at least 3 built-in color themes for the Calendar_View
4. THE App SHALL allow the user to toggle visibility of each Entry type (Task, Event, and Note) independently within the Calendar_View, with all types visible by default
5. IF the user hides all Entry types in the Calendar_View, THEN THE App SHALL display the calendar grid with date headers and no Entry content
6. WHEN the user resizes content areas in the Calendar_View, THE App SHALL constrain each area to a minimum of 10% and a maximum of 90% of the available Calendar_View width or height, and persist the custom sizing across sessions

### Requirement 7: Collections

**User Story:** As a user, I want to create themed collections, so that I can group related entries across multiple pages.

#### Acceptance Criteria

1. WHEN the user creates a Collection, THE App SHALL allow the user to name the Collection with a name between 1 and 100 characters and assign a dedicated Layout
2. WHEN the user adds an Entry to a Collection, THE App SHALL link the Entry to the Collection regardless of which Journal_Page the Entry resides on, and an Entry SHALL be linkable to up to 10 Collections simultaneously
3. WHEN the user opens a Collection, THE App SHALL display all linked Entries in a single view sorted by the date each Entry was added to the Collection, showing each Entry's text, type Signifier, and source Journal_Page name
4. THE App SHALL provide pre-built Collection templates for habit trackers, reading lists, and goal tracking, each with a corresponding default Layout
5. WHEN the user removes an Entry from a Collection, THE App SHALL unlink the Entry from the Collection without deleting the Entry from its source Journal_Page
6. IF a linked Entry is deleted from its source Journal_Page, THEN THE App SHALL remove the Entry from all Collections it was linked to and no longer display it in the Collection view

### Requirement 8: Data Persistence

**User Story:** As a user, I want my journal data saved automatically, so that I never lose my entries or customizations.

#### Acceptance Criteria

1. WHEN the user creates or modifies an Entry, THE App SHALL persist the change within 2 seconds
2. WHEN the user creates or modifies a custom Layout, Calendar_View configuration, or Collection definition, THE App SHALL persist the change within 5 seconds
3. WHEN the user reopens the App, THE App SHALL restore all Entries, custom Layouts, Calendar_View configurations, and Collection definitions to the state at the time of the last persisted change
4. IF a save operation fails, THEN THE App SHALL display a notification indicating the unsaved change and retry the save operation up to 3 times with a 5-second delay between attempts
5. IF all retry attempts for a save operation are exhausted, THEN THE App SHALL display a persistent warning indicating that the change has not been saved and retain the unsaved change in memory until the next successful save or until the App is closed
6. WHILE one or more changes remain unpersisted, THE App SHALL display an indicator distinguishing unsaved state from saved state
