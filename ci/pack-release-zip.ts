/// <reference types="node" />

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist", "nikkepwned");
const zipPath = path.join(projectRoot, "dist", "nikkepwned-release.zip");

if (!fs.existsSync(distDir)) {
  throw new Error(`Release directory not found: ${distDir}`);
}

const psDist = distDir.replace(/\\/g, "/");
const psZip = zipPath.replace(/\\/g, "/");
const psScript =
  `if (Test-Path '${psZip}') { Remove-Item '${psZip}' -Force }; ` +
  `Compress-Archive -Path '${psDist}/*' -DestinationPath '${psZip}' -Force`;

const candidates = process.platform === "win32"
  ? ["powershell.exe", "powershell"]
  : ["pwsh", "powershell"];

let packed = false;
for (const shell of candidates) {
  const result = spawnSync(shell, ["-NoProfile", "-Command", psScript], {
    stdio: "inherit",
  });
  if (result.status === 0) {
    packed = true;
    break;
  }
}

if (!packed) {
  throw new Error(
    "Failed to pack release zip. Neither PowerShell nor pwsh was available.",
  );
}

if (!fs.existsSync(zipPath)) {
  throw new Error(`Expected release zip was not created: ${zipPath}`);
}

console.log(`Packed release zip: ${zipPath}`);
