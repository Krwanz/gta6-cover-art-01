// Neon Coast Cover Studio — entry program (Node 22, standard library only).
//
// Hands the app in: copies this repository's app/ and screenshots/ to the
// output directory and writes /output/dossier.json with the vendored make.fun
// library (vendor/makefun-app.ts, the kit's copy, unchanged).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: the same repository always writes the same
// bytes, so the grader's two runs match.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countEntries(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    total += 1;
    if (statSync(path).isDirectory()) total += countEntries(path);
  }
  return total;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): app/ at most 993 files and
// directories and 48 MiB in all, screenshots at most 4 files of 256 KiB, the
// dossier at most 1.5 MiB with its text at most 160 KiB. The whole of /output
// shares the platform's 1,000-entry and 64 MiB caps, so count before writing.
const appEntries = countEntries(join(out, 'app'));
const shotEntries = countEntries(join(out, 'screenshots'));
if (appEntries > 993) throw new Error(`app/ holds ${appEntries} entries, over the 993 cap`);
if (shotEntries > 4) throw new Error(`screenshots/ holds ${shotEntries} files, over the 4 cap`);

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Coast Cover Studio handed in: app/ (${appEntries} entries), screenshots/ (${shotEntries} files), dossier.json`);
