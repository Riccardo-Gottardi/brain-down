// =============================================================================
// File Commands
// Frontend wrappers for Tauri file operations
// =============================================================================

import { invoke } from '@tauri-apps/api/core';
import type { MSchemaFile, FileMeta, CanvasState } from '$lib/state/types';
import { generateId } from '$lib/utils/ids';
import { currentTheme } from '$lib/utils/colors';

/**
 * Read and parse a .mschema file
 */
export async function readMapFile(filePath: string): Promise<MSchemaFile> {
  const content = await invoke<string>('read_map_file', { path: filePath });
  return JSON.parse(content) as MSchemaFile;
}

/**
 * Write a map to a .mschema file
 */
export async function writeMapFile(filePath: string, map: MSchemaFile): Promise<void> {
  const content = JSON.stringify(map, null, 2);
  await invoke('write_map_file', { path: filePath, content });
}

/**
 * Create a new .mschema file in the vault
 * Returns the path to the created file
 */
export async function createMapFile(vaultPath: string, name: string): Promise<string> {
  // Create the initial file structure
  const now = new Date().toISOString();
  
  const meta: FileMeta = {
    name,
    id: generateId(),
    createdAt: now,
    modifiedAt: now,
  };

  const canvas: CanvasState = {
    viewport: { x: 0, y: 0, zoom: 1 },
    background: currentTheme.canvasBackground,
  };

  const file: MSchemaFile = {
    version: 1,
    meta,
    canvas,
    nodes: [],
    edges: [],
  };

  // Create the file via Tauri command
  const filePath = await invoke<string>('create_map_file', {
    vaultPath,
    name,
    content: JSON.stringify(file, null, 2),
  });

  return filePath;
}

/**
 * Delete a .mschema file
 */
export async function deleteMapFile(filePath: string): Promise<void> {
  await invoke('delete_map_file', { path: filePath });
}

/**
 * Rename a .mschema file
 * Returns the new file path
 */
export async function renameMapFile(oldPath: string, newName: string): Promise<string> {
  return invoke<string>('rename_map_file', { oldPath, newName });
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return invoke<boolean>('file_exists', { path: filePath });
}