// =============================================================================
// Map Store
// Manages the currently loaded map file and its state
// =============================================================================

import { writable, derived } from 'svelte/store';
import type { MSchemaFile, Node, EdgeData } from './types';

// -----------------------------------------------------------------------------
// State Interface
// -----------------------------------------------------------------------------

export interface MapState {
  file: MSchemaFile | null;      // Currently loaded map
  filePath: string | null;       // Path to current file
  isDirty: boolean;              // Unsaved changes flag
}

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const initialState: MapState = {
  file: null,
  filePath: null,
  isDirty: false,
};

// -----------------------------------------------------------------------------
// Store Creation
// -----------------------------------------------------------------------------

function createMapStore() {
  const { subscribe, set, update } = writable<MapState>(initialState);

  return {
    subscribe,

    /**
     * Load a map file into the store
     */
    loadMap: (file: MSchemaFile, filePath: string) => {
      set({
        file,
        filePath,
        isDirty: false,
      });
    },

    /**
     * Update the entire file (marks as dirty)
     */
    updateFile: (file: MSchemaFile) => {
      update(state => ({
        ...state,
        file,
        isDirty: true,
      }));
    },

    /**
     * Add a node to the map
     */
    addNode: (node: Node) => {
      update(state => {
        if (!state.file) return state;
        return {
          ...state,
          file: {
            ...state.file,
            nodes: [...state.file.nodes, node],
          },
          isDirty: true,
        };
      });
    },

    /**
     * Update a node by ID
     */
    updateNode: (nodeId: string, updates: Partial<Node>) => {
      update(state => {
        if (!state.file) return state;
        return {
          ...state,
          file: {
            ...state.file,
            nodes: state.file.nodes.map(n =>
              n.id === nodeId ? { ...n, ...updates } as Node : n
            ),
          },
          isDirty: true,
        };
      });
    },

    /**
     * Remove a node by ID (also removes connected edges)
     */
    removeNode: (nodeId: string) => {
      update(state => {
        if (!state.file) return state;
        return {
          ...state,
          file: {
            ...state.file,
            nodes: state.file.nodes.filter(n => n.id !== nodeId),
            edges: state.file.edges.filter(
              e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
            ),
          },
          isDirty: true,
        };
      });
    },

    /**
     * Add an edge to the map
     */
    addEdge: (edge: EdgeData) => {
      update(state => {
        if (!state.file) return state;
        return {
          ...state,
          file: {
            ...state.file,
            edges: [...state.file.edges, edge],
          },
          isDirty: true,
        };
      });
    },

    /**
     * Remove an edge by ID
     */
    removeEdge: (edgeId: string) => {
      update(state => {
        if (!state.file) return state;
        return {
          ...state,
          file: {
            ...state.file,
            edges: state.file.edges.filter(e => e.id !== edgeId),
          },
          isDirty: true,
        };
      });
    },

    /**
     * Update canvas viewport (pan/zoom)
     */
    updateViewport: (viewport: { x: number; y: number; zoom: number }) => {
      update(state => {
        if (!state.file) return state;
        return {
          ...state,
          file: {
            ...state.file,
            canvas: {
              ...state.file.canvas,
              viewport,
            },
          },
          // Viewport changes don't mark as dirty (optional UX choice)
          // Set to true if you want viewport saved on every pan/zoom
        };
      });
    },

    /**
     * Mark the file as saved (clears dirty flag)
     */
    markSaved: () => {
      update(state => ({
        ...state,
        isDirty: false,
        file: state.file ? {
          ...state.file,
          meta: {
            ...state.file.meta,
            modifiedAt: new Date().toISOString(),
          },
        } : null,
      }));
    },

    /**
     * Close the current map
     */
    closeMap: () => {
      set(initialState);
    },
  };
}

// -----------------------------------------------------------------------------
// Store Instance & Derived Stores
// -----------------------------------------------------------------------------

export const mapStore = createMapStore();

/**
 * Derived store: just the nodes array
 */
export const nodes = derived(mapStore, $map => $map.file?.nodes ?? []);

/**
 * Derived store: just the edges array
 */
export const edges = derived(mapStore, $map => $map.file?.edges ?? []);

/**
 * Derived store: current viewport
 */
export const viewport = derived(mapStore, $map => $map.file?.canvas.viewport ?? { x: 0, y: 0, zoom: 1 });

/**
 * Derived store: whether a map is currently loaded
 */
export const hasMap = derived(mapStore, $map => $map.file !== null);