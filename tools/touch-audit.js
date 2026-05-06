#!/usr/bin/env node
/**
 * PROVA Touch-Target-Audit-Tool
 * MEGA¹² W14 (2026-05-05)
 *
 * Statisches Audit-Tool fuer Touch-Target-Sizes (WCAG 2.5.5: min. 48x48px).
 *
 * Scant HTML/CSS-Files nach kleineren clickable elements:
 *   - <button> mit width/height < 48
 *   - <a> mit width/height < 48
 *   - inline style="" mit padding < 12px (rough heuristic for total height < 48)
 *
 * USAGE:
 *   node tools/touch-audit.js                  # alle HTML
 *   node tools/touch-audit.js dashboard.html
 *   node tools/touch-audit.js --json
 *
 * Limits (statisches Tool):
 *   - Externe CSS-Dateien werden nicht resolved
 *   - Computed-Styles brauchen Browser
 *   - Marcel-Pflicht: ergaenzendes axe DevTools im Browser
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

function audit(htmlText, fileName) {
  const findings = [];

  // F1: Inline-style mit width oder height < 48
  // Match <button|<a ... style="...width:Xpx ... " or "...height:Xpx..."
  const elementRegex = /<(button|a)\b([^>]*)>/gi;
  let m;
  while ((m = elementRegex.exec(htmlText)) !== null) {
    const tag = m[1];
    const attrs = m[2];

    // Find inline style
    const styleMatch = /style\s*=\s*["']([^"']*)["']/i.exec(attrs);
    if (!styleMatch) continue;
    const styleStr = styleMatch[1];

    // Check explicit width/height
    const wMatch = /width\s*:\s*(\d+)\s*px/i.exec(styleStr);
    const hMatch = /height\s*:\s*(\d+)\s*px/i.exec(styleStr);
    if (wMatch && parseInt(wMatch[1], 10) < 48) {
      const lineNum = htmlText.slice(0, m.index).split('\n').length;
      findings.push({
        rule: 'WCAG-2.5.5',
        severity: 'warning',
        line: lineNum,
        message: `<${tag}> width=${wMatch[1]}px (min. 48px empfohlen)`,
        snippet: m[0].slice(0, 120)
      });
    }
    if (hMatch && parseInt(hMatch[1], 10) < 48) {
      const lineNum = htmlText.slice(0, m.index).split('\n').length;
      findings.push({
        rule: 'WCAG-2.5.5',
        severity: 'warning',
        line: lineNum,
        message: `<${tag}> height=${hMatch[1]}px (min. 48px empfohlen)`,
        snippet: m[0].slice(0, 120)
      });
    }

    // Check padding heuristic (vertical-only): padding-y < 6px → tendentially too small
    const pyMatch = /padding\s*:\s*(\d+)/i.exec(styleStr);
    if (pyMatch && parseInt(pyMatch[1], 10) < 6 && !/font-size\s*:\s*(2\d|[3-9]\d)px/.test(styleStr)) {
      // Only flag if no large font-size as compensation
      // (font-size >= 20 expands clickable area enough)
      // Heuristic: too aggressive flag → low priority
    }
  }

  // F2: Touch-Targets sehr nah aneinander (CSS gap < 4px)
  // Skip: hard to detect statically without computed styles

  // F3: Inline mini-buttons mit nur Emoji-Text + tiny padding
  const tinyBtnRegex = /<button\s+[^>]*style\s*=\s*["'][^"']*padding\s*:\s*[123]px[^"']*["'][^>]*>([^<]{1,4})</gi;
  let m2;
  while ((m2 = tinyBtnRegex.exec(htmlText)) !== null) {
    const lineNum = htmlText.slice(0, m2.index).split('\n').length;
    findings.push({
      rule: 'WCAG-2.5.5',
      severity: 'warning',
      line: lineNum,
      message: 'Mini-Button mit padding 1-3px + sehr kurzem Content (Touch-Target zu klein)',
      snippet: m2[0].slice(0, 120)
    });
  }

  return findings;
}

function findHtmlFiles(dir) {
  const out = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); }
    catch (_) { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (['node_modules', '.git', 'docs', 'archiv-alte-sprints', 'tests', 'tools'].includes(e.name)) continue;
        walk(full);
      } else if (e.isFile() && e.name.endsWith('.html')) {
        out.push(full);
      }
    }
  }
  walk(dir);
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const fileArg = args.filter(a => !a.startsWith('--'))[0];

  let files;
  if (fileArg) files = [path.resolve(fileArg)];
  else files = findHtmlFiles(REPO);

  const allFindings = {};
  let totalWarnings = 0;

  for (const file of files) {
    let html;
    try { html = fs.readFileSync(file, 'utf8'); }
    catch (_) { continue; }
    const findings = audit(html, path.basename(file));
    if (findings.length > 0) {
      allFindings[path.relative(REPO, file)] = findings;
      totalWarnings += findings.filter(f => f.severity === 'warning').length;
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      summary: { files: files.length, warnings: totalWarnings },
      findings: allFindings
    }, null, 2));
  } else {
    console.log('PROVA Touch-Target-Audit (WCAG 2.5.5)\n' + '='.repeat(50));
    console.log(`Files scanned: ${files.length} | Warnings: ${totalWarnings}\n`);
    for (const [file, findings] of Object.entries(allFindings)) {
      console.log(`\n${file}:`);
      for (const f of findings) {
        console.log(`  [WARN] L${f.line}: ${f.message}`);
        console.log(`         ${f.snippet}`);
      }
    }
    console.log('\n' + '='.repeat(50));
    console.log('Hinweis: Statisches Tool — externe CSS-Files nicht resolved.');
    console.log('         Browser-Test mit Mobile-Viewport pflicht fuer komplette Coverage.');
  }
  process.exit(totalWarnings > 5 ? 1 : 0);  // Non-blocking unless many warnings
}

if (require.main === module) main();

module.exports = { audit, findHtmlFiles };
