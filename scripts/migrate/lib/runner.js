/* ============================================================
   PROVA Migrations-Pipeline — Runner-Helpers (ESM)
   Sprint K-1.1.A5

   Gemeinsamer Wrapper für Migration-Skripte.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Parse CLI-Args (Subset).
 *
 * @returns {{dryRun: boolean, limit: number|null, only: string|null,
 *            skipValidation: boolean, quiet: boolean}}
 */
export function parseArgs(argv = process.argv.slice(2)) {
    const out = {
        dryRun: true,
        limit: null,
        only: null,
        skipValidation: false,
        quiet: false
    };
    for (const a of argv) {
        if (a === '--live') out.dryRun = false;
        else if (a === '--dry-run') out.dryRun = true;
        else if (a === '--quiet') out.quiet = true;
        else if (a === '--skip-validation') out.skipValidation = true;
        else if (a.startsWith('--limit=')) out.limit = parseInt(a.slice('--limit='.length), 10);
        else if (a.startsWith('--only=')) out.only = a.slice('--only='.length);
    }
    return out;
}

/**
 * File-Logger: schreibt parallel in console + scripts/migrate/logs/<datum>-<modul>.log.
 */
export function createLogger(scriptName, { quiet = false } = {}) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const logsDir = path.join(here, '..', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `${date}-${scriptName}.log`);
    const stream = fs.createWriteStream(logFile, { flags: 'a' });

    function format(level, parts) {
        const msg = parts.map(p =>
            typeof p === 'string' ? p :
            p instanceof Error ? `${p.name}: ${p.message}` :
            JSON.stringify(p)
        ).join(' ');
        return `[${new Date().toISOString()}] ${level.padEnd(5)} ${scriptName}: ${msg}\n`;
    }

    function write(level, ...parts) {
        const line = format(level, parts);
        stream.write(line);
        if (!quiet || level === 'ERROR' || level === 'WARN') {
            const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
            fn(line.trimEnd());
        }
    }

    return {
        info:  (...p) => write('INFO',  ...p),
        warn:  (...p) => write('WARN',  ...p),
        error: (...p) => write('ERROR', ...p),
        debug: (...p) => !quiet && write('DEBUG', ...p),
        close: () => stream.end()
    };
}

/**
 * Standard-Wrapper für Migration-Skripte.
 * Ruft run-Function auf, fängt Errors, druckt Final-Report.
 *
 * @param {Object} cfg
 * @param {string} cfg.name      — z.B. '01-sachverstaendige'
 * @param {Function} cfg.run     — async (ctx) => void
 */
export async function runMigration(cfg) {
    const args = parseArgs();
    const log = createLogger(cfg.name, { quiet: args.quiet });

    const ctx = {
        dryRun: args.dryRun,
        limit: args.limit,
        skipValidation: args.skipValidation,
        log,
        counts: { ok: 0, skip: 0, error: 0 },
        errors: [],
        samples: []
    };

    log.info(`start ${ctx.dryRun ? '(DRY-RUN)' : '(LIVE)'} ${args.limit ? `limit=${args.limit}` : ''}`);

    try {
        await cfg.run(ctx);
    } catch (e) {
        log.error('FATAL:', e);
        log.close();
        process.exit(1);
    }

    log.info('─────────────────────────────────────────────');
    log.info(`done — OK=${ctx.counts.ok} SKIP=${ctx.counts.skip} ERROR=${ctx.counts.error}`);
    if (ctx.errors.length) {
        log.warn(`errors:`);
        for (const err of ctx.errors.slice(0, 10)) log.warn(`  ${JSON.stringify(err)}`);
        if (ctx.errors.length > 10) log.warn(`  … +${ctx.errors.length - 10} more`);
    }
    if (ctx.samples.length && ctx.dryRun) {
        log.info(`samples (first ${Math.min(3, ctx.samples.length)} mapped records):`);
        for (const s of ctx.samples.slice(0, 3)) log.info(`  ${JSON.stringify(s)}`);
    }
    log.close();

    return ctx;
}
