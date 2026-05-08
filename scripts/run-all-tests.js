#!/usr/bin/env node
/**
 * PROVA — run-all-tests.js (MEGA⁴² P1)
 *
 * Cross-Platform Test-Runner. Iteriert alle tests/-Unterverzeichnisse,
 * führt node --test pro File aus, sammelt Counts, gibt Total am Ende.
 *
 * Vorteile gegenüber `for f in ...; node --test "$f"; done`:
 *   - Funktioniert auf Win/Mac/Linux
 *   - Parallelisierung via Promise.all (optional)
 *   - Strukturiertes Output (JSON oder pretty)
 *   - Exit-Code 1 bei Failures
 *
 * Usage:
 *   node scripts/run-all-tests.js [--json] [--filter <regex>] [--parallel <N>]
 *
 * Default: serial Run, pretty Output.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');

const args = process.argv.slice(2);
const flags = {
  json: args.includes('--json'),
  filter: (() => {
    const i = args.indexOf('--filter');
    return i >= 0 ? new RegExp(args[i + 1]) : null;
  })(),
  parallel: (() => {
    const i = args.indexOf('--parallel');
    return i >= 0 ? parseInt(args[i + 1], 10) || 1 : 1;
  })()
};

function findTestFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...findTestFiles(p));
    } else if (e.isFile() && /\.(test|spec)\.js$/.test(e.name) && !/\.spec\.js$/.test(e.name)) {
      // Nur node:test files (.test.js), keine Playwright (.spec.js)
      out.push(p);
    } else if (e.isFile() && /\.test\.js$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const PER_FILE_TIMEOUT_MS = parseInt(process.env.TEST_TIMEOUT_MS || '20000', 10);

function runOne(file) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, ['--test', '--test-timeout', '15000', '--test-force-exit', file], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;
    const timer = setTimeout(() => {
      killedByTimeout = true;
      try { child.kill('SIGKILL'); } catch (_) {}
    }, PER_FILE_TIMEOUT_MS);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killedByTimeout) {
        return resolve({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          ok: false, exitCode: -1, tests: 0, pass: 0, fail: 1,
          duration_ms: Date.now() - start,
          timeout: true,
          stderr_preview: '[timeout >' + (PER_FILE_TIMEOUT_MS / 1000) + 's]'
        });
      }
      const ms = Date.now() - start;
      const passMatch = stdout.match(/^ℹ pass (\d+)/m);
      const failMatch = stdout.match(/^ℹ fail (\d+)/m);
      const testsMatch = stdout.match(/^ℹ tests (\d+)/m);
      // Fallback: ✔/✖-Counting
      const passCheckmark = (stdout.match(/^✔/gm) || []).length;
      const failCheckmark = (stdout.match(/^✖/gm) || []).length;
      resolve({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        ok: code === 0,
        exitCode: code,
        tests: testsMatch ? parseInt(testsMatch[1], 10) : (passCheckmark + failCheckmark),
        pass: passMatch ? parseInt(passMatch[1], 10) : passCheckmark,
        fail: failMatch ? parseInt(failMatch[1], 10) : failCheckmark,
        duration_ms: ms,
        stderr_preview: stderr.split('\n').slice(0, 5).join('\n'),
        failure_lines: failCheckmark > 0 ? stdout.split('\n').filter(l => /^✖/.test(l)).slice(0, 5) : []
      });
    });
    child.on('error', (err) => {
      resolve({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        ok: false,
        exitCode: -1,
        tests: 0, pass: 0, fail: 1,
        duration_ms: Date.now() - start,
        error: err.message
      });
    });
  });
}

async function runSerial(files) {
  const out = [];
  for (const f of files) {
    const r = await runOne(f);
    out.push(r);
    if (!flags.json) {
      const status = r.ok ? '✅' : '❌';
      console.log(`  ${status} ${r.file} — ${r.pass}/${r.tests} (${r.duration_ms}ms)${r.fail ? `  fail=${r.fail}` : ''}`);
    }
  }
  return out;
}

async function runParallel(files, concurrency) {
  const out = [];
  const queue = files.slice();
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const f = queue.shift();
      const r = await runOne(f);
      out.push(r);
      if (!flags.json) {
        const status = r.ok ? '✅' : '❌';
        console.log(`  ${status} ${r.file} — ${r.pass}/${r.tests} (${r.duration_ms}ms)${r.fail ? `  fail=${r.fail}` : ''}`);
      }
    }
  });
  await Promise.all(workers);
  // Sort by file path
  out.sort((a, b) => a.file.localeCompare(b.file));
  return out;
}

async function main() {
  const t0 = Date.now();
  let files = findTestFiles(TESTS_DIR);
  if (flags.filter) {
    // Apply filter on relative-path with forward-slashes (cross-platform)
    files = files.filter(f => {
      const rel = path.relative(ROOT, f).replace(/\\/g, '/');
      return flags.filter.test(rel);
    });
  }

  if (!flags.json) {
    console.log('PROVA Test-Runner — ' + files.length + ' Test-Files gefunden');
    console.log('Concurrency: ' + flags.parallel + (flags.filter ? ', Filter: ' + flags.filter : ''));
    console.log('');
  }

  const results = flags.parallel > 1
    ? await runParallel(files, flags.parallel)
    : await runSerial(files);

  // Group by Verzeichnis
  const byDir = {};
  for (const r of results) {
    const dir = path.dirname(r.file).replace(/^tests\//, '') || '(root)';
    if (!byDir[dir]) byDir[dir] = { tests: 0, pass: 0, fail: 0, files: 0 };
    byDir[dir].tests += r.tests;
    byDir[dir].pass += r.pass;
    byDir[dir].fail += r.fail;
    byDir[dir].files += 1;
  }

  const total = {
    files: results.length,
    tests: results.reduce((s, r) => s + r.tests, 0),
    pass: results.reduce((s, r) => s + r.pass, 0),
    fail: results.reduce((s, r) => s + r.fail, 0),
    duration_ms: Date.now() - t0
  };

  if (flags.json) {
    console.log(JSON.stringify({ total, by_dir: byDir, results }, null, 2));
  } else {
    console.log('');
    console.log('=== Pro Verzeichnis ===');
    Object.keys(byDir).sort().forEach(dir => {
      const d = byDir[dir];
      const status = d.fail === 0 ? '✅' : '❌';
      console.log(`  ${status} ${dir.padEnd(28)}  ${d.pass}/${d.tests}  (${d.files} files, fail=${d.fail})`);
    });
    console.log('');
    console.log('=== TOTAL ===');
    console.log(`  Files:    ${total.files}`);
    console.log(`  Tests:    ${total.tests}`);
    console.log(`  Pass:     ${total.pass}`);
    console.log(`  Fail:     ${total.fail}`);
    console.log(`  Duration: ${(total.duration_ms / 1000).toFixed(1)}s`);
    console.log('');
    if (total.fail === 0) {
      console.log('🎉 ALLE TESTS GRÜN');
    } else {
      console.log('❌ ' + total.fail + ' Tests FAIL — siehe oben');
      // Failure-Details
      results.filter(r => r.fail > 0 || !r.ok).forEach(r => {
        console.log('');
        console.log('--- ' + r.file + ' ---');
        (r.failure_lines || []).forEach(l => console.log('   ' + l));
        if (r.stderr_preview) console.log('   stderr: ' + r.stderr_preview.split('\n')[0]);
      });
    }
  }

  process.exit(total.fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Runner-Crash:', e);
  process.exit(2);
});
