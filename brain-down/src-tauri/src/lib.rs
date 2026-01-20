// =============================================================================
// Brain-down Tauri Library
// Configures the Tauri application with all commands and plugins
// =============================================================================

mod commands;

use commands::{
    // Vault commands
    get_vault_files,
    get_saved_vault_path,
    save_vault_path,
    clear_saved_vault_path,
    // File commands
    read_map_file,
    write_map_file,
    create_map_file,
    delete_map_file,
    rename_map_file,
    file_exists,
    // Config commands
    load_config,
    save_config,
    check_vault_accessible,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Vault commands
            get_vault_files,
            get_saved_vault_path,
            save_vault_path,
            clear_saved_vault_path,
            // File commands
            read_map_file,
            write_map_file,
            create_map_file,
            delete_map_file,
            rename_map_file,
            file_exists,
            // Config commands
            load_config,
            save_config,
            check_vault_accessible,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}