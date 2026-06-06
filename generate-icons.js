/**
 * Génère les icônes PNG pour la PWA depuis l'icône SVG.
 * Prérequis : npm install sharp (une seule fois, en devDependency)
 * Utilisation : node generate-icons.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, 'public', 'icons');

const SIZES = [192, 512];

async function main() {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.error('⚠  sharp non installé. Lance : npm install --save-dev sharp');
    console.error('   puis relance : node generate-icons.js');
    process.exit(1);
  }

  mkdirSync(ICONS_DIR, { recursive: true });
  const svg = readFileSync(join(ICONS_DIR, 'icon.svg'));

  for (const size of SIZES) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(ICONS_DIR, `icon-${size}.png`));
    console.log(`✓ icon-${size}.png`);
  }

  console.log('✓ Icônes PWA générées dans public/icons/');
}

main().catch(console.error);
