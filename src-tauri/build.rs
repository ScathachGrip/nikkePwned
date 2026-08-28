fn main() {
    let win_attrs = tauri_build::WindowsAttributes::new().app_manifest(include_str!("admin.manifest"));
    let attrs = tauri_build::Attributes::new().windows_attributes(win_attrs);
    tauri_build::try_build(attrs).expect("failed to run tauri_build with admin manifest");
}
