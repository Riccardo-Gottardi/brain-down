<script lang="ts">
  import { vaultStore } from '$lib/state';
  import type { VaultEntry } from '$lib/state/types';
  import VaultEntryRow from './VaultEntryRow.svelte';
  import VaultDialog from './VaultDialog.svelte';

  // -----------------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------------

  // Dialog state - only create and delete now (rename/modifyPath are inline)
  let dialogMode = $state<'create' | 'delete' | null>(null);
  let selectedVault = $state<VaultEntry | null>(null);

  // Error state for operations
  let operationError = $state<string | null>(null);

  // -----------------------------------------------------------------------------
  // Vault Operations
  // -----------------------------------------------------------------------------

  async function handleMoveUp(vault: VaultEntry) {
    operationError = null;
    try {
      await vaultStore.moveVaultUp(vault.id);
    } catch (e) {
      operationError = `Failed to reorder: ${e}`;
    }
  }

  async function handleMoveDown(vault: VaultEntry) {
    operationError = null;
    try {
      await vaultStore.moveVaultDown(vault.id);
    } catch (e) {
      operationError = `Failed to reorder: ${e}`;
    }
  }

  function handleDelete(vault: VaultEntry) {
    selectedVault = vault;
    dialogMode = 'delete';
  }

  function handleAddVault() {
    selectedVault = null;
    dialogMode = 'create';
  }

  function closeDialog() {
    dialogMode = null;
    selectedVault = null;
  }

  function clearError() {
    operationError = null;
  }
</script>

<div class="vault-manager">
  <div class="manager-header">
    <div class="header-text">
      <h3>Vault Management</h3>
      <p class="header-description">
        Manage your vault folders. The top vault is the default and will be opened on startup.
      </p>
    </div>
  </div>

  {#if operationError}
    <div class="alert alert-error">
      <span>{operationError}</span>
      <button class="btn-ghost" onclick={clearError}>✕</button>
    </div>
  {/if}

  <div class="vault-list">
    {#if $vaultStore.vaults.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <p class="empty-title">No vaults configured</p>
        <p class="empty-description">Add a vault to get started with Brain-down.</p>
      </div>
    {:else}
      {#each $vaultStore.vaults as vault, index (vault.id)}
        <VaultEntryRow
          {vault}
          isDefault={index === 0}
          isFirst={index === 0}
          isLast={index === $vaultStore.vaults.length - 1}
          onMoveUp={() => handleMoveUp(vault)}
          onMoveDown={() => handleMoveDown(vault)}
          onDelete={() => handleDelete(vault)}
        />
      {/each}
    {/if}
  </div>

  <div class="manager-footer">
    <button class="btn btn-primary" onclick={handleAddVault}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add Vault
    </button>
  </div>

  <!-- Create Vault Dialog -->
  {#if dialogMode === 'create'}
    <VaultDialog
      mode="create"
      onconfirm={closeDialog}
      oncancel={closeDialog}
    />
  {/if}

  <!-- Delete Confirmation Dialog (placeholder for Step 7) -->
  {#if dialogMode === 'delete' && selectedVault}
    <div class="dialog-placeholder">
      <div class="placeholder-content">
        <p>Delete vault confirmation (Step 7)</p>
        <p class="text-secondary">Vault: {selectedVault.name}</p>
        <div class="placeholder-actions">
          <button class="btn btn-secondary" onclick={closeDialog}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ===========================================================================
     Vault Manager Styles
     =========================================================================== */

  .vault-manager {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ---------------------------------------------------------------------------
     Header
     --------------------------------------------------------------------------- */

  .manager-header {
    margin-bottom: var(--spacing-lg);
  }

  .manager-header h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-xs);
  }

  .header-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  /* ---------------------------------------------------------------------------
     Vault List
     --------------------------------------------------------------------------- */

  .vault-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    overflow-y: auto;
    padding-right: var(--spacing-sm);
    margin-right: calc(var(--spacing-sm) * -1);
  }

  /* ---------------------------------------------------------------------------
     Empty State
     --------------------------------------------------------------------------- */

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    text-align: center;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.6;
  }

  .empty-title {
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--spacing-xs);
  }

  .empty-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  /* ---------------------------------------------------------------------------
     Footer
     --------------------------------------------------------------------------- */

  .manager-footer {
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-light);
    margin-top: var(--spacing-lg);
  }

  /* ---------------------------------------------------------------------------
     Dialog Placeholder (temporary for Step 7)
     --------------------------------------------------------------------------- */

  .dialog-placeholder {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(45, 58, 92, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .placeholder-content {
    background: var(--glass-page, rgba(255, 255, 255, 0.95));
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    text-align: center;
    box-shadow: var(--shadow-dropdown);
  }

  .placeholder-content p {
    margin: 0 0 var(--spacing-sm);
    color: var(--text-primary);
    font-weight: 500;
  }

  .placeholder-actions {
    margin-top: var(--spacing-lg);
  }
</style>