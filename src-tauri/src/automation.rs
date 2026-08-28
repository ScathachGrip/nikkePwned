use std::process::Command;
use std::thread;
use std::time::Duration;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
    KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, VIRTUAL_KEY, VK_CAPITAL, VK_RETURN, VK_TAB,
};

pub fn is_caps_lock_on() -> bool {
    #[cfg(windows)]
    {
        unsafe { (GetKeyState(VK_CAPITAL.0 as i32) & 0x0001) != 0 }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

pub fn close_nikke_launcher() {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "nikke_launcher.exe"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
}

#[allow(dead_code)]
pub fn is_launcher_running() -> bool {
    #[cfg(windows)]
    {
        if let Ok(output) = Command::new("tasklist").creation_flags(CREATE_NO_WINDOW).output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            return stdout.contains("nikke_launcher.exe");
        }
    }
    false
}

pub fn launch_nikke_process(path: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("Launcher path is empty".into());
    }

    close_nikke_launcher();
    thread::sleep(Duration::from_millis(500));

    // Try standard spawn first with hidden console flag
    let mut cmd = Command::new(path);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if cmd.spawn().is_ok() {
        return Ok(());
    }

    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows::core::PCWSTR;
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        let verb: Vec<u16> = std::ffi::OsStr::new("runas").encode_wide().chain(std::iter::once(0)).collect();
        let file: Vec<u16> = std::ffi::OsStr::new(path).encode_wide().chain(std::iter::once(0)).collect();

        let result = unsafe {
            ShellExecuteW(
                None,
                PCWSTR(verb.as_ptr()),
                PCWSTR(file.as_ptr()),
                PCWSTR(std::ptr::null()),
                PCWSTR(std::ptr::null()),
                SW_SHOWNORMAL,
            )
        };

        if (result.0 as usize) <= 32 {
            return Err(format!("Failed to start process '{path}' (ShellExecute error code: {})", result.0 as usize));
        }

        Ok(())
    }
    #[cfg(not(windows))]
    {
        Err("Process launch is only supported on Windows".into())
    }
}

pub fn perform_login_sequence(
    email: &str,
    password: &str,
    switch_delay_sec: u64,
    login_delay_sec: u64,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        // Wait switch delay for launcher window to be active
        thread::sleep(Duration::from_secs(switch_delay_sec));
        thread::sleep(Duration::from_secs(login_delay_sec));

        // Inject sequence: TAB -> email -> TAB -> password -> ENTER
        send_virtual_key(VK_TAB);
        thread::sleep(Duration::from_millis(150));

        send_unicode_text(email);
        thread::sleep(Duration::from_millis(150));

        send_virtual_key(VK_TAB);
        thread::sleep(Duration::from_millis(150));

        send_unicode_text(password);
        thread::sleep(Duration::from_millis(150));

        send_virtual_key(VK_RETURN);
        thread::sleep(Duration::from_millis(200));

        Ok(())
    }
    #[cfg(not(windows))]
    {
        Err("Win32 key injection is only supported on Windows".into())
    }
}

#[cfg(windows)]
fn send_virtual_key(vk: VIRTUAL_KEY) {
    let inputs = [
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        },
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        },
    ];

    unsafe {
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(windows)]
fn send_unicode_text(text: &str) {
    for ch in text.encode_utf16() {
        let inputs = [
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(0),
                        wScan: ch,
                        dwFlags: KEYEVENTF_UNICODE,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VIRTUAL_KEY(0),
                        wScan: ch,
                        dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];

        unsafe {
            SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        }
        thread::sleep(Duration::from_millis(15));
    }
}
