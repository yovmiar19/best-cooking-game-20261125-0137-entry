// Sizzle & Serve: Warung Rush — entry hand-in program (Node 22, stdlib only).
// It stages the entry into /output (or MAKEFUN_OUTPUT_DIR outside the grader):
// copies game/ and screenshots/ from beside this file, then writes the
// dossier with the vendored make.fun library. Deterministic: two runs write
// the same bytes, because it only copies files and calls buildDossier with
// the same caps the gate uses.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function stageDirectory(sourceName) {
  const source = join(repoRoot, sourceName);
  const target = join(outputDir, sourceName);
  if (!existsSync(source)) return;
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
stageDirectory('game');
stageDirectory('screenshots');
const dossier = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`staged entry in ${outputDir} (${dossier.length} bytes of dossier)`);
