// Generates icon-192.png and icon-512.png from public/logo.svg
// Run: node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

async function generateIcons() {
  // Dynamic import — sharp is an optional devDep
  const sharp = (await import('sharp')).default;
  const svgBuf = readFileSync(join(root, 'public', 'logo.svg'));

  for (const size of [192, 512]) {
    const outPath = join(root, 'public', `icon-${size}.png`);
    await sharp(svgBuf).resize(size, size).png().toFile(outPath);
    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(err => { console.error(err); process.exit(1); });
