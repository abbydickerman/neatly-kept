import type { Layout, ContentArea, ContentAreaType, ValidationResult } from '@/types';

const VALID_CONTENT_AREA_TYPES: ContentAreaType[] = ['text', 'checklist', 'image', 'blank'];

const MIN_CONTENT_AREAS = 1;
const MAX_CONTENT_AREAS = 20;
const MIN_SIZE_PERCENT = 5;
const MAX_SIZE_PERCENT = 100;
const MAX_LAYOUT_NAME_LENGTH = 50;

/**
 * Validates a layout's content areas and structure.
 * Enforces: 1-20 content areas, each with width/height between 5-100%,
 * and valid content area types.
 */
export function validateLayout(layout: Layout): ValidationResult {
  const errors: string[] = [];

  // Validate content areas count
  if (!layout.contentAreas || layout.contentAreas.length < MIN_CONTENT_AREAS) {
    errors.push(`Layout must have at least ${MIN_CONTENT_AREAS} content area`);
  } else if (layout.contentAreas.length > MAX_CONTENT_AREAS) {
    errors.push(`Layout must have at most ${MAX_CONTENT_AREAS} content areas`);
  }

  // Validate each content area
  if (layout.contentAreas) {
    for (let i = 0; i < layout.contentAreas.length; i++) {
      const area = layout.contentAreas[i];
      const areaErrors = validateContentArea(area, i);
      errors.push(...areaErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single content area's properties.
 */
function validateContentArea(area: ContentArea, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Content area ${index + 1}`;

  // Validate type
  if (!VALID_CONTENT_AREA_TYPES.includes(area.type)) {
    errors.push(`${prefix}: invalid type "${area.type}". Must be one of: ${VALID_CONTENT_AREA_TYPES.join(', ')}`);
  }

  // Validate width
  if (area.width < MIN_SIZE_PERCENT || area.width > MAX_SIZE_PERCENT) {
    errors.push(`${prefix}: width must be between ${MIN_SIZE_PERCENT}% and ${MAX_SIZE_PERCENT}%`);
  }

  // Validate height
  if (area.height < MIN_SIZE_PERCENT || area.height > MAX_SIZE_PERCENT) {
    errors.push(`${prefix}: height must be between ${MIN_SIZE_PERCENT}% and ${MAX_SIZE_PERCENT}%`);
  }

  return errors;
}

/**
 * Validates a layout name.
 * Enforces: trimmed length between 1 and 50 characters.
 */
export function validateLayoutName(name: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    errors.push('Layout name cannot be empty');
  } else if (trimmed.length > MAX_LAYOUT_NAME_LENGTH) {
    errors.push(`Layout name must be at most ${MAX_LAYOUT_NAME_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if a layout name is unique among a user's existing layouts.
 * Comparison is case-insensitive.
 */
export function isLayoutNameUnique(
  name: string,
  existingLayouts: Layout[],
  excludeLayoutId?: string
): ValidationResult {
  const errors: string[] = [];
  const normalizedName = name.trim().toLowerCase();

  const duplicate = existingLayouts.find(
    (layout) =>
      layout.name.trim().toLowerCase() === normalizedName &&
      layout.id !== excludeLayoutId
  );

  if (duplicate) {
    errors.push('A layout with this name already exists');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
