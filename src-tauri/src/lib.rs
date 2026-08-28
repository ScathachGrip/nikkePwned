#![allow(unexpected_cfgs)]
#![allow(clippy::all)]

mod automation;
mod rpc;
mod storage;
mod system;
mod vision;

use rpc::DiscordRpcState;
use serde::Serialize;
use std::sync::Arc;
use storage::{Account, HistoryLog, OpenRouterConfig, StorageManager};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

pub struct AppState {
    pub storage: Arc<StorageManager>,
    pub rpc: Arc<DiscordRpcState>,
}

#[derive(Serialize)]
pub struct LoginResult {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
fn get_launcher_path(state: State<'_, AppState>) -> String {
    if let Ok(guard) = state.storage.data.lock() {
        return guard.launcher_path.clone();
    }
    String::new()
}

#[tauri::command]
async fn select_launcher_path(app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .add_filter("Executables", &["exe"])
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let path_buf = rx.await.map_err(|_| "Dialog cancelled".to_string())?;

    if let Some(p) = path_buf {
        let path_str = p.to_string();
        if !path_str.contains("nikke_launcher.exe") {
            return Err("Please select nikke_launcher.exe!".to_string());
        }

        if let Ok(mut guard) = state.storage.data.lock() {
            guard.launcher_path = path_str.clone();
        }
        state.storage.save();
        Ok(path_str)
    } else {
        Err("No file selected".to_string())
    }
}

#[tauri::command]
fn get_accounts(state: State<'_, AppState>) -> Vec<Account> {
    if let Ok(guard) = state.storage.data.lock() {
        return guard.accounts.clone();
    }
    Vec::new()
}

#[tauri::command]
fn register_accounts(state: State<'_, AppState>, accounts: Vec<Account>) -> Result<(), String> {
    if accounts.is_empty() {
        return Err("Account list is empty".to_string());
    }

    if let Ok(mut guard) = state.storage.data.lock() {
        for acc in accounts {
            let nickname = acc.nickname.trim().to_string();
            let email = acc.email.trim().to_string();
            let password = acc.password;

            if nickname.is_empty() || email.is_empty() || password.is_empty() {
                return Err("Each account must have nickname, email, and password".into());
            }

            if let Some(existing) = guard.accounts.iter_mut().find(|a| a.email == email) {
                existing.nickname = nickname;
                existing.password = password;
            } else {
                guard.accounts.push(Account {
                    nickname,
                    email,
                    password,
                });
            }
        }
    }
    state.storage.save();
    Ok(())
}

#[tauri::command]
fn remove_account(state: State<'_, AppState>, email: String) -> Result<(), String> {
    if let Ok(mut guard) = state.storage.data.lock() {
        guard.accounts.retain(|a| a.email != email);
    }
    state.storage.save();
    Ok(())
}

#[tauri::command]
fn check_caps_lock() -> bool {
    automation::is_caps_lock_on()
}

#[tauri::command]
fn execute_login(
    state: State<'_, AppState>,
    account_index: usize,
    switch_delay: u64,
    login_delay: u64,
) -> Result<LoginResult, String> {
    let (acc, path) = {
        let guard = state
            .storage
            .data
            .lock()
            .map_err(|_| "Failed to lock storage")?;
        let acc = guard
            .accounts
            .get(account_index)
            .cloned()
            .ok_or_else(|| "Selected account not found".to_string())?;
        (acc, guard.launcher_path.clone())
    };

    if path.is_empty() {
        return Err("nikke_launcher.exe path is not configured".into());
    }

    automation::launch_nikke_process(&path)?;
    automation::perform_login_sequence(&acc.email, &acc.password, switch_delay, login_delay)?;

    if let Ok(mut guard) = state.storage.data.lock() {
        guard.history.push(HistoryLog {
            account: acc.nickname.clone(),
            event_type: "Account Login".to_string(),
            is_success: "True".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        });
    }
    state.storage.save();

    Ok(LoginResult {
        success: true,
        message: format!("Logged in as {}", acc.nickname),
    })
}

#[tauri::command]
fn update_discord_rpc(
    app_state: State<'_, AppState>,
    details: String,
    state: String,
    small_image_key: Option<String>,
    small_image_text: Option<String>,
) {
    app_state.rpc.update(
        &details,
        &state,
        small_image_key.as_deref(),
        small_image_text.as_deref(),
    );
}

#[tauri::command]
fn get_history_logs(state: State<'_, AppState>) -> Vec<HistoryLog> {
    if let Ok(guard) = state.storage.data.lock() {
        return guard.history.clone();
    }
    Vec::new()
}

#[tauri::command]
fn add_history_log(
    state: State<'_, AppState>,
    account: String,
    event_type: String,
    is_success: String,
) {
    if let Ok(mut guard) = state.storage.data.lock() {
        guard.history.push(HistoryLog {
            account,
            event_type,
            is_success,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        });
    }
    state.storage.save();
}

#[tauri::command]
fn get_openrouter_config(state: State<'_, AppState>) -> OpenRouterConfig {
    if let Ok(guard) = state.storage.data.lock() {
        return guard.openrouter.clone();
    }
    OpenRouterConfig::default()
}

#[tauri::command]
fn save_openrouter_config(
    state: State<'_, AppState>,
    api_key: String,
    model: String,
) -> Result<(), String> {
    if let Ok(mut guard) = state.storage.data.lock() {
        guard.openrouter = OpenRouterConfig { api_key, model };
    }
    state.storage.save();
    Ok(())
}

#[tauri::command]
fn close_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.close();
    }
}

