# Implementation Plan: Property-Based Testing Suite

## Overview

A comprehensive property-based testing suite for the Digital Bullet Journal application using fast-check. These tests validate the 28 correctness properties defined in the design document, covering layout validation, task state machine, entry validation, calendar logic, collection management, persistence, API authorization, and the template gallery.

## Tasks

- [ ] 1. Set up property-based testing infrastructure
  - [ ] 1.1 Configure fast-check and test utilities
    - Install fast-check if not already present
    - Create shared test generators/arbitraries for domain types (Layout, Entry, TaskState, Collection, CalendarPeriod, etc.)
    - Configure minimum 100 iterations per property test
    - Set up test directory structure: tests/properties/
    - _Requirements: All_

- [ ] 2. Layout property tests
  - [ ] 2.1 Write property tests for layout validation
    - **Property 1: Layout validation enforces content area constraints**
    - **Property 2: Layout name length validation**
    - **Property 3: Layout name uniqueness enforcement**
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

  - [ ] 2.2 Write property tests for layout persistence and deletion
    - **Property 4: Layout persistence round-trip**
    - **Property 5: Layout deletion preserves journal pages**
    - _Requirements: 2.3, 2.7_

- [ ] 3. Task state machine and entry property tests
  - [ ] 3.1 Write property tests for task state machine
    - **Property 6: Task state machine correctness**
    - **Property 7: Task migration produces correct results**
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.2 Write property tests for entry validation and signifiers
    - **Property 8: Entry validation correctness**
    - **Property 9: Signifier composition constraints**
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

- [ ] 4. Calendar property tests
  - [ ] 4.1 Write property tests for calendar period logic
    - **Property 10: Calendar period filtering returns correct entries**
    - **Property 11: Calendar period navigation round-trip**
    - **Property 12: Week start day determines weekly period boundaries**
    - _Requirements: 5.2, 5.4, 6.1_

  - [ ] 4.2 Write property tests for calendar configuration
    - **Property 13: Entry type visibility filtering**
    - **Property 14: Calendar sizing constraints**
    - _Requirements: 6.4, 6.6_

- [ ] 5. Collection property tests
  - [ ] 5.1 Write property tests for collection logic
    - **Property 15: Collection name length validation**
    - **Property 16: Collection link limit enforcement**
    - **Property 17: Collection entries sorted by addition date**
    - **Property 18: Unlinking entry from collection preserves the entry**
    - **Property 19: Entry deletion cascades to all collection links**
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [ ] 6. Persistence and sync property tests
  - [ ] 6.1 Write property tests for save retry and unsaved indicator
    - **Property 20: Data persistence round-trip (client restore)**
    - **Property 21: Save retry logic**
    - **Property 22: Unsaved changes indicator accuracy**
    - _Requirements: 8.3, 8.4, 8.6_

  - [ ] 6.2 Write property test for sync manager
    - **Property 28: Sync manager pushes all dirty entities**
    - _Requirements: 8.1, 8.2_

- [ ] 7. API and template gallery property tests
  - [ ] 7.1 Write property tests for API authorization and persistence
    - **Property 23: Server-side persistence round-trip (API)**
    - **Property 24: API authorization isolation**
    - _Requirements: 8.3_

  - [ ] 7.2 Write property tests for template gallery
    - **Property 25: Template gallery filtering correctness**
    - **Property 26: Using a template creates an equivalent layout**
    - **Property 27: Template submission creates a pending review entry**
    - _Requirements: 1.1, 1.4, 2.3_

- [ ] 8. Integration tests
  - [ ] 8.1 Write integration tests
    - Test authentication flow with mocked OAuth providers
    - Test entry persistence timing (within 2 seconds)
    - Test layout/config persistence timing (within 5 seconds)
    - Test layout gallery render timing (within 1 second)
    - Test end-to-end sync: create offline → go online → verify server data
    - _Requirements: 8.1, 8.2, 8.3, 1.1_

- [ ] 9. Final checkpoint
  - Ensure all 28 property tests and integration tests pass

## Notes

- This spec depends on the digital-bullet-journal implementation being complete
- fast-check is the property-based testing library (TypeScript)
- Minimum 100 iterations per property test
- Tag format: `Feature: digital-bullet-journal, Property {number}: {property_text}`
- Refer to the design document at .kiro/specs/digital-bullet-journal/design.md for full property definitions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2", "4.1", "4.2", "5.1", "6.1", "6.2"] },
    { "id": 2, "tasks": ["7.1", "7.2"] },
    { "id": 3, "tasks": ["8.1"] }
  ]
}
```
