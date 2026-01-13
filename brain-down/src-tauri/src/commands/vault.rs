// =============================================================================
// Vault Commands
// Rust backend for vault management
// =============================================================================

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::Manager;

/// File entry returned to the frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "modifiedAt")]
    pub modified_at: String,
}

/// Get all .mschema files in the vault directory
#[tauri::command]
pub fn get_vault_files(vault_path: &str) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(vault_path);
    
    if !path.exists() {
        return Err(format!("Vault path does not exist: {}", vault_path));
    }
    
    if !path.is_dir() {
        return Err(format!("Vault path is not a directory: {}", vault_path));
    }
    
    let mut files = Vec::new();
    
    let entries = fs::read_dir(path)
        .map_err(|e| format!("Failed to read vault directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let file_path = entry.path();
        
        // Only include .mschema files
        if let Some(ext) = file_path.extension() {
            if ext == "mschema" {
                let name = file_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Unknown")
                    .to_string();
                
                let metadata = fs::metadata(&file_path)
                    .map_err(|e| format!("Failed to read file metadata: {}", e))?;
                
                let modified_at = metadata
                    .modified()
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Utc> = t.into();
                        datetime.to_rfc3339()
                    })
                    .unwrap_or_else(|_| String::from("Unknown"));
                
                files.push(FileEntry {
                    name,
                    path: file_path.to_string_lossy().to_string(),
                    modified_at,
                });
            }
        }
    }
    
    // Sort by modified date, newest first
    files.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    
    Ok(files)
}

/// Get the saved vault path from app data
#[tauri::command]
pub fn get_saved_vault_path(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let config_path = app_data_dir.join("vault_config.json");
    
    if !config_path.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read vault config: {}", e))?;
    
    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse vault config: {}", e))?;
    
    Ok(config.get("vault_path").and_then(|v| v.as_str()).map(String::from))
}

/// Save the vault path to app data
#[tauri::command]
pub fn save_vault_path(app_handle: tauri::AppHandle, vault_path: &str) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create app data directory if it doesn't exist
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let config_path = app_data_dir.join("vault_config.json");
    
    let config = serde_json::json!({
        "vault_path": vault_path
    });
    
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize vault config: {}", e))?;
    
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write vault config: {}", e))?;
    
    Ok(())
}

/// Clear the saved vault path
#[tauri::command]
pub fn clear_saved_vault_path(app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let config_path = app_data_dir.join("vault_config.json");
    
    if config_path.exists() {
        fs::remove_file(&config_path)
            .map_err(|e| format!("Failed to remove vault config: {}", e))?;
    }
    
    Ok(())
}