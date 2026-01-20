<script lang="ts">
  import type { VaultEntry } from '$lib/state/types';
  import { vaultStore } from '$lib/state';
  import { pickDirectory, validateVaultName, isPathDuplicate } from '$lib/io/vaultConfig';

  // -----------------------------------------------------------------------------
  // Props
  // -----------------------------------------------------------------------------

  interface Props {
    vault: VaultEntry;
    isDefault: boolean;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
  }

  let { 
    vault, 
    isDefault, 
    isFirst, 
    isLast, 
    onMoveUp, 
    onMoveDown,
    onDelete 
  }: Props = $props();

  // -----------------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------------

  let menuOpen = $state(false);
  
  // Editing states
  let editMode = $state<'none' | 'rename' | 'path'>('none');
  let editValue = $state('');
  let editError = $state<string | null>(null);
  let isSubmitting = $state(false);

  // -----------------------------------------------------------------------------
  // Menu Handlers
  // -----------------------------------------------------------------------------

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  // Close menu when clicking outside
  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.options-container')) {
      closeMenu();
    }
  }

  // -----------------------------------------------------------------------------
  // Edit Mode Handlers
  // -----------------------------------------------------------------------------

  function startRename() {
    closeMenu();
    editValue = vault.name;
    editError = null;
    editMode = 'rename';
  }

  function startModifyPath() {
    closeMenu();
    handleBrowseFolder();
  }

  function cancelEdit() {
    editMode = 'none';
    editValue = '';
    editError = null;
  }

  async function handleBrowseFolder() {
    const selected = await pickDirectory();
    if (!selected) return;

    // Check if path is duplicate
    if (isPathDuplicate(selected, $vaultStore.vaults, vault.id)) {
      editError = 'A vault with this folder already exists';
      editValue = selected;
      editMode = 'path';
      return;
    }

    // Directly update the path
    isSubmitting = true;
    try {
      await vaultStore.updateVaultPath(vault.id, selected);
      cancelEdit();
    } catch (e) {
      editError = `${e}`;
      editValue = selected;
      editMode = 'path';
    } finally {
      isSubmitting = false;
    }
  }

  function validateRename() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      editError = null;
      return;
    }

    const result = validateVaultName(trimmed, $vaultStore.vaults, vault.id);
    editError = result.valid ? null : result.error ?? 'Invalid name';
  }

  async function submitRename() {
    const trimmed = editValue.trim();
    
    if (!trimmed || trimmed === vault.name) {
      cancelEdit();
      return;
    }

    // Validate
    const result = validateVaultName(trimmed, $vaultStore.vaults, vault.id);
    if (!result.valid) {
      editError = result.error ?? 'Invalid name';
      return;
    }

    isSubmitting = true;
    try {
      await vaultStore.renameVault(vault.id, trimmed);
      cancelEdit();
    } catch (e) {
      editError = `${e}`;
    } finally {
      isSubmitting = false;
    }
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editMode === 'rename') {
        submitRename();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }

  function handleDelete() {
    closeMenu();
    onDelete();
  }

  // -----------------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------------

  function truncatePath(path: string, maxLength: number = 50): string {
    if (path.length <= maxLength) return path;
    const start = path.slice(0, 22);
    const end = path.slice(-25);
    return `${start}...${end}`;
  }

  // Custom action to focus and select input content on mount
  function focusAndSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="vault-entry" class:is-default={isDefault} class:is-editing={editMode !== 'none'}>
  {#if editMode === 'rename'}
    <!-- Rename Mode -->
    <div class="edit-form">
      <div class="edit-header">
        <span class="vault-icon">📂</span>
        <span class="edit-label">Rename Vault</span>
      </div>
      <input
        class="input edit-input"
        class:input-error={editError}
        type="text"
        bind:value={editValue}
        oninput={validateRename}
        onkeydown={handleEditKeydown}
        disabled={isSubmitting}
        use:focusAndSelect
      />
      {#if editError}
        <span class="field-error">{editError}</span>
      {/if}
      <div class="edit-actions">
        <button 
          class="btn btn-primary btn-sm" 
          onclick={submitRename}
          disabled={!editValue.trim() || editValue.trim() === vault.name || !!editError || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
        <button 
          class="btn btn-secondary btn-sm" 
          onclick={cancelEdit}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </div>
  {:else if editMode === 'path'}
    <!-- Path Error Mode (shown only if there was an error) -->
    <div class="edit-form">
      <div class="edit-header">
        <span class="vault-icon">📂</span>
        <span class="edit-label">Change Folder</span>
      </div>
      <div class="path-display">
        <span class="path-text">{truncatePath(editValue)}</span>
      </div>
      {#if editError}
        <span class="field-error">{editError}</span>
      {/if}
      <div class="edit-actions">
        <button 
          class="btn btn-secondary btn-sm" 
          onclick={handleBrowseFolder}
          disabled={isSubmitting}
        >
          Choose Different...
        </button>
        <button 
          class="btn btn-secondary btn-sm" 
          onclick={cancelEdit}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <!-- Normal Display Mode -->
    <div class="vault-info">
      <div class="vault-header">
        <span class="vault-icon">📂</span>
        <span class="vault-name">{vault.name}</span>
        {#if isDefault}
          <span class="default-badge">Default</span>
        {/if}
      </div>
      <span class="vault-path" title={vault.path}>{truncatePath(vault.path)}</span>
    </div>

    <!-- Reorder Buttons -->
    <div class="reorder-buttons">
      <button 
        class="btn-icon reorder-btn" 
        onclick={onMoveUp}
        disabled={isFirst}
        title="Move up (higher priority)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <button 
        class="btn-icon reorder-btn" 
        onclick={onMoveDown}
        disabled={isLast}
        title="Move down (lower priority)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Options Menu -->
    <div class="options-container">
      <button 
        class="btn-icon options-btn" 
        onclick={toggleMenu}
        title="Options"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="6" r="1.5"></circle>
          <circle cx="12" cy="12" r="1.5"></circle>
          <circle cx="12" cy="18" r="1.5"></circle>
        </svg>
      </button>

      {#if menuOpen}
        <div class="dropdown-menu options-dropdown">
          <button class="dropdown-item" onclick={startRename}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Rename
          </button>
          <button class="dropdown-item" onclick={startModifyPath}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Change Folder
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" onclick={handleDelete}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* ===========================================================================
     Vault Entry Row Styles
     =========================================================================== */

  .vault-entry {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    background: var(--glass-card);
    border: 2px solid transparent;
    transition: border-color var(--transition-normal), background var(--transition-normal);
  }

  .vault-entry:hover {
    background: rgba(255, 255, 255, 0.85);
  }

  .vault-entry.is-default {
    border-color: var(--accent);
    background: rgba(74, 159, 212, 0.08);
  }

  .vault-entry.is-editing {
    background: rgba(255, 255, 255, 0.9);
  }

  /* ---------------------------------------------------------------------------
     Vault Info (Display Mode)
     --------------------------------------------------------------------------- */

  .vault-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .vault-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .vault-icon {
    font-size: 1.125rem;
  }

  .vault-name {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .default-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-full);
    background: var(--accent);
    color: white;
  }

  .vault-path {
    font-size: 0.75rem;
    color: var(--text-subtle);
    font-family: var(--font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ---------------------------------------------------------------------------
     Edit Form (Inline Editing Mode)
     --------------------------------------------------------------------------- */

  .edit-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .edit-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .edit-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .edit-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.9375rem;
    font-weight: 500;
  }

  .input-error {
    border-color: var(--alert) !important;
  }

  .field-error {
    font-size: 0.8125rem;
    color: var(--alert);
  }

  .path-display {
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
  }

  .path-text {
    font-size: 0.8125rem;
    font-family: var(--font-mono);
    color: var(--text-secondary);
  }

  .edit-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  /* ---------------------------------------------------------------------------
     Reorder Buttons
     --------------------------------------------------------------------------- */

  .reorder-buttons {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .reorder-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    color: var(--text-subtle);
  }

  .reorder-btn:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--accent-bg);
  }

  .reorder-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* ---------------------------------------------------------------------------
     Options Menu
     --------------------------------------------------------------------------- */

  .options-container {
    position: relative;
  }

  .options-btn {
    color: var(--text-subtle);
  }

  .options-btn:hover {
    color: var(--text-primary);
  }

  .options-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: var(--spacing-xs);
    z-index: 20;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--border-light);
    margin: var(--spacing-xs) 0;
  }
</style>