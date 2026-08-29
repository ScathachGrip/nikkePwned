use std::fs;
use std::path::Path;

fn main() {
    // Ensure the frontend dist directory exists so tauri::generate_context!() doesn't panic
    let dist_dir = Path::new("../dist");
    if !dist_dir.exists() {
        let _ = fs::create_dir_all(dist_dir);
    }

    let win_attrs = tauri_build::WindowsAttributes::new().app_manifest(include_str!("admin.manifest"));
    let attrs = tauri_build::Attributes::new().windows_attributes(win_attrs);
    tauri_build::try_build(attrs).expect("failed to run tauri_build with admin manifest");
}
