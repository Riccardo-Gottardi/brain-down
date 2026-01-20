// =============================================================================
// Vault Store (v0.2.0)
// Manages multiple vault configurations and the active vault state
// =============================================================================

import { writable, derived, get } from 'svelte/store';
import type { FileEntry, VaultEntry, AppConfig } from './types';
import { 
  loadConfig, 
  saveConfig, 
  checkVaultAccessible, 
  validateVaultName,
  isPathDuplicate 
} from '$lib/io/vaultConfig';
import { getVaultFiles } from '$lib/io/vault';
import { generateId } from '$lib/utils/ids';

// -----------------------------------------------------------------------------
// State Interface
// -----------------------------------------------------------------------------

export interface VaultState {
  vaults: VaultEntry[];           // All configured vaults (ordered, index 0 = default)
  activeVaultId: string | null;   // Currently active vault
  files: FileEntry[];             // .mschema files in active vault
  recentFiles: string[];          // Recently opened file paths
  isLoading: boolean;             // Loading state for async operations
  error: string | null;           // Error message if something fails
}

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const initialState: VaultState = {
  vaults: [],
  activeVaultId: null,
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

  // Helper to persist config after changes
  async function persistConfig(vaults: VaultEntry[]): Promise<void> {
    await saveConfig({ vaults });
  }

  return {
    subscribe,

    // =========================================================================
    // Initialization
    // =========================================================================

    /**
     * Initialize the vault store: load config and activate the first accessible vault.
     * Implements fallback logic: tries vaults in order until one is accessible.
     * 
     * @returns Object with fallback info if a non-default vault was used
     */
    initialize: async (): Promise<{ usedFallback: boolean; fallbackVaultName?: string }> => {
      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const config = await loadConfig();
        
        // Update vaults list
        update(s => ({ ...s, vaults: config.vaults }));

        if (config.vaults.length === 0) {
          // No vaults configured - show vault selection screen
          update(s => ({ ...s, isLoading: false }));
          return { usedFallback: false };
        }

        // Try each vault in order until one is accessible
        let activatedVault: VaultEntry | null = null;
        let usedFallback = false;

        for (let i = 0; i < config.vaults.length; i++) {
          const vault = config.vaults[i];
          const isAccessible = await checkVaultAccessible(vault.path);
          
          if (isAccessible) {
            activatedVault = vault;
            usedFallback = i > 0; // Fallback if not the first vault
            break;
          }
        }

        if (activatedVault) {
          // Load files from the accessible vault
          const files = await getVaultFiles(activatedVault.path);
          update(s => ({
            ...s,
            activeVaultId: activatedVault!.id,
            files,
            isLoading: false,
          }));

          return { 
            usedFallback, 
            fallbackVaultName: usedFallback ? activatedVault.name : undefined 
          };
        } else {
          // All vaults failed - show error state
          update(s => ({
            ...s,
            isLoading: false,
            error: 'All configured vaults are inaccessible. Please check your vault settings.',
          }));
          return { usedFallback: false };
        }
      } catch (e) {
        update(s => ({
          ...s,
          isLoading: false,
          error: `Failed to initialize: ${e}`,
        }));
        return { usedFallback: false };
      }
    },

    // =========================================================================
    // Vault CRUD Operations
    // =========================================================================

    /**
     * Add a new vault to the configuration.
     * The new vault is added at the end of the list.
     * 
     * @throws Error if validation fails
     */
    addVault: async (name: string, path: string): Promise<VaultEntry> => {
      const state = get({ subscribe });

      // Validate name
      const nameValidation = validateVaultName(name, state.vaults);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error);
      }

      // Check path uniqueness
      if (isPathDuplicate(path, state.vaults)) {
        throw new Error('A vault with this path already exists');
      }

      // Create new vault entry
      const newVault: VaultEntry = {
        id: generateId(),
        name: name.trim(),
        path,
      };

      const newVaults = [...state.vaults, newVault];

      // Persist and update state
      await persistConfig(newVaults);
      update(s => ({ ...s, vaults: newVaults }));

      return newVault;
    },

    /**
     * Rename an existing vault.
     * 
     * @throws Error if validation fails or vault not found
     */
    renameVault: async (id: string, newName: string): Promise<void> => {
      const state = get({ subscribe });

      const vaultIndex = state.vaults.findIndex(v => v.id === id);
      if (vaultIndex === -1) {
        throw new Error('Vault not found');
      }

      // Validate new name (excluding current vault from uniqueness check)
      const nameValidation = validateVaultName(newName, state.vaults, id);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error);
      }

      // Update vault
      const newVaults = state.vaults.map(v =>
        v.id === id ? { ...v, name: newName.trim() } : v
      );

      await persistConfig(newVaults);
      update(s => ({ ...s, vaults: newVaults }));
    },

    /**
     * Update a vault's path.
     * 
     * @throws Error if validation fails or vault not found
     */
    updateVaultPath: async (id: string, newPath: string): Promise<void> => {
      const state = get({ subscribe });

      const vaultIndex = state.vaults.findIndex(v => v.id === id);
      if (vaultIndex === -1) {
        throw new Error('Vault not found');
      }

      // Check path uniqueness (excluding current vault)
      if (isPathDuplicate(newPath, state.vaults, id)) {
        throw new Error('A vault with this path already exists');
      }

      // Verify path is accessible
      const isAccessible = await checkVaultAccessible(newPath);
      if (!isAccessible) {
        throw new Error('The selected path is not accessible');
      }

      // Update vault
      const newVaults = state.vaults.map(v =>
        v.id === id ? { ...v, path: newPath } : v
      );

      await persistConfig(newVaults);
      update(s => ({ ...s, vaults: newVaults }));

      // If this is the active vault, refresh files
      if (state.activeVaultId === id) {
        const files = await getVaultFiles(newPath);
        update(s => ({ ...s, files }));
      }
    },

    /**
     * Delete a vault from the configuration.
     * Does NOT delete files on disk.
     * 
     * @throws Error if vault not found
     */
    deleteVault: async (id: string): Promise<void> => {
      const state = get({ subscribe });

      const vaultIndex = state.vaults.findIndex(v => v.id === id);
      if (vaultIndex === -1) {
        throw new Error('Vault not found');
      }

      const newVaults = state.vaults.filter(v => v.id !== id);
      await persistConfig(newVaults);

      // If deleting the active vault, try to activate the next available one
      if (state.activeVaultId === id) {
        if (newVaults.length > 0) {
          // Find first accessible vault
          for (const vault of newVaults) {
            const isAccessible = await checkVaultAccessible(vault.path);
            if (isAccessible) {
              const files = await getVaultFiles(vault.path);
              update(s => ({
                ...s,
                vaults: newVaults,
                activeVaultId: vault.id,
                files,
              }));
              return;
            }
          }
          // No accessible vault found
          update(s => ({
            ...s,
            vaults: newVaults,
            activeVaultId: null,
            files: [],
          }));
        } else {
          // No vaults left
          update(s => ({
            ...s,
            vaults: [],
            activeVaultId: null,
            files: [],
          }));
        }
      } else {
        update(s => ({ ...s, vaults: newVaults }));
      }
    },

    // =========================================================================
    // Vault Ordering
    // =========================================================================

    /**
     * Move a vault up in the order (decrease index).
     * The first vault (index 0) is the default.
     */
    moveVaultUp: async (id: string): Promise<void> => {
      const state = get({ subscribe });
      const index = state.vaults.findIndex(v => v.id === id);
      
      if (index <= 0) return; // Already at top or not found

      const newVaults = [...state.vaults];
      [newVaults[index - 1], newVaults[index]] = [newVaults[index], newVaults[index - 1]];

      await persistConfig(newVaults);
      update(s => ({ ...s, vaults: newVaults }));
    },

    /**
     * Move a vault down in the order (increase index).
     */
    moveVaultDown: async (id: string): Promise<void> => {
      const state = get({ subscribe });
      const index = state.vaults.findIndex(v => v.id === id);
      
      if (index === -1 || index >= state.vaults.length - 1) return; // At bottom or not found

      const newVaults = [...state.vaults];
      [newVaults[index], newVaults[index + 1]] = [newVaults[index + 1], newVaults[index]];

      await persistConfig(newVaults);
      update(s => ({ ...s, vaults: newVaults }));
    },

    // =========================================================================
    // Vault Activation
    // =========================================================================

    /**
     * Switch to a different vault and load its files.
     * 
     * @throws Error if vault not found or not accessible
     */
    setActiveVault: async (id: string): Promise<void> => {
      const state = get({ subscribe });

      const vault = state.vaults.find(v => v.id === id);
      if (!vault) {
        throw new Error('Vault not found');
      }

      update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const isAccessible = await checkVaultAccessible(vault.path);
        if (!isAccessible) {
          throw new Error(`Vault "${vault.name}" is not accessible`);
        }

        const files = await getVaultFiles(vault.path);
        update(s => ({
          ...s,
          activeVaultId: id,
          files,
          isLoading: false,
        }));
      } catch (e) {
        update(s => ({
          ...s,
          isLoading: false,
          error: `Failed to switch vault: ${e}`,
        }));
        throw e;
      }
    },

    // =========================================================================
    // File Operations
    // =========================================================================

    /**
     * Refresh the file list for the active vault.
     */
    refreshFiles: async (): Promise<void> => {
      const state = get({ subscribe });
      
      if (!state.activeVaultId) return;

      const vault = state.vaults.find(v => v.id === state.activeVaultId);
      if (!vault) return;

      update(s => ({ ...s, isLoading: true }));

      try {
        const files = await getVaultFiles(vault.path);
        update(s => ({ ...s, files, isLoading: false }));
      } catch (e) {
        update(s => ({
          ...s,
          isLoading: false,
          error: `Failed to refresh files: ${e}`,
        }));
      }
    },

    /**
     * Add a file to recent files list (max 10, most recent first).
     */
    addRecentFile: (filePath: string) => {
      update(state => {
        const filtered = state.recentFiles.filter(f => f !== filePath);
        const recentFiles = [filePath, ...filtered].slice(0, 10);
        return { ...state, recentFiles };
      });
    },

    // =========================================================================
    // Error Handling
    // =========================================================================

    /**
     * Set an error message.
     */
    setError: (error: string | null) => {
      update(s => ({ ...s, error, isLoading: false }));
    },

    /**
     * Clear the error state.
     */
    clearError: () => {
      update(s => ({ ...s, error: null }));
    },

    // =========================================================================
    // Reset
    // =========================================================================

    /**
     * Reset the store to initial state.
     */
    reset: () => {
      set(initialState);
    },
  };
}

// -----------------------------------------------------------------------------
// Store Instance
// -----------------------------------------------------------------------------

export const vaultStore = createVaultStore();

// -----------------------------------------------------------------------------
// Derived Stores
// -----------------------------------------------------------------------------

/**
 * The currently active vault entry, or null if none active.
 */
export const activeVault = derived(vaultStore, $store =>
  $store.vaults.find(v => v.id === $store.activeVaultId) ?? null
);

/**
 * The default vault (first in the list), or null if no vaults configured.
 */
export const defaultVault = derived(vaultStore, $store =>
  $store.vaults[0] ?? null
);

/**
 * Whether any vaults are configured.
 */
export const hasVaults = derived(vaultStore, $store =>
  $store.vaults.length > 0
);

/**
 * Whether a vault is currently active (for backward compatibility).
 * Alias for checking if activeVaultId is set.
 */
export const hasVault = derived(vaultStore, $store =>
  $store.activeVaultId !== null
);

/**
 * The name of the active vault (for backward compatibility).
 */
export const vaultName = derived(activeVault, $vault =>
  $vault?.name ?? null
);

/**
 * The path of the active vault.
 */
export const vaultPath = derived(activeVault, $vault =>
  $vault?.path ?? null
);