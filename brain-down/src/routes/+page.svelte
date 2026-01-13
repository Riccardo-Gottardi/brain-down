<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { vaultStore, hasVault, vaultName } from '$lib/state';
  import { 
    selectVaultDirectory, 
    getVaultFiles, 
    loadSavedVaultPath,
    saveVaultPath,
    confirmAction
  } from '$lib/io/vault';
  import { createMapFile, deleteMapFile, renameMapFile } from '$lib/io/fileCommands';
  import type { FileEntry } from '$lib/state/types';

  // Local state
  let isCreatingNew = $state(false);
  let newFileName = $state('');
  let isLoadingVault = $state(true);
  let openMenuId = $state<string | null>(null);
  let dropdownPosition = $state<'below' | 'above'>('below');
  
  // Renaming state
  let renamingFilePath = $state<string | null>(null);
  let renameValue = $state('');
  
  // Approximate dropdown menu height for position calculation
  const DROPDOWN_HEIGHT = 100;

  // Async initialization - called from onMount but not blocking cleanup
  async function initializeVault() {
    try {
      const savedPath = await loadSavedVaultPath();
      if (savedPath) {
        await loadVault(savedPath);
      }
    } catch (error) {
      console.error('Failed to load saved vault:', error);
    } finally {
      isLoadingVault = false;
    }
  }

  // Setup on mount
  onMount(() => {
    // Start async initialization (fire and forget)
    initializeVault();

    // Close menu and cancel rename when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Close dropdown menu
      if (!target.closest('.file-menu-container')) {
        openMenuId = null;
      }
      
      // Cancel rename if clicking outside the renaming card
      if (renamingFilePath && !target.closest('.file-card.renaming')) {
        cancelRename();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    // Synchronous cleanup function
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  // Load vault and its files
  async function loadVault(path: string) {
    vaultStore.setLoading(true);
    try {
      const files = await getVaultFiles(path);
      vaultStore.setPath(path);
      vaultStore.setFiles(files);
      await saveVaultPath(path);
    } catch (error) {
      vaultStore.setError(`Failed to load vault: ${error}`);
    }
  }

  // Handle vault selection
  async function handleSelectVault() {
    const path = await selectVaultDirectory();
    if (path) {
      await loadVault(path);
    }
  }

  // Handle creating a new map file
  async function handleCreateNew() {
    if (!newFileName.trim() || !$vaultStore.path) return;

    try {
      const filePath = await createMapFile($vaultStore.path, newFileName.trim());
      const files = await getVaultFiles($vaultStore.path);
      vaultStore.setFiles(files);
      goto(`/editor/${encodeURIComponent(filePath)}`);
    } catch (error) {
      vaultStore.setError(`Failed to create file: ${error}`);
    } finally {
      isCreatingNew = false;
      newFileName = '';
    }
  }

  // Handle opening an existing file
  function handleOpenFile(file: FileEntry) {
    vaultStore.addRecentFile(file.path);
    goto(`/editor/${encodeURIComponent(file.path)}`);
  }

  // Toggle file menu and calculate position
  function toggleFileMenu(filePath: string, event: MouseEvent) {
    event.stopPropagation();
    
    if (openMenuId === filePath) {
      openMenuId = null;
      return;
    }
    
    // Calculate if dropdown should appear above or below
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    
    dropdownPosition = spaceBelow < DROPDOWN_HEIGHT ? 'above' : 'below';
    openMenuId = filePath;
  }

  // Handle deleting a file
  async function handleDeleteFile(file: FileEntry, event: MouseEvent) {
    event.stopPropagation();  // Prevent file from opening
    openMenuId = null;
    
    // Wait for user confirmation via native dialog
    const confirmed = await confirmAction(
      `Delete "${file.name}"? This cannot be undone.`,
      'Delete Map'
    );
    
    if (!confirmed) return;
    
    try {
      await deleteMapFile(file.path);
      if ($vaultStore.path) {
        const files = await getVaultFiles($vaultStore.path);
        vaultStore.setFiles(files);
      }
    } catch (error) {
      vaultStore.setError(`Failed to delete file: ${error}`);
    }
  }

  // Start renaming a file
  function startRenameFile(file: FileEntry, event: MouseEvent) {
    event.stopPropagation();  // Prevent file from opening
    openMenuId = null;
    renamingFilePath = file.path;
    renameValue = file.name;  // Pre-fill with current name
  }

  // Cancel renaming
  function cancelRename() {
    renamingFilePath = null;
    renameValue = '';
  }

  // Submit the rename
  async function submitRename(file: FileEntry) {
    const trimmedName = renameValue.trim();
    
    // If empty or unchanged, just cancel
    if (!trimmedName || trimmedName === file.name) {
      cancelRename();
      return;
    }
    
    try {
      await renameMapFile(file.path, trimmedName);
      if ($vaultStore.path) {
        const files = await getVaultFiles($vaultStore.path);
        vaultStore.setFiles(files);
      }
    } catch (error) {
      vaultStore.setError(`Failed to rename file: ${error}`);
    } finally {
      cancelRename();
    }
  }

  // Handle keydown in rename input
  function handleRenameKeydown(event: KeyboardEvent, file: FileEntry) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitRename(file);
    } else if (event.key === 'Escape') {
      cancelRename();
    }
  }

  // Format date for display
  function formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  }
