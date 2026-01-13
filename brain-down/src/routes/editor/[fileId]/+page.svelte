<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { mapStore, uiStore } from '$lib/state';
  import { readMapFile, writeMapFile } from '$lib/io/fileCommands';

  // Get file path from URL params
  let filePath = $derived(decodeURIComponent($page.params.fileId));
  
  // Local state
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let saveStatus = $state<'saved' | 'saving' | 'unsaved'>('saved');

  // Load the map file on mount
  onMount(async () => {
    await loadMap();
    
    // Set up keyboard shortcuts
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  // Clean up on destroy
  onDestroy(() => {
    mapStore.closeMap();
    uiStore.reset();
  });

  // Load map from file
  async function loadMap() {
    isLoading = true;
    error = null;
    
    try {
      const file = await readMapFile(filePath);
      mapStore.loadMap(file, filePath);
    } catch (e) {
      error = `Failed to load map: ${e}`;
    } finally {
      isLoading = false;
    }
  }

  // Save map to file
  async function saveMap() {
    const state = $mapStore;
    if (!state.file || !state.filePath) return;
    
    saveStatus = 'saving';
    
    try {
      await writeMapFile(state.filePath, state.file);
      mapStore.markSaved();
      saveStatus = 'saved';
    } catch (e) {
      error = `Failed to save: ${e}`;
      saveStatus = 'unsaved';
    }
  }

  // Handle keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+S - Save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveMap();
    }
    
    // Escape - Deselect / Cancel
    if (e.key === 'Escape') {
      uiStore.stopEditing();
      uiStore.clearSelection();
    }
  }

  // Update save status based on dirty state
  $effect(() => {
    if ($mapStore.isDirty && saveStatus === 'saved') {
      saveStatus = 'unsaved';
    }
  });

  // Go back to home
  function goHome() {
    if ($mapStore.isDirty) {
      if (!confirm('You have unsaved changes. Leave anyway?')) {
        return;
      }
    }
    goto('/');
  }
</script>

<div class="editor">
  <!-- Header bar -->
  <header class="editor-header">
    <div class="left">
      <button class="icon-btn" onclick={goHome} title="Back to files">
        ← Back
      </button>
      <h1>{$mapStore.file?.meta.name ?? 'Loading...'}</h1>
    </div>
    
    <div class="right">
      <span class="save-status" class:unsaved={saveStatus === 'unsaved'}>
        {#if saveStatus === 'saving'}
          Saving...
        {:else if saveStatus === 'unsaved'}
          Unsaved changes
        {:else}
          Saved ✓
        {/if}
      </span>
      <button onclick={saveMap} disabled={saveStatus === 'saving'}>
        💾 Save
      </button>
    </div>
  </header>

  <!-- Main content area -->
  <main class="editor-content">
    {#if isLoading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading map...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>⚠️ {error}</p>
        <button onclick={loadMap}>Retry</button>
        <button onclick={goHome}>Go Back</button>
      </div>
    {:else}
      <!-- Placeholder for canvas - we'll add this in Phase 2 -->
      <div class="canvas-placeholder">
        <p>🎨 Canvas will be rendered here</p>
        <p class="hint">
          File loaded: {$mapStore.file?.meta.name}<br>
          Nodes: {$mapStore.file?.nodes.length ?? 0}<br>
          Edges: {$mapStore.file?.edges.length ?? 0}
        </p>
      </div>
    {/if}
  </main>

  <!-- Status bar -->
  <footer class="status-bar">
    <span>Tool: {$uiStore.selectedTool}</span>
    <span>Selected: {$uiStore.selectedNodeIds.size} nodes</span>
    <span>Zoom: 100%</span>
  </footer>
</div>

<style>
  .editor {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .left, .right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .editor-header h1 {
    font-size: 1rem;
    font-weight: 500;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
  }

  .icon-btn:hover {
    color: var(--text-primary);
  }

  .save-status {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .save-status.unsaved {
    color: var(--warning);
  }

  .editor-content {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: var(--canvas-bg);
  }

  .loading, .error-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--bg-tertiary);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    color: var(--error);
  }

  .error-state button {
    margin-top: 0.5rem;
  }

  .canvas-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-secondary);
  }

  .hint {
    font-size: 0.875rem;
    text-align: center;
    line-height: 1.8;
  }

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 1rem;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  button {
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.875rem;
  }

  button:hover:not(:disabled) {
    background: var(--bg-primary);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>