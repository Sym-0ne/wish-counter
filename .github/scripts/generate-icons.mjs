#!/usr/bin/env node
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SVG_PATH  = join(__dirname, '../../public/icons/icon.svg');
const OUT_DIR   = join(__dirname, '../../public/icons');

const svg = readFileSync(SVG_PATH);

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png   = resvg.render().asPng();
  const out   = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`✓ icon-${size}.png (${png.byteLength} bytes)`);
}
