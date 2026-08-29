import fs from "node:fs";
import path from "node:path";

function bumpVersion(currentVersion: string): string {
  const parts = currentVersion.split(".").map((v) => parseInt(v, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: "${currentVersion}"`);
  }
  let [major, minor, patch] = parts;
  patch += 1;
  if (patch > 99) {
    patch = 0;
    minor += 1;
  }
  if (minor > 99) {
    minor = 0;
    major += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function main(): void {
  const rootDir = process.cwd();

  // 1. Read current version from package.json
  const pkgPath = path.resolve(rootDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error(`Error: package.json not found at ${pkgPath}`);
    process.exit(1);
  }

  const pkgStr = fs.readFileSync(pkgPath, "utf-8");
  const pkgJson = JSON.parse(pkgStr);
  const currentVersion: string = pkgJson.version;

  // 2. Determine target version (from CLI argument or auto-bump)
  const argVersion = process.argv[2];
  const newVersion = argVersion ? argVersion.trim() : bumpVersion(currentVersion);

  console.log(`🚀 Bumping version: ${currentVersion} -> ${newVersion}\n`);

  // Update package.json
  const newPkgStr = pkgStr.replace(
    /"version"\s*:\s*"[^"]+"/,
    `"version": "${newVersion}"`
  );
  fs.writeFileSync(pkgPath, newPkgStr, "utf-8");
  console.log(`✅ Updated package.json -> ${newVersion}`);

  // Update src-tauri/Cargo.toml
  const cargoTomlPath = path.resolve(rootDir, "src-tauri/Cargo.toml");
  if (fs.existsSync(cargoTomlPath)) {
    let cargoTomlStr = fs.readFileSync(cargoTomlPath, "utf-8");
    cargoTomlStr = cargoTomlStr.replace(
      /(^version\s*=\s*)"[^"]+"/m,
      `$1"${newVersion}"`
    );
    fs.writeFileSync(cargoTomlPath, cargoTomlStr, "utf-8");
    console.log(`✅ Updated src-tauri/Cargo.toml -> ${newVersion}`);
  }

  // Update src-tauri/Cargo.lock
  const cargoLockPath = path.resolve(rootDir, "src-tauri/Cargo.lock");
  if (fs.existsSync(cargoLockPath)) {
    let cargoLockStr = fs.readFileSync(cargoLockPath, "utf-8");
    cargoLockStr = cargoLockStr.replace(
      /(name\s*=\s*"nikkepwned"\s*\nversion\s*=\s*)"[^"]+"/,
      `$1"${newVersion}"`
    );
    fs.writeFileSync(cargoLockPath, cargoLockStr, "utf-8");
    console.log(`✅ Updated src-tauri/Cargo.lock -> ${newVersion}`);
  }

  // Update src-tauri/tauri.conf.json
  const tauriConfPath = path.resolve(rootDir, "src-tauri/tauri.conf.json");
  if (fs.existsSync(tauriConfPath)) {
    let tauriConfStr = fs.readFileSync(tauriConfPath, "utf-8");
    tauriConfStr = tauriConfStr.replace(
      /"version"\s*:\s*"[^"]+"/,
      `"version": "${newVersion}"`
    );
    fs.writeFileSync(tauriConfPath, tauriConfStr, "utf-8");
    console.log(`✅ Updated src-tauri/tauri.conf.json -> ${newVersion}`);
  }

  // Update src-tauri/src/rpc.rs
  const rpcPath = path.resolve(rootDir, "src-tauri/src/rpc.rs");
  if (fs.existsSync(rpcPath)) {
    let rpcStr = fs.readFileSync(rpcPath, "utf-8");
    rpcStr = rpcStr.replace(
      /\.large_text\("v[^"]+"\)/,
      `.large_text("v${newVersion}")`
    );
    fs.writeFileSync(rpcPath, rpcStr, "utf-8");
    console.log(`✅ Updated src-tauri/src/rpc.rs -> v${newVersion}`);
  }

  console.log(`\nchore(release, cargo): bump manifest to ${newVersion}`);
}

main();
