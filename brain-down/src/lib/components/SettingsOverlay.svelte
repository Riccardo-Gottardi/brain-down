<script lang="ts">
  import { onMount } from 'svelte';
  import VaultManager from './VaultManager.svelte';

  // -----------------------------------------------------------------------------
  // Props
  // -----------------------------------------------------------------------------
  
  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open = $bindable(), onclose }: Props = $props();

  // -----------------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------------

  type SettingsSection = 'vaults' | 'appearance' | 'shortcuts';
  
  let activeSection = $state<SettingsSection>('vaults');

  // Section definitions for the sidebar
  const sections: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'vaults', label: 'Vaults', icon: '📂' },
  ];

  // -----------------------------------------------------------------------------
  // Event Handlers
  // -----------------------------------------------------------------------------

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function close() {
    open = false;
    onclose?.();
  }

  // -----------------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------------

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="settings-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
    <div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      
      <!-- Header -->
      <header class="settings-header">
        <h2 id="settings-title">Settings</h2>
        <button class="btn-icon close-btn" onclick={close} title="Close (Esc)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      <div class="settings-body">
        <!-- Section Navigation -->
        <nav class="settings-nav">
          {#each sections as section (section.id)}
            <button
              class="nav-item"
              class:active={activeSection === section.id}
              onclick={() => activeSection = section.id}
            >
              <span class="nav-icon">{section.icon}</span>
              <span class="nav-label">{section.label}</span>
            </button>
          {/each}
        </nav>

        <!-- Section Content -->
        <main class="settings-content">
          {#if activeSection === 'vaults'}
            <VaultManager />
          {/if}
        </main>
      </div>

    </div>
  </div>
{/if}

<style>
  .settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    background: rgba(45, 58, 92, 0.3);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fade-in 0.15s ease-out;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .settings-panel {
    width: 100%;
    height: 100%;
    max-width: 900px;
    max-height: 700px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slide-up 0.2s ease-out;
    background: var(--glass-page);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-panel), var(--glass-border);
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

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--border-light);
  }

  .settings-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }

  .close-btn {
    color: var(--text-secondary);
  }

  .close-btn:hover {
    color: var(--text-primary);
    background: var(--accent-bg);
  }

  .settings-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .settings-nav {
    width: 180px;
    flex-shrink: 0;
    padding: var(--spacing-md);
    border-right: 1px solid var(--border-light);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background var(--transition-normal), color var(--transition-normal);
  }

  .nav-item:hover {
    background: var(--accent-bg);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--accent-bg-strong);
    color: var(--accent);
  }

  .nav-icon {
    font-size: 1rem;
    width: 1.25rem;
    text-align: center;
  }

  .nav-label {
    flex: 1;
  }

  .settings-content {
    flex: 1;
    padding: var(--spacing-lg);
    overflow-y: auto;
  }
</style>