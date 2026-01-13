// =============================================================================
// File Commands
// Rust backend for .mschema file operations
// =============================================================================

use std::fs;
use std::path::Path;

/// Read a .mschema file and return its content as a string
#[tauri::command]
pub fn read_map_file(path: &str) -> Result<String, String> {
    let file_path = Path::new(path);
    
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    
    fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a .mschema file
#[tauri::command]
pub fn write_map_file(path: &str, content: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    
    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }
    
    fs::write(file_path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

/// Create a new .mschema file in the vault
/// Returns the path to the created file
#[tauri::command]
pub fn create_map_file(vault_path: &str, name: &str, content: &str) -> Result<String, String> {
    let vault = Path::new(vault_path);
    
    if !vault.exists() || !vault.is_dir() {
        return Err(format!("Invalid vault path: {}", vault_path));
    }
    
    // Sanitize the file name
    let safe_name = sanitize_filename(name);
    let file_name = format!("{}.mschema", safe_name);
    let file_path = vault.join(&file_name);
    
    // Check if file already exists
    if file_path.exists() {
        return Err(format!("File already exists: {}", file_name));
    }
    
    // Write the file
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

/// Delete a .mschema file
#[tauri::command]
pub fn delete_map_file(path: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    
    // Only allow deleting .mschema files for safety
    match file_path.extension() {
        Some(ext) if ext == "mschema" => {
            fs::remove_file(file_path)
                .map_err(|e| format!("Failed to delete file: {}", e))
        }
        _ => Err("Can only delete .mschema files".to_string()),
    }
}

/// Rename a .mschema file
/// Returns the new file path
#[tauri::command]
pub fn rename_map_file(old_path: &str, new_name: &str) -> Result<String, String> {
    let old_file = Path::new(old_path);
    
    if !old_file.exists() {
        return Err(format!("File does not exist: {}", old_path));
    }
    
    let parent = old_file.parent()
        .ok_or_else(|| "Cannot get parent directory".to_string())?;
    
    let safe_name = sanitize_filename(new_name);
    let new_file_name = format!("{}.mschema", safe_name);
    let new_path = parent.join(&new_file_name);
    
    if new_path.exists() {
        return Err(format!("A file with that name already exists: {}", new_file_name));
    }
    
    fs::rename(old_file, &new_path)
        .map_err(|e| format!("Failed to rename file: {}", e))?;
    
    Ok(new_path.to_string_lossy().to_string())
}

/// Check if a file exists
#[tauri::command]
pub fn file_exists(path: &str) -> bool {
    Path::new(path).exists()
}

/// Sanitize a filename to remove potentially dangerous characters
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .filter(|c| {
            c.is_alphanumeric() 
            || *c == ' ' 
            || *c == '-' 
            || *c == '_' 
            || *c == '.'
        })
        .collect::<String>()
        .trim()
        .to_string()
}