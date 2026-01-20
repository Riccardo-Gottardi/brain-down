// =============================================================================
// Vault Configuration
// Frontend bridge for vault configuration management
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { AppConfig, VaultEntry, ValidationResult } from '$lib/state/types';

// -----------------------------------------------------------------------------
// Tauri IPC Wrappers
// -----------------------------------------------------------------------------

/**
 * Load the application config from disk.
 * Returns default config (empty vaults array) if no config file exists.
 */
export async function loadConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('load_config');
}

/**
 * Save the application config to disk.
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  await invoke('save_config', { config });
}

/**
 * Check if a vault path is accessible (exists, is directory, readable).
 * Used for fallback logic during app initialization.
 */
export async function checkVaultAccessible(path: string): Promise<boolean> {
  return invoke<boolean>('check_vault_accessible', { path });
}

// -----------------------------------------------------------------------------
// Dialog Wrapper
// -----------------------------------------------------------------------------

/**
 * Open a directory picker dialog.
 * Returns the selected path, or null if cancelled.
 * Uses the existing @tauri-apps/plugin-dialog.
 */
export async function pickDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Vault Directory',
  });

  // open() returns string | string[] | null for directory selection
  if (typeof selected === 'string') {
    return selected;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Validation Constants
// -----------------------------------------------------------------------------

const VAULT_NAME_MIN_LENGTH = 1;
const VAULT_NAME_MAX_LENGTH = 50;

// Allowed: alphanumeric, spaces, hyphens, underscores
const VAULT_NAME_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Validate a vault name against the rules:
 * - 1-50 characters
 * - No leading/trailing whitespace
 * - Only alphanumeric, spaces, hyphens, underscores
 * - Unique among existing vaults (case-insensitive)
 * 
 * @param name - The vault name to validate
 * @param existingVaults - List of existing vaults to check uniqueness against
 * @param excludeId - Optional vault ID to exclude from uniqueness check (for rename)
 */
export function validateVaultName(
  name: string,
  existingVaults: VaultEntry[],
  excludeId?: string
): ValidationResult {
  // Trim and check for leading/trailing whitespace difference
  const trimmed = name.trim();
  if (trimmed !== name) {
    return { valid: false, error: 'Name cannot have leading or trailing whitespace' };
  }

  // Check length
  if (trimmed.length < VAULT_NAME_MIN_LENGTH) {
    return { valid: false, error: 'Name is required' };
  }
  if (trimmed.length > VAULT_NAME_MAX_LENGTH) {
    return { valid: false, error: `Name must be ${VAULT_NAME_MAX_LENGTH} characters or less` };
  }

  // Check allowed characters
  if (!VAULT_NAME_PATTERN.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' 
    };
  }

  // Check uniqueness (case-insensitive)
  const nameLower = trimmed.toLowerCase();
  const isDuplicate = existingVaults.some(
    v => v.name.toLowerCase() === nameLower && v.id !== excludeId
  );
  if (isDuplicate) {
    return { valid: false, error: 'A vault with this name already exists' };
  }

  return { valid: true };
}

/**
 * Check if a path is already used by another vault.
 * 
 * @param path - The filesystem path to check
 * @param existingVaults - List of existing vaults
 * @param excludeId - Optional vault ID to exclude (for modify path operation)
 */
export function isPathDuplicate(
  path: string,
  existingVaults: VaultEntry[],
  excludeId?: string
): boolean {
  // Normalize path for comparison (handle trailing slashes)
  const normalizedPath = normalizePath(path);
  
  return existingVaults.some(
    v => normalizePath(v.path) === normalizedPath && v.id !== excludeId
  );
}

/**
 * Normalize a file path for comparison.
 * Removes trailing slashes and normalizes separators.
 */
function normalizePath(path: string): string {
  // Remove trailing slashes
  let normalized = path.replace(/[/\\]+$/, '');
  
  // Convert backslashes to forward slashes for consistent comparison
  normalized = normalized.replace(/\\/g, '/');
  
  // Lowercase for case-insensitive filesystems (Windows, macOS default)
  // Note: This is a simplification; true case sensitivity depends on the OS
  return normalized.toLowerCase();
}