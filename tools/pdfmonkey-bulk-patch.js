#!/usr/bin/env node
/*
 * PROVA Systems — PDFmonkey Bulk-Patch-Tool (MEGA-Marathon Phase 2.5)
 * ═══════════════════════════════════════════════════════════════════════
 * Patcht alle PROVA-PDFmonkey-Templates über REST-API mit:
 *   - gpt-4o → gpt-5.5 (KI-Modell-Naming-Updates)
 *   - Logo-Header (PROVA Systems SVG)
 *   - EU AI Act Art. 50 Disclosure-Box (nur KI-Templates F-04/F-09/F-15/F-19)
 *
 * Voraussetzung (einmalig):
 *   - PDFMONKEY_API_KEY env-var (Windows: $env:PDFMONKEY_API_KEY="..."; Mac/Linux: export ...)
 *   - Node.js 18+ (native fetch)
 *
 * Usage:
 *   node tools/pdfmonkey-bulk-patch.js --dry-run              Preview ohne Schreiben
 *   node tools/pdfmonkey-bulk-patch.js --execute              Echte Patches mit Backup
 *   node tools/pdfmonkey-bulk-patch.js --execute --only=F-09  Nur 1 Template
 *   node tools/pdfmonkey-bulk-patch.js --rollback=<dir>       Restore aus Backup-Dir
 *
 * Backups landen in tools/pdfmonkey-backups/<ISO-timestamp>/
 * ═══════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PDFMONKEY_API_KEY;
const API_BASE = 'https://api.pdfmonkey.io/api/v1';
const BACKUPS_ROOT = path.join(__dirname, 'pdfmonkey-backups');

// ── Patch-Definitionen (CC pflegt + erweitert) ──────────────────────────
const PATCHES = [
  {
    name: 'gpt-4o → gpt-5.5',
    regex: /\bgpt-4o(?!-mini|-realtime)\b/g,
    replacement: 'gpt-5.5',
    applyToAll: true
  },
  {
    name: 'gpt-4o-mini → gpt-5.5-instant',
    regex: /\bgpt-4o-mini\b/g,
    replacement: 'gpt-5.5-instant',
    applyToAll: true
  },
  {
    name: 'Logo-Header einfügen (MEGA88-A Master-SVG)',
    detect: /<!--\s*PROVA-LOGO-HEADER\s*-->/g,
    replacement: '<!-- PROVA-LOGO-HEADER -->\n<div class="prova-pdf-logo" style="margin-bottom:18px;">' +
                 '<img src="https://prova-systems.de/img/logo-prova-systems.svg" alt="PROVA Systems" style="height:42px;width:auto;">' +
                 '</div>',
    applyToAll: true
  },
  {
    name: 'EU AI Act Art. 50 Disclosure-Box',
    detect: /<!--\s*EU-AI-ACT-DISCLOSURE\s*-->/g,
    replacement: '<!-- EU-AI-ACT-DISCLOSURE -->\n<div class="prova-pdf-ai-disclosure" style="margin-top:14px;padding:10px 14px;border-left:3px solid #4f8ef7;background:#f5f7fb;font-size:11px;color:#374151;">' +
                 '<strong>Hinweis nach EU AI Act Art. 50 und § 407a ZPO:</strong> Teile dieses Dokuments wurden mit KI-Unterstützung erstellt. ' +
                 'Alle fachlichen Schlussfolgerungen und Bewertungen wurden vom Sachverständigen persönlich vorgenommen und vor Ausstellung des Gutachtens überprüft.' +
                 '</div>',
    applyToKiTemplates: true
  }
];

const KI_TEMPLATE_PREFIXES = ['F-04', 'F-09', 'F-15', 'F-19', 'KI-'];

// ── HTTP-Helper ─────────────────────────────────────────────────────────
async function api(method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`PDFmonkey API ${method} ${endpoint}: ${res.status} — ${txt.slice(0, 240)}`);
  }
  return res.json();
}

async function listTemplates() {
  let all = [], page = 1;
  // Try common pagination — PDFmonkey nutzt "document_templates" oder "templates"
  while (true) {
    let data;
    try {
      data = await api('GET', `/document_templates?page=${page}&per_page=100`);
    } catch (e) {
      // Fallback: maybe API ist anders strukturiert
      console.warn(`⚠ Page ${page} fail — vielleicht ist API anders. Last error: ${e.message}`);
      break;
    }
    const rows = data.document_templates || data.templates || [];
    all = all.concat(rows);
    const totalPages = data.meta?.total_pages || data.total_pages || 1;
    if (page >= totalPages || rows.length === 0) break;
    page++;
  }
  return all;
}

async function getTemplate(id) {
  const data = await api('GET', `/document_templates/${id}`);
  return data.document_template || data.template;
}

async function patchTemplate(id, body) {
  return api('PATCH', `/document_templates/${id}`, { document_template: { body } });
}

// ── Patch-Engine ────────────────────────────────────────────────────────
function applyPatches(template) {
  let body = String(template.body || '');
  const changes = [];
  const identifier = template.identifier || template.name || '?';
  const isKi = KI_TEMPLATE_PREFIXES.some(p => identifier.startsWith(p));

  for (const p of PATCHES) {
    if (p.applyToKiTemplates && !isKi) continue;
    const pattern = p.regex || p.detect;
    if (!pattern) continue;
    const matches = body.match(pattern);
    if (matches && matches.length > 0) {
      body = body.replace(pattern, p.replacement);
      changes.push({ patch: p.name, count: matches.length });
    }
  }
  return { body, changes };
}

// ── Rollback ────────────────────────────────────────────────────────────
async function rollback(backupDir) {
  if (!backupDir || !fs.existsSync(backupDir)) {
    throw new Error(`Backup-Dir nicht gefunden: ${backupDir}`);
  }
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.html'));
  console.log(`\n♻ ROLLBACK aus ${backupDir} — ${files.length} Templates...`);
  const indexFile = path.join(backupDir, '_index.json');
  if (!fs.existsSync(indexFile)) {
    throw new Error(`Index-File fehlt: ${indexFile}`);
  }
  const idx = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  let restored = 0;
  for (const f of files) {
    const identifier = path.basename(f, '.html');
    const meta = idx[identifier];
    if (!meta) { console.warn(`  ⚠ Kein Index-Eintrag für ${identifier}, skip`); continue; }
    const originalBody = fs.readFileSync(path.join(backupDir, f), 'utf-8');
    try {
      await patchTemplate(meta.id, originalBody);
      console.log(`  ✓ ${identifier} restored`);
      restored++;
    } catch (e) {
      console.error(`  ❌ ${identifier} fail: ${e.message}`);
    }
  }
  console.log(`\n✅ Rollback fertig: ${restored}/${files.length} restored.`);
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  if (!API_KEY) {
    console.error('❌ PDFMONKEY_API_KEY env-var fehlt.');
    console.error('   Windows PowerShell: $env:PDFMONKEY_API_KEY = "your_key"');
    console.error('   Bash:                export PDFMONKEY_API_KEY="your_key"');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  const onlyMatch = args.find(a => a.startsWith('--only=') || a.startsWith('--only:'));
  const onlyTemplate = onlyMatch ? onlyMatch.split(/[=:]/)[1] : null;
  const rollbackMatch = args.find(a => a.startsWith('--rollback='));
  const rollbackDir = rollbackMatch ? rollbackMatch.split('=')[1] : null;

  if (rollbackDir) {
    return rollback(rollbackDir);
  }

  if (!dryRun && !execute) {
    console.error('❌ Bitte --dry-run ODER --execute angeben.');
    console.error('   Beispiel: node tools/pdfmonkey-bulk-patch.js --dry-run');
    process.exit(1);
  }

  console.log(`🔍 Hole Templates von PDFmonkey...`);
  let templates = await listTemplates();
  console.log(`✅ ${templates.length} Templates total gefunden.`);

  if (onlyTemplate) {
    templates = templates.filter(t => (t.identifier || t.name || '').includes(onlyTemplate));
    console.log(`🎯 Gefiltert auf "${onlyTemplate}" → ${templates.length} Templates.`);
  }

  let backupDir = null;
  if (execute) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    backupDir = path.join(BACKUPS_ROOT, ts);
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📦 Backup-Dir: ${backupDir}`);
  }

  const report = [];
  const indexEntries = {};
  let totalPatched = 0;

  for (const tmpl of templates) {
    const full = await getTemplate(tmpl.id);
    if (!full || !full.body) {
      report.push({ id: tmpl.identifier || tmpl.id, status: 'no_body', changes: [] });
      continue;
    }
    const { body: newBody, changes } = applyPatches(full);
    const ident = full.identifier || full.name || full.id;

    if (changes.length === 0) {
      report.push({ id: ident, status: 'no_changes', changes: [] });
      continue;
    }

    if (execute && backupDir) {
      // Backup original body + index
      const safeName = String(ident).replace(/[^a-zA-Z0-9_-]/g, '_');
      fs.writeFileSync(path.join(backupDir, `${safeName}.html`), full.body);
      indexEntries[safeName] = { id: full.id, identifier: ident, patched_at: new Date().toISOString() };
      // Apply
      try {
        await patchTemplate(full.id, newBody);
        totalPatched++;
        report.push({ id: ident, status: 'patched', changes: changes.map(c => `${c.patch} (${c.count}×)`).join(', ') });
      } catch (e) {
        report.push({ id: ident, status: 'error', changes: e.message.slice(0, 80) });
      }
    } else {
      report.push({ id: ident, status: 'preview', changes: changes.map(c => `${c.patch} (${c.count}×)`).join(', ') });
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${execute ? '✅ EXECUTE COMPLETE' : '🔍 DRY-RUN PREVIEW'}`);
  console.log(`${'='.repeat(70)}`);
  console.table(report);

  if (execute && backupDir) {
    fs.writeFileSync(path.join(backupDir, '_index.json'), JSON.stringify(indexEntries, null, 2));
    console.log(`\n📦 Backups + Index: ${backupDir}`);
    console.log(`📊 ${totalPatched} von ${templates.length} Templates gepatcht.`);
    console.log(`\n💡 Rollback: node tools/pdfmonkey-bulk-patch.js --rollback=${backupDir}`);
  } else {
    const wouldChange = report.filter(r => r.status === 'preview').length;
    console.log(`\n📊 ${wouldChange} von ${templates.length} Templates wuerden gepatcht.`);
    console.log(`💡 Wenn OK: gleicher Aufruf mit --execute statt --dry-run.`);
  }
}

main().catch(err => {
  console.error('\n❌ Fehler:', err.message);
  process.exit(1);
});
