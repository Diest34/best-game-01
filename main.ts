// Neon Breaker — a best-game-01 entry (Node 22, standard library only). The game is this
// directory's game/ folder: plain static files a desktop browser loads offline
// (game/index.html and its ES modules, no library, no network request). This program
// hands it in: it checks the screenshots first, copies game/ and screenshots/ from
// beside this file to /output, and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one over
// 256 KiB; more than 993 files in game/ or 48 MiB of game files, in all, or a path
// under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const SCREENSHOT_MAX_BYTES = 262144;
const SCREENSHOT_MAX_COUNT = 4;
const SCREENSHOT_MIN_COUNT = 3;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

/** Whether the bytes open as a PNG or a JPEG: the two image kinds the scorer takes. */
function isImage(bytes) {
  const isPng = PNG_MAGIC.every((b, i) => bytes[i] === b);
  const isJpeg = JPEG_MAGIC.every((b, i) => bytes[i] === b);
  return isPng || isJpeg;
}

/**
 * Refuse early, with the file named, when a screenshot would make the scorer refuse
 * the entry: a missing screenshots/ folder, fewer than 3 or more than 4 images, a file
 * that is not a PNG or JPEG, or one over the byte cap.
 */
function checkScreenshots(dir) {
  if (!existsSync(dir)) throw new Error('screenshots/: no such directory: an entry hands in 3 or 4 PNG or JPEG renders');
  const names = readdirSync(dir).filter((n) => !n.startsWith('.')).sort();
  const images = names.filter((n) => /\.(png|jpe?g)$/i.test(n));
  if (images.length < SCREENSHOT_MIN_COUNT) throw new Error(`screenshots/: ${images.length} image(s), fewer than the ${SCREENSHOT_MIN_COUNT} an entry hands in`);
  if (images.length > SCREENSHOT_MAX_COUNT) throw new Error(`screenshots/: ${images.length} images, more than the ${SCREENSHOT_MAX_COUNT} allowed`);
  return images.map((name) => {
    const bytes = readFileSync(join(dir, name));
    if (!isImage(bytes)) throw new Error(`screenshots/${name}: not a PNG or JPEG file`);
    if (bytes.length > SCREENSHOT_MAX_BYTES) throw new Error(`screenshots/${name}: ${bytes.length} bytes, over the ${SCREENSHOT_MAX_BYTES} allowed`);
    return { name, bytes: bytes.length };
  });
}

const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html: no such file: a game is a directory of static files, its index.html at its root');
const shots = checkScreenshots(join(here, 'screenshots'));

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const gameFiles = readdirSync(gameDir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length;
const shotBytes = shots.reduce((total, s) => total + s.bytes, 0);
console.log(`Neon Breaker: ${gameFiles} game files, ${shots.length} screenshots (${shotBytes} bytes), dossier ${dossier.length} bytes -> ${out}`);
