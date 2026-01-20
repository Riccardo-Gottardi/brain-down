<script lang="ts">
  import { onMount } from 'svelte';
  import type { VaultEntry } from '$lib/state/types';
  import { vaultStore } from '$lib/state';
  import { pickDirectory, validateVaultName, isPathDuplicate } from '$lib/io/vaultConfig';

  // -----------------------------------------------------------------------------
  // Props
  // -----------------------------------------------------------------------------

  interface Props {
    mode: 'create';
    vault?: VaultEntry | null;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let { mode, vault = null, onconfirm, oncancel }: Props = $props();

  // -----------------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------------

  let name = $state(vault?.name ?? '');
  let path = $state(vault?.path ?? '');
  let nameError = $state<string | null>(null);
  let pathError = $state<string | null>(null);
  let isSubmitting = $state(false);
  let generalError = $state<string | null>(null);

  // -----------------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------------

  let dialogTitle = $derived('Add Vault');
  let confirmText = $derived('Add Vault');

  let isValid = $derived(
    name.trim().length > 0 && !nameError &&
    path.length > 0 && !pathError
  );

  // -----------------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------------

  function validateName() {
    const trimmed = name.trim();
    if (!trimmed) {
      nameError = null;
      return;
    }

    const result = validateVaultName(trimmed, $vaultStore.vaults, vault?.id);
    nameError = result.valid ? null : result.error ?? 'Invalid name';
  }

  function validatePath() {
    if (!path) {
      pathError = null;
      return;
    }

    if (isPathDuplicate(path, $vaultStore.vaults, vault?.id)) {
      pathError = 'A vault with this folder already exists';
    } else {
      pathError = null;
    }
  }

  // -----------------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------------

  async function handleBrowse() {
    const selected = await pickDirectory();
    if (selected) {
      path = selected;
      validatePath();

      // Auto-fill name from folder name if empty
      if (!name.trim()) {
        const folderName = selected.split(/[/\\]/).pop() || '';
        name = folderName;
        validateName();
      }
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      nameError = 'Name is required';
      return;
    }
    if (!path) {
      pathError = 'Please select a folder';
      return;
    }
    if (nameError || pathError) return;

    isSubmitting = true;
    generalError = null;

    try {
      await vaultStore.addVault(name.trim(), path);
      onconfirm();
    } catch (e) {
      generalError = `${e}`;
    } finally {
      isSubmitting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // Prevent SettingsOverlay from also closing
      oncancel();
    } else if (e.key === 'Enter' && isValid && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      oncancel();
    }
  }

  // -----------------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------------

  onMount(() => {
    // Capture phase to intercept before SettingsOverlay
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        oncancel();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dialog-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog-panel" role="dialog" aria-modal="true">
    <header class="dialog-header">
      <h3>{dialogTitle}</h3>
    </header>

    <div class="dialog-body">
      {#if generalError}
        <div class="alert alert-error">
          <span>{generalError}</span>
        </div>
      {/if}

      <!-- Name Field -->
      <div class="form-field">
        <label for="vault-name">Vault Name</label>
        <input
          id="vault-name"
          class="input"
          class:input-error={nameError}
          type="text"
          placeholder="My Vault"
          bind:value={name}
          oninput={validateName}
          disabled={isSubmitting}
          autofocus
        />
        {#if nameError}
          <span class="field-error">{nameError}</span>
        {/if}
      </div>

      <!-- Path Field -->
      <div class="form-field">
        <label for="vault-path">Folder Location</label>
        <div class="path-input-row">
          <div class="path-display" class:path-display-error={pathError} class:path-display-empty={!path}>
            {#if path}
              <span class="path-text" title={path}>{path}</span>
            {:else}
              <span class="path-placeholder">No folder selected</span>
            {/if}
          </div>
          <button 
            class="btn btn-secondary" 
            onclick={handleBrowse}
            disabled={isSubmitting}
          >
            Browse...
          </button>
        </div>
        {#if pathError}
          <span class="field-error">{pathError}</span>
        {:else if path}
          <span class="field-hint">Maps will be stored in this folder</span>
        {/if}
      </div>
    </div>

    <footer class="dialog-footer">
      <button 
        class="btn btn-secondary" 
        onclick={oncancel}
        disabled={isSubmitting}
      >
        Cancel
      </button>
      <button 
        class="btn btn-primary" 
        onclick={handleSubmit}
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? 'Adding...' : confirmText}
      </button>
    </footer>
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(45, 58, 92, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fade-in 0.15s ease-out;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dialog-panel {
    width: min(440px, 90vw);
    background: var(--glass-page, rgba(255, 255, 255, 0.95));
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-dropdown), var(--glass-border);
    animation: slide-up 0.2s ease-out;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-header {
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-light);
  }

  .dialog-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dialog-body {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .dialog-body .alert {
    margin: 0;
  }

  /* ---------------------------------------------------------------------------
     Form Fields
     --------------------------------------------------------------------------- */

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .form-field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .input-error {
    border-color: var(--alert) !important;
  }

  .input-error:focus {
    box-shadow: 0 0 0 3px var(--alert-bg) !important;
  }

  .field-error {
    font-size: 0.8125rem;
    color: var(--alert);
  }

  .field-hint {
    font-size: 0.8125rem;
    color: var(--text-subtle);
  }

  /* ---------------------------------------------------------------------------
     Path Display (non-editable)
     --------------------------------------------------------------------------- */

  .path-input-row {
    display: flex;
    gap: var(--spacing-sm);
  }

  .path-display {
    flex: 1;
    padding: 0.625rem 0.875rem;
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
    min-height: 2.5rem;
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .path-display-empty {
    background: rgba(0, 0, 0, 0.02);
  }

  .path-display-error {
    border-color: var(--alert);
  }

  .path-text {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .path-placeholder {
    font-size: 0.875rem;
    color: var(--text-subtle);
    font-style: italic;
  }

  /* ---------------------------------------------------------------------------
     Footer
     --------------------------------------------------------------------------- */

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--border-light);
    background: rgba(0, 0, 0, 0.02);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }
</style>