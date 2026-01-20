// =============================================================================
// Config Commands
// Rust backend for application configuration persistence
// =============================================================================

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::Manager;

// -----------------------------------------------------------------------------
// Data Structures
// -----------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultEntry {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub vaults: Vec<VaultEntry>,
}

// -----------------------------------------------------------------------------
// Tauri Commands
// -----------------------------------------------------------------------------

/// Load the application config from disk.
/// Returns default config if file doesn't exist.
#[tauri::command]
pub fn load_config(app_handle: tauri::AppHandle) -> Result<AppConfig, String> {
    let config_path = get_config_file_path(&app_handle)?;
    
    if !config_path.exists() {
        return Ok(AppConfig::default());
    }
    
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))
}

/// Save the application config to disk.
/// Creates the config directory if it doesn't exist.
#[tauri::command]
pub fn save_config(app_handle: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let config_path = get_config_file_path(&app_handle)?;
    
    // Ensure parent directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))
}

/// Check if a vault path is accessible (exists, is a directory, and is readable).
/// Used for vault fallback logic during app initialization.
#[tauri::command]
pub fn check_vault_accessible(path: &str) -> Result<bool, String> {
    let path = Path::new(path);
    
    // Check existence
    if !path.exists() {
        return Ok(false);
    }
    
    // Check if it's a directory
    if !path.is_dir() {
        return Ok(false);
    }
    
    // Check if readable by attempting to read the directory
    match fs::read_dir(path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/// Get the path to the config file.
/// Located at: <app_data_dir>/config.json
fn get_config_file_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    Ok(app_data_dir.join("config.json"))
}