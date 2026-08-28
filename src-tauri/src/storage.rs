use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    #[serde(default)]
    pub nickname: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryLog {
    #[serde(alias = "accountWhat", default)]
    pub account: String,
    #[serde(alias = "typeWhat", alias = "event_type", rename = "eventType", default)]
    pub event_type: String,
    #[serde(alias = "is_success", rename = "isSuccess", default)]
    pub is_success: String,
    #[serde(alias = "dateWhat", default)]
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OpenRouterConfig {
    #[serde(rename = "apiKey", alias = "api_key", default)]
    pub api_key: String,
    #[serde(default)]
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppStore {
    #[serde(default)]
    pub accounts: Vec<Account>,
    #[serde(rename = "launcher_path", alias = "launcherPath", default)]
    pub launcher_path: String,
    #[serde(default)]
    pub history: Vec<HistoryLog>,
    #[serde(default)]
    pub openrouter: OpenRouterConfig,
}

pub struct StorageManager {
    store_path: PathBuf,
    pub data: Mutex<AppStore>,
}

impl StorageManager {
    pub fn new(app: &AppHandle) -> Self {
        let app_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        let _ = fs::create_dir_all(&app_dir);
        let store_path = app_dir.join("nikkepwned_data.json");

        let data: AppStore = if store_path.exists() {
            if let Ok(content) = fs::read_to_string(&store_path) {
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                AppStore::default()
            }
        } else {
            AppStore::default()
        };

        Self {
            store_path,
            data: Mutex::new(data),
        }
    }

    pub fn save(&self) {
        if let Ok(guard) = self.data.lock() {
            if let Ok(json) = serde_json::to_string_pretty(&*guard) {
                let _ = fs::write(&self.store_path, json);
            }
        }
    }
}
