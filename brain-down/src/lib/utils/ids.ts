// =============================================================================
// ID Generation Utilities
// =============================================================================

/**
 * Generate a UUID v4 for nodes and edges
 * Uses the Web Crypto API which is available in Tauri
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a short ID for display purposes (first 8 chars of UUID)
 * Not for storage - just for UI display
 */
export function shortId(id: string): string {
  return id.slice(0, 8);
}