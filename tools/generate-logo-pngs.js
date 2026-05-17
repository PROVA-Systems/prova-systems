#!/usr/bin/env node
/*
 * PROVA Systems — Logo-PNG-Generator (MEGA⁸⁸-A Block A)
 * ════════════════════════════════════════════════════════════════════
 * Generiert die 4 PNG-Varianten + favicon.ico aus img/logo-icon-only.svg:
 *   - img/logo-icon-32.png   (Favicon-Standard)
 *   - img/logo-icon-192.png  (PWA Android)
 *   - img/logo-icon-512.png  (Apple-Touch + Authenticator-Display)
 *   - img/favicon.ico        (Multi-Size 16/32/48)
 *
 * Voraussetzung (einmalig):
 *   npm install --no-save sharp png-to-ico
 *
 * Ausführen:
 *   node tools/generate-logo-pngs.js
 *
 * Output landet direkt in img/ — danach commit + push.
 * ════════════════════════════════════════════════════════════════════
 */

const path = require('path');
const fs = require('fs');

let sharp, pngToIco;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ sharp fehlt. Bitte einmalig installieren:\n   npm install --no-save sharp png-to-ico\n');
  process.exit(1);
}
try {
  pngToIco = require('png-to-ico');
} catch (e) {
  console.warn('⚠ png-to-ico fehlt — favicon.ico wird übersprungen. Bitte: npm install --no-save png-to-ico');
}

const IMG_DIR = path.join(__dirname, '..', 'img');
const SVG_SRC = path.join(IMG_DIR, 'logo-icon-only.svg');

if (!fs.existsSync(SVG_SRC)) {
  console.error('❌ Source nicht gefunden:', SVG_SRC);
  process.exit(1);
}

const svgBuffer = fs.readFileSync(SVG_SRC);

async function gen(size, name) {
  const outPath = path.join(IMG_DIR, name);
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  const stats = fs.statSync(outPath);
  console.log(`✓ ${name} (${size}×${size}, ${Math.round(stats.size / 1024)}kb)`);
}

async function main() {
  console.log('📦 PROVA Logo-PNG-Generation');
  console.log('Source:', SVG_SRC);
  console.log('Target:', IMG_DIR);
  console.log('');

  await gen(32, 'logo-icon-32.png');
  await gen(192, 'logo-icon-192.png');
  await gen(512, 'logo-icon-512.png');
  // Maskable (PWA, mit Padding für sichere Zone)
  await sharp(svgBuffer, { density: 384 })
    .resize(410, 410, { fit: 'contain', background: { r: 26, g: 58, b: 107, alpha: 1 } })
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 26, g: 58, b: 107, alpha: 1 } })
    .png()
    .toFile(path.join(IMG_DIR, 'logo-icon-512-maskable.png'));
  console.log('✓ logo-icon-512-maskable.png (512×512, mit Navy-Padding für PWA maskable-Purpose)');

  if (pngToIco) {
    const buf16 = await sharp(svgBuffer, { density: 384 }).resize(16, 16).png().toBuffer();
    const buf32 = await sharp(svgBuffer, { density: 384 }).resize(32, 32).png().toBuffer();
    const buf48 = await sharp(svgBuffer, { density: 384 }).resize(48, 48).png().toBuffer();
    const ico = await pngToIco([buf16, buf32, buf48]);
    fs.writeFileSync(path.join(IMG_DIR, 'favicon.ico'), ico);
    console.log('✓ favicon.ico (16+32+48 multi-size)');
  }

  console.log('\n✅ Fertig. Jetzt:  git add img/ && git commit -m "MEGA88-A PNG-Assets"');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
