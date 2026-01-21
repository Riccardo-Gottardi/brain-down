// =============================================================================
// State Module Index
// Re-exports all stores and types for convenient imports
// =============================================================================

// Types
export * from './types';

// Stores
export { vaultStore, activeVault, defaultVault, hasVaults, hasVault, vaultName, vaultPath } from './vaultStore';
export type { VaultState } from './vaultStore';

export { mapStore, nodes, edges, viewport, hasMap } from './mapStore';
export type { MapState } from './mapStore';

export { uiStore, selectionCount, hasSelection, isEditing } from './uiStore';
export type { UIState } from './uiStore';

export { toastStore, toasts } from './toastStore';