#[tauri::command]
fn minimize_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.minimize();
    }
}

#[tauri::command]
fn toggle_maximize_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if let Ok(is_max) = win.is_maximized() {
            if is_max {
                let _ = win.unmaximize();
            } else {
                let _ = win.maximize();
            }
        }
    }
}

#[tauri::command]
fn purge_data(state: State<'_, AppState>) -> Result<(), String> {
    if let Ok(mut guard) = state.storage.data.lock() {
        guard.accounts.clear();
        guard.launcher_path.clear();
        guard.history.clear();
    }
    state.storage.save();
    Ok(())
}

#[cfg(rust_analyzer)]
macro_rules! get_tauri_context {
    () => {
        tauri::Context::default()
    };
}

#[cfg(not(rust_analyzer))]
macro_rules! get_tauri_context {
    () => {
        tauri::generate_context!()
    };
}

#[tauri::command]
fn confirm_dialog(title: String, message: String) -> bool {
    #[cfg(windows)]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use windows::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONWARNING, MB_OKCANCEL, IDOK};

        let title_w: Vec<u16> = OsStr::new(&title).encode_wide().chain(std::iter::once(0)).collect();
        let msg_w: Vec<u16> = OsStr::new(&message).encode_wide().chain(std::iter::once(0)).collect();

        unsafe {
            let res = MessageBoxW(
                None,
                windows::core::PCWSTR(msg_w.as_ptr()),
                windows::core::PCWSTR(title_w.as_ptr()),
                MB_OKCANCEL | MB_ICONWARNING,
            );
            res == IDOK
        }
    }
    #[cfg(not(windows))]
    {
        true
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let storage = Arc::new(StorageManager::new(app.handle()));
            let rpc = Arc::new(DiscordRpcState::new());
            app.manage(AppState { storage, rpc });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_launcher_path,
            select_launcher_path,
            get_accounts,
            register_accounts,
            remove_account,
            execute_login,
            check_caps_lock,
            update_discord_rpc,
            get_history_logs,
            add_history_log,
            purge_data,
            get_openrouter_config,
            save_openrouter_config,
            close_window,
            minimize_window,
            toggle_maximize_window,
            confirm_dialog
        ])
        .run(get_tauri_context!())
        .expect("error while running tauri application");
}
