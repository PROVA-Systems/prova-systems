#!/usr/bin/env node
/**
 * MEGA64 — Build-Script TipTap-Bundle
 * Output: lib/editor-tiptap-bundle.js (IIFE, exposes window.TipTapBundle)
 *
 * Run: node scripts/build-editor-bundle.js
 *      npm run build:editor
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { build } = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.join(ROOT, 'scripts', 'editor-bundle-entry.js');
const OUT = path.join(ROOT, 'lib', 'editor-tiptap-bundle.js');

async function main() {
  const t0 = Date.now();
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    format: 'iife',
    globalName: 'TipTapBundle',
    outfile: OUT,
    minify: true,
    sourcemap: false,
    target: ['es2020', 'safari14', 'chrome90', 'firefox88'],
    legalComments: 'inline',
    logLevel: 'info',
    metafile: true,
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  const stats = fs.statSync(OUT);
  const sizeKb = (stats.size / 1024).toFixed(1);
  const gzipKb = (require('zlib').gzipSync(fs.readFileSync(OUT)).length / 1024).toFixed(1);

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Bundle: ${OUT}`);
  console.log(`  Size:   ${sizeKb} KB raw / ${gzipKb} KB gzipped`);
  console.log(`  Build:  ${Date.now() - t0} ms`);
  console.log('═══════════════════════════════════════════════════════');

  if (parseFloat(gzipKb) > 350) {
    console.warn(`  ⚠  Bundle exceeds 350 KB gzipped budget!`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('Bundle build failed:', err);
  process.exit(1);
});
