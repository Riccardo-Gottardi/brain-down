// =============================================================================
// UI Store
// Manages UI state: selections, active tool, modals, context menus
// =============================================================================

import { writable, derived } from 'svelte/store';
import type { Tool, ContextMenuState, ModalState } from './types';

// -----------------------------------------------------------------------------
// State Interface
// -----------------------------------------------------------------------------

export interface UIState {
  selectedNodeIds: Set<string>;        // Currently selected nodes
  selectedEdgeIds: Set<string>;        // Currently selected edges
  selectedTool: Tool;                  // Active tool
  editingNodeId: string | null;        // Node currently being edited
  contextMenu: ContextMenuState | null; // Context menu state
  modal: ModalState | null;            // Modal dialog state
}

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const initialState: UIState = {
  selectedNodeIds: new Set(),
  selectedEdgeIds: new Set(),
  selectedTool: 'select',
  editingNodeId: null,
  contextMenu: null,
  modal: null,
};

// -----------------------------------------------------------------------------
// Store Creation
// -----------------------------------------------------------------------------

function createUiStore() {
  const { subscribe, set, update } = writable<UIState>(initialState);

  return {
    subscribe,

    // -------------------------------------------------------------------------
    // Selection Management
    // -------------------------------------------------------------------------

    /**
     * Select a single node (clears previous selection)
     */
    selectNode: (nodeId: string) => {
      update(state => ({
        ...state,
        selectedNodeIds: new Set([nodeId]),
        selectedEdgeIds: new Set(),
      }));
    },

    /**
     * Toggle a node in the selection (for Shift+click)
     */
    toggleNodeSelection: (nodeId: string) => {
      update(state => {
        const newSelection = new Set(state.selectedNodeIds);
        if (newSelection.has(nodeId)) {
          newSelection.delete(nodeId);
        } else {
          newSelection.add(nodeId);
        }
        return {
          ...state,
          selectedNodeIds: newSelection,
        };
      });
    },

    /**
     * Select multiple nodes (e.g., from box selection)
     */
    selectNodes: (nodeIds: string[]) => {
      update(state => ({
        ...state,
        selectedNodeIds: new Set(nodeIds),
        selectedEdgeIds: new Set(),
      }));
    },

    /**
     * Add nodes to current selection
     */
    addToSelection: (nodeIds: string[]) => {
      update(state => ({
        ...state,
        selectedNodeIds: new Set([...state.selectedNodeIds, ...nodeIds]),
      }));
    },

    /**
     * Clear all selections
     */
    clearSelection: () => {
      update(state => ({
        ...state,
        selectedNodeIds: new Set(),
        selectedEdgeIds: new Set(),
      }));
    },

    /**
     * Select all nodes (requires node list from mapStore)
     */
    selectAll: (allNodeIds: string[]) => {
      update(state => ({
        ...state,
        selectedNodeIds: new Set(allNodeIds),
      }));
    },

    // -------------------------------------------------------------------------
    // Tool Management
    // -------------------------------------------------------------------------

    /**
     * Set the active tool
     */
    setTool: (tool: Tool) => {
      update(state => ({
        ...state,
        selectedTool: tool,
        // Clear editing when switching tools
        editingNodeId: null,
      }));
    },

    // -------------------------------------------------------------------------
    // Editing Mode
    // -------------------------------------------------------------------------

    /**
     * Enter edit mode for a node
     */
    startEditing: (nodeId: string) => {
      update(state => ({
        ...state,
        editingNodeId: nodeId,
        selectedNodeIds: new Set([nodeId]),
      }));
    },

    /**
     * Exit edit mode
     */
    stopEditing: () => {
      update(state => ({
        ...state,
        editingNodeId: null,
      }));
    },

    // -------------------------------------------------------------------------
    // Context Menu
    // -------------------------------------------------------------------------

    /**
     * Show context menu at position
     */
    showContextMenu: (x: number, y: number, nodeId: string | null = null) => {
      update(state => ({
        ...state,
        contextMenu: { x, y, nodeId },
      }));
    },

    /**
     * Hide context menu
     */
    hideContextMenu: () => {
      update(state => ({
        ...state,
        contextMenu: null,
      }));
    },

    // -------------------------------------------------------------------------
    // Modal Management
    // -------------------------------------------------------------------------

    /**
     * Show a modal dialog
     */
    showModal: (type: ModalState['type'], data?: unknown) => {
      update(state => ({
        ...state,
        modal: { type, data },
      }));
    },

    /**
     * Hide the modal dialog
     */
    hideModal: () => {
      update(state => ({
        ...state,
        modal: null,
      }));
    },

    // -------------------------------------------------------------------------
    // Reset
    // -------------------------------------------------------------------------

    /**
     * Reset UI state (e.g., when closing a map)
     */
    reset: () => {
      set(initialState);
    },
  };
}

// -----------------------------------------------------------------------------
// Store Instance & Derived Stores
// -----------------------------------------------------------------------------

export const uiStore = createUiStore();

/**
 * Derived store: number of selected nodes
 */
export const selectionCount = derived(
  uiStore,
  $ui => $ui.selectedNodeIds.size
);

/**
 * Derived store: whether any node is selected
 */
export const hasSelection = derived(
  uiStore,
  $ui => $ui.selectedNodeIds.size > 0
);

/**
 * Derived store: whether currently editing a node
 */
export const isEditing = derived(
  uiStore,
  $ui => $ui.editingNodeId !== null
);