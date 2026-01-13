// =============================================================================
// Brain-down Data Model Types
// Based on MVP specification v0.1.0
// =============================================================================

// -----------------------------------------------------------------------------
// Geometry Primitives
// -----------------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// -----------------------------------------------------------------------------
// Node Styling
// -----------------------------------------------------------------------------

export interface NodeStyle {
  fillColor: string | null;  // Hex color, null = inherit from parent (MindMapNode)
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  padding: number;
}

// -----------------------------------------------------------------------------
// Node Types
// -----------------------------------------------------------------------------

interface BaseNode {
  id: string;              // UUID v4
  type: string;
  position: Point;         // Top-left corner
  size: Size;              // Computed on save, used for initial render
  style: NodeStyle;
}

export interface NoteNode extends BaseNode {
  type: 'note';
  content: string;
}

export interface MindMapNode extends BaseNode {
  type: 'mindmap';
  content: string;
  parentId: string | null;   // null = root node
  childrenIds: string[];
}

export type Node = NoteNode | MindMapNode;

// -----------------------------------------------------------------------------
// Edge Types
// -----------------------------------------------------------------------------

export interface EdgeStyle {
  color: string;
  startStyle: 'arrow' | 'dot' | null;
  endStyle: 'arrow' | 'dot' | null;
}

export interface EdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  style: EdgeStyle;
}

// -----------------------------------------------------------------------------
// File Structure
// -----------------------------------------------------------------------------

export interface FileMeta {
  name: string;
  id: string;              // UUID v4
  createdAt: string;       // ISO 8601
  modifiedAt: string;      // ISO 8601
}

export interface CanvasState {
  viewport: {
    x: number;             // Pan offset
    y: number;
    zoom: number;
  };
  background: string;      // Color
}

export interface MSchemaFile {
  version: 1;
  meta: FileMeta;
  canvas: CanvasState;
  nodes: Node[];
  edges: EdgeData[];
}

// -----------------------------------------------------------------------------
// UI State Types
// -----------------------------------------------------------------------------

export type Tool = 'select' | 'note' | 'mindmap' | 'edge';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string | null;
}

export interface ModalState {
  type: 'delete-confirm' | 'export' | 'new-file';
  data?: unknown;
}

// -----------------------------------------------------------------------------
// File Entry (for vault browser)
// -----------------------------------------------------------------------------

export interface FileEntry {
  name: string;
  path: string;
  modifiedAt: string;
}