<script lang="ts">
  // -----------------------------------------------------------------------------
  // Props
  // -----------------------------------------------------------------------------
  
  interface Props {
    onNewMap: () => void;
    onOpenSettings: () => void;
  }

  let { onNewMap, onOpenSettings }: Props = $props();
</script>

<aside class="sidebar">
  <div class="sidebar-top">
    <!-- Reserved for future icons (home, search, etc.) -->
  </div>

  <div class="sidebar-center">
    <!-- New Map Button - Primary action -->
    <button 
      class="new-map-btn" 
      onclick={onNewMap}
      title="New Map"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  </div>

  <div class="sidebar-bottom">
    <div class="sidebar-divider"></div>
    
    <!-- Settings Button -->
    <button 
      class="sidebar-btn" 
      onclick={onOpenSettings}
      title="Settings"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </button>
  </div>
</aside>

<style>
  /* ===========================================================================
     Sidebar Styles
     =========================================================================== */

  .sidebar {
    width: 56px;
    height: 100%;
    padding: var(--spacing-md) var(--spacing-sm);
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
  }

  .sidebar-top {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: var(--spacing-sm);
  }

  .sidebar-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sidebar-bottom {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding-bottom: var(--spacing-sm);
  }

  /* ---------------------------------------------------------------------------
     Sidebar Button Base
     --------------------------------------------------------------------------- */

  .sidebar-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition-normal), color var(--transition-normal);
    color: var(--text-secondary);
  }

  .sidebar-btn:hover {
    background: rgba(255, 255, 255, 0.6);
    color: var(--text-primary);
  }

  /* ---------------------------------------------------------------------------
     New Map Button - Primary Action
     --------------------------------------------------------------------------- */

  .new-map-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--accent);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(74, 159, 212, 0.3);
    transition: background var(--transition-normal), transform var(--transition-fast);
    color: white;
  }

  .new-map-btn:hover {
    background: var(--accent-deep);
    transform: scale(1.05);
  }

  .new-map-btn:active {
    transform: scale(0.98);
  }

  /* ---------------------------------------------------------------------------
     Divider
     --------------------------------------------------------------------------- */

  .sidebar-divider {
    width: 24px;
    height: 1px;
    background: var(--border-light);
    margin: var(--spacing-sm) 0;
  }
</style>