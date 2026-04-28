#!/usr/bin/env node
/* ============================================================
   PROVA Migrations-Pipeline — Orchestrator
   Sprint K-1.1.A12

   Führt alle Migration-Skripte in der korrekten FK-Reihenfolge aus.

   CLI:
     node run-all.js                # alle, dry-run (default)
     node run-all.js --live         # alle, live (writes!)
     node run-all.js --only=01      # nur 01-sachverstaendige
     node run-all.js --only=05,06   # nur 05+06
     node run-all.js --limit=5      # nur 5 Records pro Skript
     node run-all.js --skip-validation
   ============================================================ */

import './lib/env.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ORDER = [
    { num: '01', file: '01-sachverstaendige.js', name: 'workspaces+memberships' },
    { num: '02', file: '02-kontakte.js',          name: 'kontakte' },
    { num: '03', file: '03-schadensfaelle.js',    name: 'auftraege+links' },
    { num: '04', file: '04-eintraege.js',         name: 'eintraege' },
    { num: '05', file: '05-rechnungen.js',        name: 'dokumente+positionen' },
    { num: '06', file: '06-audit-trail.js',       name: 'audit_trail' },
    { num: '07', file: '07-ki-statistik.js',      name: 'ki_protokoll' }
];

function parseOnlyArg(argv) {
    const a = argv.find(x => x.startsWith('--only='));
    if (!a) return null;
    return a.slice('--only='.length).split(',').map(s => s.trim());
}

function shouldRun(item, only) {
    if (!only) return true;
    return only.some(o => item.num === o || item.file.startsWith(o + '-'));
}

function runScript(item, args) {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, item.file);
        const start = Date.now();
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`▶  Sprint K-1.1: ${item.num} ${item.file} (${item.name})`);
        console.log(`${'═'.repeat(60)}`);

        const child = spawn(process.execPath, [scriptPath, ...args], {
            stdio: 'inherit',
            cwd: __dirname
        });

        child.on('close', (code) => {
            const dur = ((Date.now() - start) / 1000).toFixed(1);
            console.log(`${'─'.repeat(60)}`);
            console.log(`◀  ${item.num} done — exit=${code} duration=${dur}s`);
            resolve({ ...item, exitCode: code, duration: dur });
        });

        child.on('error', (e) => {
            console.error(`${'─'.repeat(60)}`);
            console.error(`✗  ${item.num} ERROR: ${e.message}`);
            resolve({ ...item, exitCode: -1, error: e.message });
        });
    });
}

async function main() {
    const argv = process.argv.slice(2);
    const only = parseOnlyArg(argv);
    const passThroughArgs = argv.filter(a => !a.startsWith('--only='));

    const items = ORDER.filter(i => shouldRun(i, only));
    if (only && items.length === 0) {
        console.error(`No scripts match --only=${only.join(',')}`);
        process.exit(2);
    }

    const dryRun = !argv.includes('--live');
    console.log(`PROVA Migration Orchestrator`);
    console.log(`Mode:    ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
    console.log(`Scripts: ${items.map(i => i.num).join(', ')}`);
    if (only) console.log(`Filter:  --only=${only.join(',')}`);
    console.log('');

    const results = [];
    for (const item of items) {
        const r = await runScript(item, passThroughArgs);
        results.push(r);
        if (r.exitCode !== 0 && !dryRun) {
            console.error(`\n[run-all] STOPPING — script ${item.num} exited with ${r.exitCode}`);
            console.error(`         (live-mode stops at first failure to avoid corrupted state)`);
            break;
        }
    }

    // Final-Report
    console.log(`\n${'═'.repeat(60)}`);
    console.log('FINAL REPORT');
    console.log('═'.repeat(60));
    const ok = results.filter(r => r.exitCode === 0).length;
    const fail = results.length - ok;
    for (const r of results) {
        const symbol = r.exitCode === 0 ? '✅' : '❌';
        console.log(`${symbol} ${r.num} ${r.file.padEnd(28)} ${r.duration}s`);
    }
    console.log(`${'─'.repeat(60)}`);
    console.log(`${ok}/${results.length} OK${fail ? ` — ${fail} FAIL` : ''}`);
    console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}${dryRun ? ' (kein Write)' : ''}`);

    if (dryRun) {
        console.log(`\n→ Wenn alles ✅: Live-Run mit \`node run-all.js --live\``);
    } else {
        console.log(`\n→ Validation: \`node validate.js\``);
    }

    process.exit(fail ? 1 : 0);
}

main();
