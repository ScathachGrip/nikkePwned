#![allow(dead_code)]

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SystemInfo {
    pub is_admin: bool,
    pub motherboard: String,
}

pub fn check_is_admin() -> bool {
    #[cfg(windows)]
    {
        unsafe { windows::Win32::UI::Shell::IsUserAnAdmin().as_bool() }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

pub fn get_motherboard_info() -> String {
    "Win32 BaseBoard".to_string()
}
