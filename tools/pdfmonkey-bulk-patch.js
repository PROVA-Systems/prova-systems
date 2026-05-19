#!/usr/bin/env node
/*
 * PROVA Systems — PDFmonkey Bulk-Patch-Tool v2 (MEGA-Marathon Phase 2.5b)
 * ═══════════════════════════════════════════════════════════════════════
 * Patcht PROVA-PDFmonkey-Templates via REST-API mit intelligenter Detection.
 *
 * Patches:
 *   - gpt-4o → gpt-5.5 (regex-basiert, idempotent)
 *   - gpt-4o-mini → gpt-5.5-instant
 *   - Logo-Header: Marker ODER Auto-Inject nach <body> (mit Detection vorhandener Logos)
 *   - EU AI Act Art. 50 Disclosure: Marker ODER Auto-Inject vor </body> (KI-Templates only)
 *   - CSS-Audit: Inter/JetBrains Mono OK, Source Serif/Helvetica/Arial/Montserrat → Flag
 *
 * Voraussetzung: PDFMONKEY_API_KEY env-var + Node 18+ (native fetch)
 *
 * Usage:
 *   --audit                          Nur Bericht (kein Schreiben), generiert AUDIT.md
 *   --dry-run                        Preview was gepatcht würde
 *   --execute                        Echte Patches mit Backup
 *   --execute --inject-logo          Logo-Auto-Inject auch ohne Marker erzwingen
 *   --execute --inject-eu-disclosure EU-Box-Auto-Inject auch ohne Marker erzwingen
 *   --execute --inject-all           Beide Auto-Inject (Shortcut für oben)
 *   --execute --dedupe-logos         Cleant mehrfache Logo-Blöcke (Phase 2.5c HOTFIX)
 *   --execute --dedupe-eu            Cleant mehrfache EU-Boxes
 *   --execute --dedupe-all           Beide Cleanups
 *   --execute --only=F-09            Filter auf 1 Template
 *   --rollback=<dir>                 Restore aus Backup-Dir
 *
 * Phase 2.5c HOTFIX (19.05.):
 *   - LOGO_HEADER_HTML enthält KEINEN Marker mehr → keine Multiplikation bei Re-Runs
 *   - Detection-Reihenfolge: hasLogo ZUERST (idempotent-skip), dann Marker, dann Auto-Inject
 *   - KI-Template-Detection via Token-IN-Name (statt Prefix) — erkennt "PROVA – F-09 – ..."
 *   - --dedupe-logos / --dedupe-eu cleant bestehende Duplikate aus Phase-2.5-Bug
 * ═══════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PDFMONKEY_API_KEY;
const API_BASE = 'https://api.pdfmonkey.io/api/v1';
const BACKUPS_ROOT = path.join(__dirname, 'pdfmonkey-backups');
const AUDIT_DIR = path.join(__dirname, '..', 'docs');

// ── Constants ───────────────────────────────────────────────────────────
// MEGA-Marathon Phase 2.5c HOTFIX: Identifier-Tokens (überall im Template-Namen, nicht nur Prefix)
const KI_TEMPLATE_TOKENS = ['F-04', 'F-09', 'F-10', 'F-11', 'F-12', 'F-13', 'F-14', 'F-15', 'F-16', 'F-17', 'F-18', 'F-19', 'KURZGUTACHTEN', 'GUTACHTEN', 'BEWEISSICHERUNG', 'WERTGUTACHTEN', 'GERICHTSGUTACHTEN', 'SCHIEDSGUTACHTEN', 'BAUMAENGEL', 'BRANDSCHADEN', 'ELEMENTARSCHADEN', 'FEUCHTE', 'SCHIMMEL', 'ERGAENZUNG', 'BAUABNAHME'];

// MEGA-Marathon Phase 2.5c HOTFIX: KEIN Marker mehr im Replacement-HTML
// (vorher: Marker enthalten → jeder Re-Run multiplizierte Block)
const LOGO_HEADER_HTML =
  '<div class="prova-pdf-logo" data-prova-component="logo-header" style="margin-bottom:18px;text-align:left;">' +
  '<img src="https://prova-systems.de/img/logo-prova-systems.svg" alt="PROVA Systems" style="height:42px;width:auto;">' +
  '</div>';

const EU_AI_ACT_BOX_HTML =
  '<div class="prova-pdf-ai-disclosure" data-prova-component="eu-ai-act" style="margin-top:14px;padding:10px 14px;border-left:3px solid #4f8ef7;background:#f5f7fb;font-size:11px;color:#374151;line-height:1.5;">' +
  '<strong>Hinweis nach EU AI Act Art. 50 und § 407a ZPO:</strong> Teile dieses Dokuments wurden mit KI-Unterstützung erstellt. ' +
  'Alle fachlichen Schlussfolgerungen und Bewertungen wurden vom Sachverständigen persönlich vorgenommen und vor Ausstellung des Gutachtens überprüft.' +
  '</div>';

// Detection-Regexes für „existiert schon"-Check (Skip-Heuristiken)
// Phase 2.5c: prova-pdf-logo-class + data-attribute werden auch erkannt (idempotenter Self-Check)
const LOGO_EXISTS_RE = /<img[^>]*src=["'][^"']*(prova-systems\.de\/img\/logo|logo-prova|logo[_-]?prova)|class=["'][^"']*prova-pdf-logo|data-prova-component=["']logo-header/i;
const EU_AI_ACT_EXISTS_RE = /(EU\s*AI\s*Act|EU-AI-Act|Art\.?\s*50|EU\s+AI-Verordnung|data-prova-component=["']eu-ai-act)/i;
const GPT_4O_RE = /\bgpt-4o(?!-mini|-realtime)\b/g;
const GPT_4O_MINI_RE = /\bgpt-4o-mini\b/g;

// Font-Audit-Regexes
const FONT_OK_RE = /font-family\s*:\s*[^;]*(['"]?Inter['"]?|['"]?JetBrains\s*Mono['"]?)/i;
const FONT_FLAG_RE = /font-family\s*:\s*[^;]*(['"]?Source\s*Serif|['"]?Helvetica|['"]?Arial(?!\s+Black)|['"]?Montserrat)/i;

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
  while (true) {
    let data;
    try { data = await api('GET', `/document_templates?page=${page}&per_page=100`); }
    catch (e) { console.warn(`⚠ Page ${page} fail — last error: ${e.message}`); break; }
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

async function patchTemplate(id, body, scssStyle) {
  const payload = { document_template: { body } };
  if (scssStyle !== undefined) payload.document_template.scss_style = scssStyle;
  return api('PATCH', `/document_templates/${id}`, payload);
}

// MEGA-Marathon Phase 2.5c: KI-Detection via Token-IN-Name (statt Prefix)
function isKiTemplate(identifier) {
  const up = String(identifier || '').toUpperCase();
  return KI_TEMPLATE_TOKENS.some(t => up.includes(t.toUpperCase()));
}

// ── Audit-Engine ────────────────────────────────────────────────────────
function auditTemplate(template) {
  const body = String(template.body || '');
  const scss = String(template.scss_style || template.style || '');
  const identifier = template.identifier || template.name || '?';
  const isKi = isKiTemplate(identifier);

  const hasLogo = LOGO_EXISTS_RE.test(body);
  const hasLogoMarker = /<!--\s*PROVA-LOGO-HEADER\s*-->/.test(body);
  const hasEuBox = EU_AI_ACT_EXISTS_RE.test(body);
  const hasEuMarker = /<!--\s*EU-AI-ACT-DISCLOSURE\s*-->/.test(body);
  const gpt4oCount = (body.match(GPT_4O_RE) || []).length + (body.match(GPT_4O_MINI_RE) || []).length;
  const fontOk = FONT_OK_RE.test(scss);
  const fontFlagged = scss ? (scss.match(FONT_FLAG_RE) || [])[1] || null : null;

  // Recommended actions
  const recs = [];
  if (!hasLogo && !hasLogoMarker) recs.push('inject-logo');
  if (isKi && !hasEuBox && !hasEuMarker) recs.push('inject-eu-disclosure');
  if (gpt4oCount > 0) recs.push(`gpt-4o-update (${gpt4oCount}×)`);
  if (fontFlagged) recs.push(`font-fix (${fontFlagged} → Inter)`);

  return {
    id: template.id,
    identifier,
    isKi,
    hasLogo,
    hasLogoMarker,
    hasEuBox,
    hasEuMarker,
    gpt4oCount,
    fontOk,
    fontFlagged,
    recs,
    bodyLength: body.length
  };
}

// ── Dedupe-Helper (Phase 2.5c) ──────────────────────────────────────────
// Cleant mehrfache Logo-/EU-Blöcke die durch frühere idempotenz-bugs entstanden sind.
// Erkennt: <div class="prova-pdf-logo"...>...</div> (mit oder ohne data-attribute)
// Pattern: matche ALL Logo-Blocks, behalte ersten, entferne Rest.
function dedupeBlocks(body, componentName) {
  // Greedy-Lazy-Match auf den ganzen div-Block. Vorsicht: muss vor allen Re-Patches laufen.
  const blockRe = new RegExp(
    '<div\\s+class=["\'][^"\']*prova-pdf-' + componentName + '[^"\']*["\'][^>]*>[\\s\\S]*?<\\/div>',
    'gi'
  );
  const matches = body.match(blockRe) || [];
  if (matches.length <= 1) return { body, removed: 0 };
  // Behalte den ersten, entferne alle weiteren
  let kept = false;
  const newBody = body.replace(blockRe, m => {
    if (!kept) { kept = true; return m; }
    return '';
  });
  return { body: newBody, removed: matches.length - 1 };
}

// ── Patch-Engine ────────────────────────────────────────────────────────
function applyPatches(template, opts) {
  let body = String(template.body || '');
  const changes = [];
  const skipped = [];
  const identifier = template.identifier || template.name || '?';
  const isKi = isKiTemplate(identifier);

  // 0. DEDUPE (Phase 2.5c HOTFIX) — laeuft NUR mit --dedupe-logos / --dedupe-eu / --dedupe-all
  if (opts.dedupeLogos || opts.dedupeAll) {
    const r = dedupeBlocks(body, 'logo');
    if (r.removed > 0) {
      body = r.body;
      changes.push({ patch: 'Dedupe Logo-Blöcke', count: r.removed });
    }
  }
  if (opts.dedupeEu || opts.dedupeAll) {
    const r = dedupeBlocks(body, 'ai-disclosure');
    if (r.removed > 0) {
      body = r.body;
      changes.push({ patch: 'Dedupe EU-Boxes', count: r.removed });
    }
  }

  // 1. gpt-4o-mini ZUERST (sonst greift gpt-4o auch in gpt-4o-mini)
  const miniMatches = body.match(GPT_4O_MINI_RE);
  if (miniMatches && miniMatches.length > 0) {
    body = body.replace(GPT_4O_MINI_RE, 'gpt-5.5-instant');
    changes.push({ patch: 'gpt-4o-mini → gpt-5.5-instant', count: miniMatches.length });
  }

  // 2. gpt-4o → gpt-5.5
  const goMatches = body.match(GPT_4O_RE);
  if (goMatches && goMatches.length > 0) {
    body = body.replace(GPT_4O_RE, 'gpt-5.5');
    changes.push({ patch: 'gpt-4o → gpt-5.5', count: goMatches.length });
  }

  // 3. Logo-Header — REIHENFOLGE FIX (Phase 2.5c): hasLogo ZUERST
  // Nach Dedupe nochmal frisch checken
  const hasLogo = LOGO_EXISTS_RE.test(body);
  const logoMarkerRe = /<!--\s*PROVA-LOGO-HEADER\s*-->/g;
  const hasLogoMarker = logoMarkerRe.test(body);
  if (hasLogo) {
    skipped.push('Logo already present (idempotent skip)');
  } else if (hasLogoMarker) {
    body = body.replace(logoMarkerRe, LOGO_HEADER_HTML);
    changes.push({ patch: 'Logo (Marker→Block)', count: 1 });
  } else if (opts.injectLogo) {
    const bodyOpenRe = /<body\b[^>]*>/i;
    if (bodyOpenRe.test(body)) {
      body = body.replace(bodyOpenRe, m => m + '\n' + LOGO_HEADER_HTML);
      changes.push({ patch: 'Logo (Auto-Inject nach <body>)', count: 1 });
    } else {
      body = LOGO_HEADER_HTML + '\n' + body;
      changes.push({ patch: 'Logo (Auto-Inject prepend, kein <body>)', count: 1 });
    }
  } else {
    skipped.push('Logo missing (use --inject-logo to force)');
  }

  // 4. EU AI Act Disclosure (nur KI-Templates) — REIHENFOLGE FIX: hasEuBox ZUERST
  if (isKi) {
    const hasEuBox = EU_AI_ACT_EXISTS_RE.test(body);
    const euMarkerRe = /<!--\s*EU-AI-ACT-DISCLOSURE\s*-->/g;
    const hasEuMarker = euMarkerRe.test(body);
    if (hasEuBox) {
      skipped.push('EU-AI-Act already present (idempotent skip)');
    } else if (hasEuMarker) {
      body = body.replace(euMarkerRe, EU_AI_ACT_BOX_HTML);
      changes.push({ patch: 'EU-AI-Act (Marker→Block)', count: 1 });
    } else if (opts.injectEuDisclosure) {
      const bodyCloseRe = /<\/body>/i;
      if (bodyCloseRe.test(body)) {
        body = body.replace(bodyCloseRe, '\n' + EU_AI_ACT_BOX_HTML + '\n</body>');
        changes.push({ patch: 'EU-AI-Act (Auto-Inject vor </body>)', count: 1 });
      } else {
        body = body + '\n' + EU_AI_ACT_BOX_HTML;
        changes.push({ patch: 'EU-AI-Act (Auto-Inject append)', count: 1 });
      }
    } else {
      skipped.push('EU-AI-Act missing (use --inject-eu-disclosure to force, KI-Template)');
    }
  }

  return { body, changes, skipped, isKi };
}

// ── Rollback ────────────────────────────────────────────────────────────
async function rollback(backupDir) {
  if (!backupDir || !fs.existsSync(backupDir)) throw new Error(`Backup-Dir nicht gefunden: ${backupDir}`);
  const indexFile = path.join(backupDir, '_index.json');
  if (!fs.existsSync(indexFile)) throw new Error(`Index-File fehlt: ${indexFile}`);
  const idx = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.html'));
  console.log(`\n♻ ROLLBACK aus ${backupDir} — ${files.length} Templates...`);
  let restored = 0;
  for (const f of files) {
    const safeName = path.basename(f, '.html');
    const meta = idx[safeName];
    if (!meta) { console.warn(`  ⚠ Kein Index-Eintrag für ${safeName}, skip`); continue; }
    const originalBody = fs.readFileSync(path.join(backupDir, f), 'utf-8');
    try {
      await patchTemplate(meta.id, originalBody);
      console.log(`  ✓ ${meta.identifier} restored`);
      restored++;
    } catch (e) { console.error(`  ❌ ${meta.identifier} fail: ${e.message}`); }
  }
  console.log(`\n✅ Rollback fertig: ${restored}/${files.length} restored.`);
}

// ── Audit-Mode (Bericht ohne Patch) ─────────────────────────────────────
async function runAudit(templates) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log('🔍 AUDIT-MODE — kein Schreiben, nur Analyse');
  console.log(`${'═'.repeat(70)}\n`);

  const audits = [];
  for (const tmpl of templates) {
    const full = await getTemplate(tmpl.id);
    if (!full) { audits.push({ identifier: tmpl.identifier || tmpl.id, status: 'no_body_or_404' }); continue; }
    audits.push(auditTemplate(full));
  }

  // Aggregate Stats
  const stats = {
    total: audits.length,
    withLogo: audits.filter(a => a.hasLogo).length,
    withEuBox: audits.filter(a => a.hasEuBox).length,
    withGpt4o: audits.filter(a => a.gpt4oCount > 0).length,
    fontOk: audits.filter(a => a.fontOk).length,
    fontFlagged: audits.filter(a => a.fontFlagged).length,
    kiTemplates: audits.filter(a => a.isKi).length,
    needsLogoInject: audits.filter(a => !a.hasLogo && !a.hasLogoMarker).length,
    needsEuInject: audits.filter(a => a.isKi && !a.hasEuBox && !a.hasEuMarker).length
  };

  // Markdown-Audit-File schreiben
  const ts = new Date().toISOString().slice(0, 10);
  const auditFile = path.join(AUDIT_DIR, `PDFMONKEY-TEMPLATE-AUDIT-${ts}.md`);
  let md = `# PDFmonkey-Template-Audit ${ts}\n\n`;
  md += `Generiert via \`tools/pdfmonkey-bulk-patch.js --audit\`\n\n`;
  md += `## Summary\n\n`;
  md += `- **${stats.total}** Templates total (davon **${stats.kiTemplates}** KI-Templates F-04/F-09/F-15/F-19/KI-*)\n`;
  md += `- **${stats.withLogo}** haben bereits Logo, **${stats.needsLogoInject}** brauchen Logo-Inject\n`;
  md += `- **${stats.withEuBox}** haben EU AI Act Erwähnung, **${stats.needsEuInject}** KI-Templates brauchen EU-Disclosure-Box\n`;
  md += `- **${stats.withGpt4o}** enthalten noch gpt-4o (sollte 0 sein nach Patch)\n`;
  md += `- **${stats.fontOk}** nutzen Inter/JetBrains Mono (Design-System v1.0 konform)\n`;
  md += `- **${stats.fontFlagged}** nutzen veraltete Fonts (Source Serif/Helvetica/Arial/Montserrat)\n\n`;

  md += `## Recommended Actions\n\n`;
  if (stats.needsLogoInject > 0) md += `- **Run** \`node tools/pdfmonkey-bulk-patch.js --execute --inject-logo\` to add logo to ${stats.needsLogoInject} Templates\n`;
  if (stats.needsEuInject > 0) md += `- **Run** \`node tools/pdfmonkey-bulk-patch.js --execute --inject-eu-disclosure\` to add EU-Box to ${stats.needsEuInject} KI-Templates\n`;
  if (stats.withGpt4o > 0) md += `- **Run** \`node tools/pdfmonkey-bulk-patch.js --execute\` to fix gpt-4o → gpt-5.5 in ${stats.withGpt4o} Templates\n`;
  if (stats.fontFlagged > 0) md += `- **Marcel-Manual:** ${stats.fontFlagged} Templates haben Source Serif/Helvetica/Arial/Montserrat im scss_style — manuell prüfen, ggf. auf Inter migrieren\n`;
  if (stats.needsLogoInject === 0 && stats.needsEuInject === 0 && stats.withGpt4o === 0) md += `- ✅ Keine Patches nötig — alle Templates konform.\n`;
  md += `\n`;

  md += `## Per-Template Detail\n\n`;
  md += `| Template | Type | Logo | EU-Box | gpt-4o | Font | Actions |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const a of audits) {
    const kiTag = a.isKi ? 'KI' : '-';
    const logoFlag = a.hasLogo ? '✓' : (a.hasLogoMarker ? '(M)' : '✗');
    const euFlag = a.isKi ? (a.hasEuBox ? '✓' : (a.hasEuMarker ? '(M)' : '✗')) : '—';
    const gptFlag = a.gpt4oCount > 0 ? `❗ ${a.gpt4oCount}×` : '✓';
    const fontFlag = a.fontFlagged ? `❗ ${a.fontFlagged}` : (a.fontOk ? '✓' : '?');
    md += `| ${a.identifier} | ${kiTag} | ${logoFlag} | ${euFlag} | ${gptFlag} | ${fontFlag} | ${a.recs.join(', ') || '✓ done'} |\n`;
  }

  md += `\n## Legende\n\n`;
  md += `- ✓ vorhanden / OK\n`;
  md += `- ✗ fehlt — Inject-Recommended\n`;
  md += `- (M) Marker vorhanden aber Block nicht expandiert\n`;
  md += `- — nicht relevant (Non-KI-Template)\n`;
  md += `- ❗ Patch erforderlich\n`;

  fs.writeFileSync(auditFile, md);

  // Console-Output
  console.table(audits.map(a => ({
    id: a.identifier,
    type: a.isKi ? 'KI' : '-',
    logo: a.hasLogo ? '✓' : (a.hasLogoMarker ? '(M)' : '✗'),
    eu: a.isKi ? (a.hasEuBox ? '✓' : (a.hasEuMarker ? '(M)' : '✗')) : '—',
    gpt4o: a.gpt4oCount,
    font: a.fontFlagged || (a.fontOk ? 'Inter ✓' : '?'),
    recs: a.recs.join(' / ') || 'done'
  })));

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 Summary:`);
  console.log(`   ${stats.total} Templates total (${stats.kiTemplates} KI)`);
  console.log(`   ${stats.needsLogoInject} brauchen Logo-Inject`);
  console.log(`   ${stats.needsEuInject} KI-Templates brauchen EU-Disclosure`);
  console.log(`   ${stats.withGpt4o} mit veralteten gpt-4o-Refs`);
  console.log(`   ${stats.fontFlagged} mit veralteten Fonts`);
  console.log(`\n📄 Detail-Report: ${auditFile}`);
  if (stats.needsLogoInject > 0 || stats.needsEuInject > 0 || stats.withGpt4o > 0) {
    console.log(`\n💡 Empfohlen:`);
    if (stats.needsLogoInject > 0) console.log(`   node tools/pdfmonkey-bulk-patch.js --execute --inject-logo`);
    if (stats.needsEuInject > 0)   console.log(`   node tools/pdfmonkey-bulk-patch.js --execute --inject-eu-disclosure`);
    if (stats.withGpt4o > 0)        console.log(`   node tools/pdfmonkey-bulk-patch.js --execute   # gpt-4o-Fix`);
  }
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
  const audit = args.includes('--audit');
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  const injectAll = args.includes('--inject-all');
  const injectLogo = injectAll || args.includes('--inject-logo');
  const injectEuDisclosure = injectAll || args.includes('--inject-eu-disclosure');
  // MEGA-Marathon Phase 2.5c HOTFIX: Dedupe-Cleanup-Flags
  const dedupeAll = args.includes('--dedupe-all');
  const dedupeLogos = dedupeAll || args.includes('--dedupe-logos');
  const dedupeEu = dedupeAll || args.includes('--dedupe-eu');
  const onlyMatch = args.find(a => a.startsWith('--only=') || a.startsWith('--only:'));
  const onlyTemplate = onlyMatch ? onlyMatch.split(/[=:]/)[1] : null;
  const rollbackMatch = args.find(a => a.startsWith('--rollback='));
  const rollbackDir = rollbackMatch ? rollbackMatch.split('=')[1] : null;

  if (rollbackDir) return rollback(rollbackDir);

  if (!audit && !dryRun && !execute) {
    console.error('❌ Bitte einen Modus angeben: --audit | --dry-run | --execute');
    console.error('   Empfehlung: zuerst --audit für Bericht.');
    process.exit(1);
  }

  console.log(`🔍 Hole Templates von PDFmonkey...`);
  let templates = await listTemplates();
  console.log(`✅ ${templates.length} Templates total gefunden.`);

  if (onlyTemplate) {
    templates = templates.filter(t => (t.identifier || t.name || '').includes(onlyTemplate));
    console.log(`🎯 Gefiltert auf "${onlyTemplate}" → ${templates.length} Templates.`);
  }

  if (audit) return runAudit(templates);

  let backupDir = null;
  if (execute) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    backupDir = path.join(BACKUPS_ROOT, ts);
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📦 Backup-Dir: ${backupDir}`);
  }

  const opts = { injectLogo, injectEuDisclosure, dedupeLogos, dedupeEu, dedupeAll };
  console.log(`⚙ Optionen: inject-logo=${injectLogo}, inject-eu-disclosure=${injectEuDisclosure}, dedupe-logos=${dedupeLogos}, dedupe-eu=${dedupeEu}`);

  const report = [];
  const indexEntries = {};
  let totalPatched = 0;

  for (const tmpl of templates) {
    const full = await getTemplate(tmpl.id);
    if (!full || !full.body) {
      report.push({ id: tmpl.identifier || tmpl.id, status: 'no_body', actions: '', skipped_why: '' });
      continue;
    }
    const { body: newBody, changes, skipped, isKi } = applyPatches(full, opts);
    const ident = full.identifier || full.name || full.id;

    if (changes.length === 0) {
      report.push({
        id: ident,
        type: isKi ? 'KI' : '-',
        status: 'no_changes',
        actions: '',
        skipped_why: skipped.join('; ') || 'nothing to do'
      });
      continue;
    }

    const actionsStr = changes.map(c => `${c.patch} (${c.count}×)`).join('; ');

    if (execute && backupDir) {
      const safeName = String(ident).replace(/[^a-zA-Z0-9_-]/g, '_');
      fs.writeFileSync(path.join(backupDir, `${safeName}.html`), full.body);
      indexEntries[safeName] = { id: full.id, identifier: ident, patched_at: new Date().toISOString() };
      try {
        await patchTemplate(full.id, newBody);
        totalPatched++;
        report.push({ id: ident, type: isKi ? 'KI' : '-', status: 'patched', actions: actionsStr, skipped_why: skipped.join('; ') });
      } catch (e) {
        report.push({ id: ident, type: isKi ? 'KI' : '-', status: 'error', actions: actionsStr, skipped_why: e.message.slice(0, 100) });
      }
    } else {
      report.push({ id: ident, type: isKi ? 'KI' : '-', status: 'preview', actions: actionsStr, skipped_why: skipped.join('; ') });
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${execute ? '✅ EXECUTE COMPLETE' : '🔍 DRY-RUN PREVIEW'}`);
  console.log(`${'═'.repeat(70)}`);
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
