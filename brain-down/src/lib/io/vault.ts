// =============================================================================
// Vault Commands
// Frontend wrappers for Tauri vault-related commands
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import { open, ask} from '@tauri-apps/plugin-dialog';
import type { FileEntry } from '$lib/state/types';

/**
 * Show a confirmation dialog with Yes/No buttons
 * Returns true if user confirms, false if they cancel
 */
export async function confirmAction(message: string, title: string = 'Confirm'): Promise<boolean> {
  return await ask(message, { title, kind: 'warning' });
}

/**
 * Open a directory picker dialog and return the selected path
 * Returns null if the user cancels
 */
export async function selectVaultDirectory(): Promise<string | null> {
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

/**
 * Get the list of .mschema files in a vault directory
 */
export async function getVaultFiles(vaultPath: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>('get_vault_files', { vaultPath });
}

/**
 * Load the saved vault path from persistent storage
 * Returns null if no vault was previously selected
 */
export async function loadSavedVaultPath(): Promise<string | null> {
  try {
    return await invoke<string | null>('get_saved_vault_path');
  } catch {
    return null;
  }
}

/**
 * Save the vault path to persistent storage
 */
export async function saveVaultPath(vaultPath: string): Promise<void> {
  await invoke('save_vault_path', { vaultPath });
}

/**
 * Clear the saved vault path
 */
export async function clearSavedVaultPath(): Promise<void> {
  await invoke('clear_saved_vault_path');
}