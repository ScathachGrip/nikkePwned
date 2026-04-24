/// <reference types="node" />

import fs from "fs";
import path from "path";
import rcedit from "rcedit";

type FileCandidate = {
  fullPath: string;
  mtimeMs: number;
};

function walkFiles(
  dir: string,
  matcher: (fullPath: string) => boolean,
  acc: FileCandidate[] = [],
): FileCandidate[] {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, matcher, acc);
      continue;
    }
    if (entry.isFile() && matcher(fullPath)) {
      const stat = fs.statSync(fullPath);
      acc.push({ fullPath, mtimeMs: stat.mtimeMs });
    }
  }
  return acc;
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const manifestPath = path.join(projectRoot, "admin.manifest");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("admin.manifest not found");
  }

  const distDir = path.join(projectRoot, "dist");
  const candidates = walkFiles(
    distDir,
    (fullPath) => fullPath.toLowerCase().endsWith("-win_x64.exe"),
  );

  if (!candidates.length) {
    throw new Error("Windows release exe not found in dist");
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const targetExe = candidates[0].fullPath;

  await rcedit(targetExe, {
    "application-manifest": manifestPath,
  });

  console.log(`Embedded requireAdministrator manifest into ${targetExe}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