</script>

<div class="home">
  {#if isLoadingVault}
    <!-- Loading state -->
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if !$hasVault}
    <!-- No vault selected -->
    <div class="welcome">
      <div class="logo">
        <h1>🧠 Brain-down</h1>
        <p class="tagline">Visual thinking, structured ideas</p>
      </div>
      
      <div class="action-card glass-panel-xl">
        <h2>Get Started</h2>
        <p>Select a folder to use as your vault. All your mind maps will be stored here.</p>
        <button class="btn btn-primary btn-lg" onclick={handleSelectVault}>
          <span class="btn-icon-emoji">📁</span>
          Select Vault Folder
        </button>
      </div>
    </div>
  {:else}
    <!-- Vault selected - show file browser -->
    <div class="browser">
      <header class="browser-header glass-panel">
        <div class="vault-info">
          <h1 class="vault-title">📂 {$vaultName}</h1>
          <button class="btn-text" onclick={handleSelectVault}>
            Change vault
          </button>
        </div>
        
        <button 
          class="btn btn-circle" 
          onclick={() => isCreatingNew = true}
          title="Create new map"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </header>

      {#if $vaultStore.error}
        <div class="alert alert-error">
          <span>{$vaultStore.error}</span>
          <button class="btn-ghost" onclick={() => vaultStore.clearError()}>✕</button>
        </div>
      {/if}

      {#if isCreatingNew}
        <div class="new-file-form glass-card">
          <input
            class="input"
            type="text"
            placeholder="Map name..."
            bind:value={newFileName}
            onkeydown={(e) => e.key === 'Enter' && handleCreateNew()}
            autofocus
          />
          <button class="btn btn-primary" onclick={handleCreateNew} disabled={!newFileName.trim()}>
            Create
          </button>
          <button class="btn btn-secondary" onclick={() => { isCreatingNew = false; newFileName = ''; }}>
            Cancel
          </button>
        </div>
      {/if}

      <div class="file-list">
        {#if $vaultStore.files.length === 0}
          <div class="empty-state">
            <p>No maps yet</p>
            <p class="text-subtle">Create your first mind map to get started</p>
          </div>
        {:else}
          {#each $vaultStore.files as file (file.path)}
            <div 
              class="file-card glass-panel" 
              class:menu-open={openMenuId === file.path}
              class:renaming={renamingFilePath === file.path}
              role="button" 
              tabindex="0" 
              onclick={() => renamingFilePath !== file.path && handleOpenFile(file)} 
              onkeydown={(e) => e.key === 'Enter' && renamingFilePath !== file.path && handleOpenFile(file)}
            >
              <div class="file-icon">🗺️</div>
              <div class="file-info">
                {#if renamingFilePath === file.path}
                  <!-- Inline rename input -->
                  <input
                    class="input rename-input"
                    type="text"
                    bind:value={renameValue}
                    onkeydown={(e) => handleRenameKeydown(e, file)}
                    onclick={(e) => e.stopPropagation()}
                    autofocus
                  />
                  <div class="rename-actions">
                    <button 
                      class="btn btn-primary btn-sm" 
                      onclick={(e) => { e.stopPropagation(); submitRename(file); }}
                      disabled={!renameValue.trim() || renameValue.trim() === file.name}
                    >
                      Save
                    </button>
                    <button 
                      class="btn btn-secondary btn-sm" 
                      onclick={(e) => { e.stopPropagation(); cancelRename(); }}
                    >
                      Cancel
                    </button>
                  </div>
                {:else}
                  <span class="file-name">{file.name}</span>
                  <span class="file-date">{formatDate(file.modifiedAt)}</span>
                {/if}
              </div>
              
              <!-- Collapsible menu (hide when renaming) -->
              {#if renamingFilePath !== file.path}
                <div class="file-menu-container">
                  <button 
                    class="btn-icon"
                    onclick={(e) => toggleFileMenu(file.path, e)}
                    title="More options"
                  >
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="currentColor">
                      <circle cx="18" cy="12" r="2"></circle>
                      <circle cx="18" cy="18" r="2"></circle>
                      <circle cx="18" cy="24" r="2"></circle>
                    </svg>
                  </button>
                  
                  {#if openMenuId === file.path}
                    <div class="dropdown-menu file-dropdown" class:above={dropdownPosition === 'above'}>
                      <button class="dropdown-item" onclick={(e) => startRenameFile(file, e)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Rename
                      </button>
                      <button class="dropdown-item danger" onclick={(e) => handleDeleteFile(file, e)}>
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
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* ==========================================================================
     Home Page Specific Styles
     Uses CSS variables from app.css
     ========================================================================== */

  .home {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* --------------------------------------------------------------------------
     Loading State
     -------------------------------------------------------------------------- */

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    color: var(--text-primary);
  }

  /* --------------------------------------------------------------------------
     Welcome Screen
     -------------------------------------------------------------------------- */

  .welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2xl);
    padding: var(--spacing-xl);
  }

  .logo {
    text-align: center;
  }

  .logo h1 {
    font-size: 3rem;
    margin: 0;
  }

  .tagline {
    color: var(--text-secondary);
    margin-top: var(--spacing-sm);
    font-size: 1.1rem;
  }

  .action-card {
    padding: 2.5rem;
    text-align: center;
    max-width: 420px;
  }

  .action-card h2 {
    margin: 0 0 var(--spacing-sm);
  }

  .action-card p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-lg);
    line-height: 1.6;
  }

  .btn-lg {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: var(--radius-md);
  }

  .btn-icon-emoji {
    font-size: 1.1rem;
  }

  /* --------------------------------------------------------------------------
     Browser View
     -------------------------------------------------------------------------- */

  .browser {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: var(--spacing-lg);
    gap: var(--spacing-md);
  }

  .browser-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .vault-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .vault-title {
    font-size: 1.25rem;
    margin: 0;
  }

  /* --------------------------------------------------------------------------
     New File Form
     -------------------------------------------------------------------------- */

  .new-file-form {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .new-file-form .input {
    flex: 1;
  }

  /* --------------------------------------------------------------------------
     File List
     -------------------------------------------------------------------------- */

  .file-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-right: var(--spacing-sm);
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-2xl);
    color: var(--text-secondary);
  }

  .empty-state p:last-child {
    font-size: 0.875rem;
    margin-top: var(--spacing-sm);
  }

  /* --------------------------------------------------------------------------
     File Card
     -------------------------------------------------------------------------- */

  .file-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) 1.25rem;
    cursor: pointer;
    transition: background var(--transition-smooth), 
                transform var(--transition-fast),
                box-shadow var(--transition-smooth);
    /* Position relative for dropdown, but no z-index by default */
    position: relative;
  }

  /* Elevate the card when its menu is open to escape sibling stacking contexts */
  .file-card.menu-open {
    z-index: 10;
  }

  .file-card:hover {
    background: var(--glass-card);
    box-shadow: var(--shadow-panel-hover), var(--glass-border-strong);
  }

  .file-card:active {
    transform: scale(0.995);
  }

  .file-icon {
    font-size: 1.75rem;
  }

  .file-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 0;
  }

  .file-name {
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-date {
    font-size: 0.8125rem;
    color: var(--text-subtle);
  }

  /* --------------------------------------------------------------------------
     Inline Rename
     -------------------------------------------------------------------------- */

  .file-card.renaming {
    cursor: default;
  }

  .file-card.renaming:active {
    transform: none;
  }

  .rename-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.9375rem;
    font-weight: 500;
  }

  .rename-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  /* --------------------------------------------------------------------------
     File Menu
     -------------------------------------------------------------------------- */

  .file-menu-container {
    position: relative;
  }

  .file-dropdown {
    position: absolute;
    right: 0;
    /* Default: below the trigger */
    top: 100%;
    margin-top: var(--spacing-sm);
  }

  /* When not enough space below, show above */
  .file-dropdown.above {
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: var(--spacing-sm);
    /* Adjust animation direction */
    animation: dropdown-fade-in-up 0.15s ease-out;
  }

  @keyframes dropdown-fade-in-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>