// =============================================================================
// Color Utilities and Theme Defaults
// Based on MVP specification v0.1.0
// =============================================================================

// -----------------------------------------------------------------------------
// Default Theme Colors
// -----------------------------------------------------------------------------

export const theme = {
  dark: {
    canvasBackground: '#1e1e2e',
    gridDots: '#333333',
    noteNodeFill: '#3b4252',
    noteNodeStroke: '#4c566a',
    noteNodeText: '#eceff4',
    mindMapNodeFill: '#5e81ac',
    selectionHighlight: '#88c0d0',
    edgeDefault: '#a3be8c',
  },
  light: {
    canvasBackground: '#f5f5f5',
    gridDots: '#dddddd',
    noteNodeFill: '#ffffff',
    noteNodeStroke: '#d0d0d0',
    noteNodeText: '#2e3440',
    mindMapNodeFill: '#5e81ac',
    selectionHighlight: '#88c0d0',
    edgeDefault: '#a3be8c',
  },
} as const;

// Current theme (could be made reactive with a store later)
export const currentTheme = theme.dark;

// -----------------------------------------------------------------------------
// Default Node Styles
// -----------------------------------------------------------------------------

export const defaultNoteStyle = {
  fillColor: currentTheme.noteNodeFill,
  strokeColor: currentTheme.noteNodeStroke,
  strokeWidth: 1,
  fontSize: 14,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  textColor: currentTheme.noteNodeText,
  padding: 16,
};

export const defaultMindMapStyle = {
  fillColor: currentTheme.mindMapNodeFill,
  strokeColor: currentTheme.mindMapNodeFill,
  strokeWidth: 0,
  fontSize: 14,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  textColor: '#ffffff',
  padding: 12,
};

export const defaultEdgeStyle = {
  color: currentTheme.edgeDefault,
  startStyle: null as 'arrow' | 'dot' | null,
  endStyle: 'arrow' as 'arrow' | 'dot' | null,
};

// -----------------------------------------------------------------------------
// Color Utilities
// -----------------------------------------------------------------------------

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB values to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Lighten a hex color by a percentage
 */
export function lighten(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));

  return rgbToHex(r, g, b);
}

/**
 * Darken a hex color by a percentage
 */
export function darken(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);

  return rgbToHex(r, g, b);
}

/**
 * Get a contrasting text color (black or white) for a background
 */
export function getContrastColor(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return '#ffffff';

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// -----------------------------------------------------------------------------
// Preset Colors for Quick Selection
// -----------------------------------------------------------------------------

export const presetColors = [
  '#bf616a', // Red
  '#d08770', // Orange
  '#ebcb8b', // Yellow
  '#a3be8c', // Green
  '#88c0d0', // Cyan
  '#5e81ac', // Blue
  '#b48ead', // Purple
  '#3b4252', // Dark gray
  '#4c566a', // Gray
  '#eceff4', // Light
];