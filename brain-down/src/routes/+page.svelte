<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { vaultStore, hasVault, activeVault, hasVaults } from '$lib/state';
  import { confirmAction } from '$lib/io/vault';
  import { createMapFile, deleteMapFile, renameMapFile } from '$lib/io/fileCommands';
  import { getVaultFiles } from '$lib/io/vault';
  import { pickDirectory } from '$lib/io/vaultConfig';
  import type { FileEntry } from '$lib/state/types';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------
  
  let isCreatingNew = $state(false);
  let newFileName = $state('');
  let isLoadingVault = $state(true);
  let openMenuId = $state<string | null>(null);
  let dropdownPosition = $state<'below' | 'above'>('below');
  
  // Renaming state
  let renamingFilePath = $state<string | null>(null);
  let renameValue = $state('');
  
  // Settings overlay state
  let settingsOpen = $state(false);
  
  // Approximate dropdown menu height for position calculation
  const DROPDOWN_HEIGHT = 100;

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async function initializeVault() {
    try {
      const result = await vaultStore.initialize();
      
      // TODO: Show toast if fallback was used
      if (result.usedFallback && result.fallbackVaultName) {
        console.log(`Fallback: Using vault "${result.fallbackVaultName}"`);
      }
    } catch (error) {
      console.error('Failed to initialize vault:', error);
    } finally {
      isLoadingVault = false;
    }
  }

  onMount(() => {
    initializeVault();

    // Close menu and cancel rename when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (!target.closest('.file-menu-container')) {
        openMenuId = null;
      }
      
      if (renamingFilePath && !target.closest('.file-card.renaming')) {
        cancelRename();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  // ---------------------------------------------------------------------------
  // Vault Selection (for first-time setup)
  // ---------------------------------------------------------------------------

  async function handleSelectVault() {
    const path = await pickDirectory();
    if (!path) return;

    try {
      // Add as a new vault and activate it
      const vault = await vaultStore.addVault(
        path.split(/[/\\]/).pop() || 'My Vault',  // Use folder name as vault name
        path
      );
      await vaultStore.setActiveVault(vault.id);
    } catch (error) {
      vaultStore.setError(`Failed to add vault: ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // File Operations
  // ---------------------------------------------------------------------------

  async function handleCreateNew() {
    if (!newFileName.trim() || !$activeVault) return;

    try {
      const filePath = await createMapFile($activeVault.path, newFileName.trim());
      await vaultStore.refreshFiles();
      goto(`/editor/${encodeURIComponent(filePath)}`);
    } catch (error) {
      vaultStore.setError(`Failed to create file: ${error}`);
    } finally {
      isCreatingNew = false;
      newFileName = '';
    }
  }

  function handleOpenFile(file: FileEntry) {
    vaultStore.addRecentFile(file.path);
    goto(`/editor/${encodeURIComponent(file.path)}`);
  }

  function toggleFileMenu(filePath: string, event: MouseEvent) {
    event.stopPropagation();
    
    if (openMenuId === filePath) {
      openMenuId = null;
      return;
    }
    
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    
    dropdownPosition = spaceBelow < DROPDOWN_HEIGHT ? 'above' : 'below';
    openMenuId = filePath;
  }

  async function handleDeleteFile(file: FileEntry, event: MouseEvent) {
    event.stopPropagation();
    openMenuId = null;
    
    const confirmed = await confirmAction(
      `Delete "${file.name}"? This cannot be undone.`,
      'Delete Map'
    );
    
    if (!confirmed) return;
    
    try {
      await deleteMapFile(file.path);
      await vaultStore.refreshFiles();
    } catch (error) {
      vaultStore.setError(`Failed to delete file: ${error}`);
    }
  }

  function startRenameFile(file: FileEntry, event: MouseEvent) {
    event.stopPropagation();
    openMenuId = null;
    renamingFilePath = file.path;
    renameValue = file.name;
  }

  function cancelRename() {
    renamingFilePath = null;
    renameValue = '';
  }

  async function submitRename(file: FileEntry) {
    const trimmedName = renameValue.trim();
    
    if (!trimmedName || trimmedName === file.name) {
      cancelRename();
      return;
    }
    
    try {
      await renameMapFile(file.path, trimmedName);
      await vaultStore.refreshFiles();
    } catch (error) {
      vaultStore.setError(`Failed to rename file: ${error}`);
    } finally {
      cancelRename();
    }
  }

  function handleRenameKeydown(event: KeyboardEvent, file: FileEntry) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitRename(file);
    } else if (event.key === 'Escape') {
      cancelRename();
    }
  }

  // ---------------------------------------------------------------------------
  // Sidebar Actions
  // ---------------------------------------------------------------------------

  function handleNewMap() {
    if ($hasVault) {
      isCreatingNew = true;
    }
  }

  function handleOpenSettings() {
    settingsOpen = true;
  }

  // ---------------------------------------------------------------------------
  // Vault Switching
  // ---------------------------------------------------------------------------

  async function handleVaultChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const vaultId = select.value;
    
    if (vaultId && vaultId !== $vaultStore.activeVaultId) {
      try {
        await vaultStore.setActiveVault(vaultId);
      } catch (error) {
        // Error is already set in store
        // Reset select to previous value
        select.value = $vaultStore.activeVaultId || '';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  // Custom action to focus and select input content on mount
  function focusAndSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

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

<!-- Settings Overlay -->
<SettingsOverlay bind:open={settingsOpen} onclose={() => settingsOpen = false} />

<div class="home">
  {#if isLoadingVault}
    <!-- Loading state -->
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if !$hasVaults}
    <!-- No vaults configured - Welcome screen -->
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
    <!-- Main app layout with sidebar -->
    <div class="app-layout">
      <Sidebar onNewMap={handleNewMap} onOpenSettings={handleOpenSettings} />
      
      <div class="main-area">
        <header class="browser-header">
          <div class="header-left">
            <h1 class="app-title">Brain-down</h1>
          </div>
          
          <div class="header-right">
            <!-- Vault Selector Dropdown -->
            {#if $vaultStore.vaults.length > 1}
              <select 
                class="vault-selector" 
                value={$vaultStore.activeVaultId}
                onchange={handleVaultChange}
              >
                {#each $vaultStore.vaults as vault (vault.id)}
                  <option value={vault.id}>{vault.name}</option>
                {/each}
              </select>
            {:else if $activeVault}
              <div class="vault-badge">
                <span class="vault-icon">📂</span>
                <span class="vault-name">{$activeVault.name}</span>
              </div>
            {/if}
          </div>
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

        <div class="file-section">
          <span class="section-title">Recent Maps</span>
          
          <div class="file-list">
            {#if $vaultStore.files.length === 0}
              <div class="empty-state">
                <p>No maps yet</p>
                <p class="text-subtle">Click the + button to create your first mind map</p>
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
                      <input
                        class="input rename-input"
                        type="text"
                        bind:value={renameValue}
                        onkeydown={(e) => handleRenameKeydown(e, file)}
                        onclick={(e) => e.stopPropagation()}
                        use:focusAndSelect
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
                  
                  {#if renamingFilePath !== file.path}
                    <div class="file-menu-container">
                      <button 
                        class="btn-icon"
                        onclick={(e) => toggleFileMenu(file.path, e)}
                        title="More options"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="6" r="1.5"></circle>
                          <circle cx="12" cy="12" r="1.5"></circle>
                          <circle cx="12" cy="18" r="1.5"></circle>
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
      </div>
    </div>
  {/if}
</div>

<style>
  /* ===========================================================================
     Home Page Styles
     =========================================================================== */

  .home {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* ---------------------------------------------------------------------------
     Loading State
     --------------------------------------------------------------------------- */

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    color: var(--text-primary);
  }

  /* ---------------------------------------------------------------------------
     Welcome Screen (No Vaults)
     --------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------
     Main App Layout (With Sidebar)
     --------------------------------------------------------------------------- */

  .app-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-lg);
    gap: var(--spacing-md);
    overflow: hidden;
  }

  /* ---------------------------------------------------------------------------
     Header
     --------------------------------------------------------------------------- */

  .browser-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .app-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .vault-selector {
    appearance: none;
    -webkit-appearance: none;
    padding: 0.5rem 2.25rem 0.5rem 0.875rem;
    border-radius: var(--radius-sm);
    background: var(--glass-card);
    backdrop-filter: var(--glass-blur-light);
    -webkit-backdrop-filter: var(--glass-blur-light);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-card), var(--glass-border);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    min-width: 140px;
    transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235a7a9a' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.625rem center;
    background-size: 16px;
  }

  .vault-selector:hover {
    border-color: var(--border-medium);
  }

  .vault-selector:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-bg);
  }

  .vault-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 0.5rem 0.875rem;
    border-radius: var(--radius-sm);
    background: var(--glass-card);
    border: 1px solid var(--border-light);
    font-size: 0.875rem;
  }

  .vault-icon {
    font-size: 1rem;
  }

  .vault-name {
    color: var(--text-primary);
    font-weight: 500;
  }

  /* ---------------------------------------------------------------------------
     New File Form
     --------------------------------------------------------------------------- */

  .new-file-form {
    display: flex;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
  }

  .new-file-form .input {
    flex: 1;
  }

  /* ---------------------------------------------------------------------------
     File Section
     --------------------------------------------------------------------------- */

  .file-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    overflow: hidden;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* ---------------------------------------------------------------------------
     File List
     --------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------
     File Card
     --------------------------------------------------------------------------- */

  .file-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) 1.25rem;
    cursor: pointer;
    transition: background var(--transition-smooth), 
                transform var(--transition-fast),
                box-shadow var(--transition-smooth);
    position: relative;
  }

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

  /* ---------------------------------------------------------------------------
     Inline Rename
     --------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------------
     File Menu
     --------------------------------------------------------------------------- */

  .file-menu-container {
    position: relative;
  }

  .file-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: var(--spacing-sm);
  }

  .file-dropdown.above {
    top: auto;
    bottom: 100%;
    margin-top: 0;
    margin-bottom: var(--spacing-sm);
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