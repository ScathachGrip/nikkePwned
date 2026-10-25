//! BurstBonk module (Disarmed & Deprecated).
//!
//! In accordance with anti-cheat policies (prohibiting automated keystroke injection
//! and low-level keyboard hooks), all background hook loops and SendInput routines
//! have been safely decommissioned while preserving API stubs for UI stability.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

/// Interval between each key send in milliseconds (stored for settings persistence).
static SPAM_INTERVAL_MS: AtomicU64 = AtomicU64::new(3);

/// Whether humanized mode is enabled.
static HUMANIZED: AtomicBool = AtomicBool::new(false);

/// Master on/off flag (always false).
static BURSTBONK_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Handle to a BurstBonk session.
pub struct BurstBonkHandle;

/// Resolves a single-character key name (e.g. "A", "S", "1", "F") into a
/// Windows virtual-key code.
pub fn key_name_to_vk(name: &str) -> Option<u16> {
    let ch = name.trim().to_uppercase();
    if ch.len() != 1 {
        return None;
    }
    let c = ch.chars().next()?;
    match c {
        'A'..='Z' => Some(c as u16),
        '0'..='9' => Some(c as u16),
        _ => None,
    }
}

/// Start the BurstBonk system (disarmed).
#[allow(dead_code)]
pub fn start(_keys: &[String], _interval_ms: u64, _humanized: bool) -> Result<BurstBonkHandle, String> {
    Err("BurstBonk macro has been permanently deprecated and disabled in accordance with NIKKE Terms of Service (prohibiting third-party automation and keystroke injection).".into())
}

/// Update runtime settings for interval and humanized mode.
pub fn update_runtime_settings(interval_ms: u64, humanized: bool) {
    SPAM_INTERVAL_MS.store(interval_ms.max(1), Ordering::SeqCst);
    HUMANIZED.store(humanized, Ordering::SeqCst);
}

/// Public stop function (safe no-op).
pub fn stop() {
    BURSTBONK_ACTIVE.store(false, Ordering::SeqCst);
}

/// Returns whether the BurstBonk system is currently active (always false).
pub fn is_active() -> bool {
    BURSTBONK_ACTIVE.load(Ordering::SeqCst)
}
