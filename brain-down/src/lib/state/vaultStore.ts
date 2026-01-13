// =============================================================================
// Vault Store
// Manages the selected vault directory and file listings
// =============================================================================

import { writable, derived } from 'svelte/store';
import type { FileEntry } from './types';

// -----------------------------------------------------------------------------
// State Interface
// -----------------------------------------------------------------------------

export interface VaultState {
  path: string | null;           // Selected vault directory
  files: FileEntry[];            // List of .mschema files in vault
  recentFiles: string[];         // Recently opened file paths (max 10)
  isLoading: boolean;            // Loading state for async operations
  error: string | null;          // Error message if something fails
}

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const initialState: VaultState = {
  path: null,
  files: [],
  recentFiles: [],
  isLoading: false,
  error: null,
};

// -----------------------------------------------------------------------------
// Store Creation
// -----------------------------------------------------------------------------

function createVaultStore() {
  const { subscribe, set, update } = writable<VaultState>(initialState);

  return {
    subscribe,

    /**
     * Set the vault path after user selects a directory
     */
    setPath: (path: string) => {
      update(state => ({
        ...state,
        path,
        error: null,
      }));
    },

    /**
     * Update the list of files in the vault
     */
    setFiles: (files: FileEntry[]) => {
      update(state => ({
        ...state,
        files,
        isLoading: false,
      }));
    },

    /**
     * Add a file to recent files list (max 10, most recent first)
     */
    addRecentFile: (filePath: string) => {
      update(state => {
        const filtered = state.recentFiles.filter(f => f !== filePath);
        const recentFiles = [filePath, ...filtered].slice(0, 10);
        return { ...state, recentFiles };
      });
    },

    /**
     * Set loading state
     */
    setLoading: (isLoading: boolean) => {
      update(state => ({ ...state, isLoading }));
    },

    /**
     * Set error state
     */
    setError: (error: string | null) => {
      update(state => ({ ...state, error, isLoading: false }));
    },

    /**
     * Clear the vault (e.g., when switching vaults)
     */
    clear: () => {
      set(initialState);
    },

    /**
     * Reset just the error state
     */
    clearError: () => {
      update(state => ({ ...state, error: null }));
    },
  };
}

// -----------------------------------------------------------------------------
// Store Instance & Derived Stores
// -----------------------------------------------------------------------------

export const vaultStore = createVaultStore();

/**
 * Derived store: whether a vault is selected
 */
export const hasVault = derived(vaultStore, $vault => $vault.path !== null);

/**
 * Derived store: vault name (last segment of path)
 */
export const vaultName = derived(vaultStore, $vault => {
  if (!$vault.path) return null;
  // Handle both Windows and Unix paths
  const segments = $vault.path.split(/[/\\]/);
  return segments[segments.length - 1];
});