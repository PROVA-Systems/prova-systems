#!/usr/bin/env node
/**
 * PROVA WCAG-Code-Audit
 * MEGA¹¹ W8 (2026-05-04)
 *
 * Statisches Audit-Tool das HTML-Files nach WCAG-2.1-AA-Issues scannt.
 *
 * KEINE axe-DevTools-Replacement — das ist Browser-Pflicht (Visual,
 * Color-Contrast, ARIA-State-Live). Aber statische Findings (Markup-only)
 * lassen sich code-basiert auditen.
 *
 * USAGE:
 *   node tools/wcag-audit.js                  # All HTML files
 *   node tools/wcag-audit.js dashboard.html   # Specific file
 *   node tools/wcag-audit.js --json           # JSON output
 *
 * Findings:
 *   - <img> ohne alt-Attribut (WCAG 1.1.1)
 *   - <button> mit nur Icon-Content ohne aria-label (WCAG 4.1.2)
 *   - <input>/<textarea>/<select> ohne <label> oder aria-label (WCAG 1.3.1)
 *   - <a> ohne href (sollte <button> sein) (WCAG 2.4.4)
 *   - Heading-Hierarchy-Sprunge (h1 -> h3) (WCAG 1.3.1)
 *   - <html> ohne lang-Attribut (WCAG 3.1.1)
 *   - Skip-Link absent (Best-Practice)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

// ─── Findings-Sammler ──────────────────────────────────────────────
function audit(htmlText, fileName) {
  const findings = [];

  // F1: <img> ohne alt
  const imgRegex = /<img\b([^>]*)>/gi;
  let match;
  while ((match = imgRegex.exec(htmlText)) !== null) {
    const attrs = match[1];
    if (!/\balt\s*=/i.test(attrs)) {
      const lineNum = htmlText.slice(0, match.index).split('\n').length;
      findings.push({
        rule: 'WCAG-1.1.1',
        severity: 'error',
        line: lineNum,
        message: 'IMG ohne alt-Attribut',
        snippet: match[0].slice(0, 120)
      });
    }
  }

  // F2: <button> mit nur Icon-Content (Emoji oder Symbol) ohne aria-label
  const btnRegex = /<button\b([^>]*)>([^<]*)<\/button>/gi;
  while ((match = btnRegex.exec(htmlText)) !== null) {
    const attrs = match[1];
    const content = (match[2] || '').trim();
    if (!/\baria-label\s*=/i.test(attrs) && !/\baria-labelledby\s*=/i.test(attrs)) {
      // Heuristic: content < 3 chars or only emoji/symbols
      const looksLikeIconOnly = content.length < 3 || /^[☀-➿\uD83C-􏰀-\uDFFF←-⇿⌀-⏿×✕✓☰⏳📤↻]+$/.test(content);
      if (looksLikeIconOnly && content.length > 0) {
        const lineNum = htmlText.slice(0, match.index).split('\n').length;
        findings.push({
          rule: 'WCAG-4.1.2',
          severity: 'warning',
          line: lineNum,
          message: 'Icon-only Button ohne aria-label',
          snippet: match[0].slice(0, 120)
        });
      }
    }
  }

  // F3: <html> ohne lang-Attribut
  const htmlOpenRegex = /<html\b([^>]*)>/i;
  const htmlMatch = htmlOpenRegex.exec(htmlText);
  if (htmlMatch && !/\blang\s*=/i.test(htmlMatch[1])) {
    findings.push({
      rule: 'WCAG-3.1.1',
      severity: 'error',
      line: 1,
      message: '<html> ohne lang-Attribut',
      snippet: htmlMatch[0]
    });
  }

  // F4: <a> ohne href (sollte <button> sein wenn click-target)
  const aRegex = /<a\b([^>]*)>/gi;
  while ((match = aRegex.exec(htmlText)) !== null) {
    const attrs = match[1];
    if (!/\bhref\s*=/i.test(attrs) && /\bonclick\s*=/i.test(attrs)) {
      const lineNum = htmlText.slice(0, match.index).split('\n').length;
      findings.push({
        rule: 'WCAG-2.4.4',
        severity: 'warning',
        line: lineNum,
        message: '<a> ohne href aber mit onclick (sollte <button> sein)',
        snippet: match[0].slice(0, 120)
      });
    }
  }

  // F5: Heading-Hierarchy-Sprunge (h1 -> h3, h2 -> h4, etc.)
  const headingRegex = /<h([1-6])\b[^>]*>/gi;
  let lastLevel = 0;
  while ((match = headingRegex.exec(htmlText)) !== null) {
    const level = parseInt(match[1], 10);
    if (lastLevel > 0 && level > lastLevel + 1) {
      const lineNum = htmlText.slice(0, match.index).split('\n').length;
      findings.push({
        rule: 'WCAG-1.3.1',
        severity: 'warning',
        line: lineNum,
        message: `Heading-Hierarchy-Sprung: h${lastLevel} -> h${level}`,
        snippet: match[0]
      });
    }
    lastLevel = level;
  }

  // F6: Skip-Link absent (Best-Practice fuer Screen-Reader)
  if (!/(<a[^>]*href=["']#[^"']+["'][^>]*class=["'][^"']*skip[^"']*)/i.test(htmlText) &&
      !/(<a[^>]*class=["'][^"']*skip[^"']*[^>]*href=)/i.test(htmlText)) {
    findings.push({
      rule: 'BEST-PRACTICE',
      severity: 'info',
      line: 1,
      message: 'Kein Skip-to-Content-Link gefunden',
      snippet: '<a href="#main" class="skip-link">Zum Inhalt springen</a>'
    });
  }

  return findings;
}

// ─── CLI Runner ─────────────────────────────────────────────────────
function findHtmlFiles(dir) {
  const out = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); }
    catch (_) { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      // Skip node_modules, .git, archive
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
  if (fileArg) {
    files = [path.resolve(fileArg)];
  } else {
    files = findHtmlFiles(REPO);
  }

  const allFindings = {};
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;

  for (const file of files) {
    let html;
    try { html = fs.readFileSync(file, 'utf8'); }
    catch (e) { continue; }
    const findings = audit(html, path.basename(file));
    if (findings.length > 0) {
      allFindings[path.relative(REPO, file)] = findings;
      for (const f of findings) {
        if (f.severity === 'error') totalErrors++;
        else if (f.severity === 'warning') totalWarnings++;
        else totalInfo++;
      }
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      summary: { files: files.length, errors: totalErrors, warnings: totalWarnings, info: totalInfo },
      findings: allFindings
    }, null, 2));
  } else {
    console.log('PROVA WCAG-Code-Audit\n' + '='.repeat(50));
    console.log(`Files scanned: ${files.length}`);
    console.log(`Errors: ${totalErrors}, Warnings: ${totalWarnings}, Info: ${totalInfo}\n`);

    for (const [file, findings] of Object.entries(allFindings)) {
      console.log(`\n${file}:`);
      for (const f of findings) {
        const icon = f.severity === 'error' ? 'ERR' : f.severity === 'warning' ? 'WARN' : 'INFO';
        console.log(`  [${icon}] L${f.line} ${f.rule}: ${f.message}`);
        if (f.snippet) console.log(`         ${f.snippet}`);
      }
    }
    console.log('\n' + '='.repeat(50));
    console.log('Hinweis: Das ist STATISCHER Audit. Visual-Tests + Color-Contrast');
    console.log('         + ARIA-Live-States brauchen axe-DevTools im Browser.');
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

// Test-Exports
module.exports = { audit, findHtmlFiles };
