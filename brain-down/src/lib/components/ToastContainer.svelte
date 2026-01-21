<script lang="ts">
  import { toasts, toastStore } from '$lib/state/toastStore';
  import type { ToastType } from '$lib/state/types';

  // -----------------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------------

  function getIcon(type: ToastType): string {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✕';
      case 'info':
      default: return 'ℹ';
    }
  }
</script>

{#if $toasts.length > 0}
  <div class="toast-container" role="region" aria-label="Notifications">
    {#each $toasts as toast (toast.id)}
      <div 
        class="toast toast-{toast.type}"
        role="alert"
      >
        <span class="toast-icon">{getIcon(toast.type)}</span>
        <span class="toast-message">{toast.message}</span>
        <button 
          class="toast-dismiss" 
          onclick={() => toastStore.dismiss(toast.id)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  /* ===========================================================================
     Toast Container
     =========================================================================== */

  .toast-container {
    position: fixed;
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-width: 400px;
    pointer-events: none;
  }

  /* ===========================================================================
     Individual Toast
     =========================================================================== */

  .toast {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    background: var(--glass-page);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    box-shadow: var(--shadow-dropdown), var(--glass-border);
    pointer-events: auto;
    animation: toast-in 0.25s ease-out;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* ---------------------------------------------------------------------------
     Toast Icon
     --------------------------------------------------------------------------- */

  .toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .toast-info .toast-icon {
    background: rgba(74, 159, 212, 0.15);
    color: var(--accent);
  }

  .toast-success .toast-icon {
    background: rgba(80, 180, 100, 0.15);
    color: var(--success, #50b464);
  }

  .toast-warning .toast-icon {
    background: rgba(230, 180, 60, 0.15);
    color: var(--warning, #e6b43c);
  }

  .toast-error .toast-icon {
    background: rgba(220, 80, 80, 0.15);
    color: var(--alert);
  }

  /* ---------------------------------------------------------------------------
     Toast Message
     --------------------------------------------------------------------------- */

  .toast-message {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-primary);
    line-height: 1.4;
  }

  /* ---------------------------------------------------------------------------
     Dismiss Button
     --------------------------------------------------------------------------- */

  .toast-dismiss {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-subtle);
    font-size: 0.75rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .toast-dismiss:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
  }
</style>