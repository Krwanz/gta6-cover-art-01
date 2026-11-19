// Neon Coast Cover Studio v2 — entry program (Node 22, standard library only).
//
// Hands the app in: copies this repository's app/ and screenshots/ into the
// output directory, then writes /output/dossier.json with the vendored
// make.fun library (vendor/makefun-app.ts, the kit's copy, unchanged).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: the same repository always writes the same
// bytes, so the grader's two runs agree byte for byte.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Count a directory tree's entries (files and folders together).
function treeSize(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    n += 1;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) n += treeSize(path);
  }
  return n;
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });

mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The gate's caps (reference/gate.json): app/ at most 993 entries and
// 48 MiB, screenshots at most 4 files of 256 KiB, the dossier at most
// 1.5 MiB with its text at most 160 KiB. The whole of /output shares the
// platform's 1,000-entry and 64 MiB caps, so count before writing.
const appCount = treeSize(join(outDir, 'app'));
const shotCount = treeSize(join(outDir, 'screenshots'));
if (appCount > 993) throw new Error(`app/ holds ${appCount} entries, over the 993 cap`);
if (shotCount > 4) throw new Error(`screenshots/ holds ${shotCount} files, over the 4 cap`);

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Coast Cover Studio v2 handed in: app/ (${appCount} entries), screenshots/ (${shotCount} files), dossier.json`);
