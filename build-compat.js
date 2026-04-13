/**
 * PROVA Build-Kompatibilitäts-Script
 * Ersetzt optional chaining (?.) und nullish coalescing (??) 
 * durch browser-kompatible Alternativen.
 * Wird von netlify.toml vor dem Deploy ausgeführt.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
let fixed = 0, files = 0;

// Alle Root-JS-Dateien (nicht netlify/functions — die laufen in Node.js)
const jsFiles = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.js') && !f.startsWith('build-') && !f.includes('marked'))
  .map(f => path.join(ROOT, f));

function fixOptionalChaining(code, filename) {
  let changed = false;
  const original = code;

  // Ersetze einfache a?.b → (a && a.b)
  // Ersetze a?.b?.c → (a && a.b && a.b.c) — vereinfachte Version
  // Ersetze a ?? b → (a !== null && a !== undefined ? a : b)

  // Nullish Coalescing: x ?? y → (x !== null && x !== undefined ? x : y)
  // Nur wenn klar abgrenzbar (nicht innerhalb von Strings/Regexen)
  code = code.replace(/(\w[\w.]*)\s*\?\?\s*(['"`])/g, '($1 !== null && $1 !== undefined ? $1 : $2)');
  code = code.replace(/(\w[\w.]*)\s*\?\?\s*(\w)/g, '($1 !== null && $1 !== undefined ? $1 : $2)');
  code = code.replace(/(\w[\w.]*)\s*\?\?\s*(\[)/g, '($1 !== null && $1 !== undefined ? $1 : [');
  code = code.replace(/(\w[\w.]*)\s*\?\?\s*(\{)/g, '($1 !== null && $1 !== undefined ? $1 : {');
  code = code.replace(/(\w[\w.]*)\s*\?\?\s*(0|false|true|\d+)/g, '($1 !== null && $1 !== undefined ? $1 : $2)');

  // Optional chaining: obj?.prop → (obj && obj.prop)
  // obj?.method() → (obj && obj.method())
  code = code.replace(/\b(\w+)\?\.(\w+)\(/g, '($1 && $1.$2(');
  code = code.replace(/\b(\w+)\?\.(\w+)\b/g, '($1 && $1.$2)');

  // Entferne doppelte Klammern die durch Ersetzung entstehen können
  code = code.replace(/\(\((\w)/g, '($1');

  if (code !== original) {
    changed = true;
  }
  return { code, changed };
}

for (const file of jsFiles) {
  try {
    let code = fs.readFileSync(file, 'utf8');
    files++;
    
    const { code: fixed_code, changed } = fixOptionalChaining(code, file);
    
    if (changed) {
      fs.writeFileSync(file, fixed_code);
      fixed++;
      console.log('✅ ' + path.basename(file));
    }
  } catch(e) {
    console.error('⚠️ Fehler bei ' + file + ': ' + e.message);
  }
}

console.log('\n✅ Build-Compat abgeschlossen: ' + fixed + ' von ' + files + ' Dateien angepasst');
