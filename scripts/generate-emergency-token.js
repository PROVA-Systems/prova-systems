#!/usr/bin/env node
/**
 * PROVA — scripts/generate-emergency-token.js
 * S-SICHER P4A.8 (25.04.2026)
 *
 * Generiert einen 90-Tage-HMAC-Token für Marcel als Notfall-Backup,
 * falls der Login-Flow bricht. Der Token wird ausschliesslich LOKAL
 * mit dem ECHTEN AUTH_HMAC_SECRET aus Netlify ENV signiert — nie
 * im Repo abgelegt.
 *
 * Verwendung
 *   PowerShell:
 *     $env:AUTH_HMAC_SECRET="<wert-aus-netlify>"
 *     node scripts/generate-emergency-token.js [email]
 *   Bash:
 *     AUTH_HMAC_SECRET="<wert-aus-netlify>" node scripts/generate-emergency-token.js [email]
 *
 *   Default-Email: marcel_schreiber891@gmx.de
 *
 * Output
 *   - Token-Wert (zum Speichern im Passwort-Manager)
 *   - Bookmarklet-URL (drag-and-drop in Browser-Bookmarks)
 *   - localStorage-Snippet (alternative Konsolen-Eingabe)
 *
 * Eigenschaften des erzeugten Tokens
 *   sub:         Email
 *   sv_id:       'rec_emergency'  (kein echter Airtable-Record-ID)
 *   plan:        'Solo'
 *   verified:    true             (kein Provisional-Status, voller Zugriff)
 *   provisional: false
 *   emergency:   true             (Marker für spätere Audit-Filter)
 *   ttl:         90 Tage
 *
 * Wichtig: Das Skript schreibt NIE den Token-Wert in eine Datei im
 * Repo. Es printet ihn nur auf STDOUT — Marcel speichert ihn selbst
 * sicher (Passwort-Manager / 1Password).
 */

'use strict';

const path = require('path');

const email  = process.argv[2] || 'marcel_schreiber891@gmx.de';
const ttlSec = 90 * 24 * 60 * 60; // 90 Tage

if (!process.env.AUTH_HMAC_SECRET) {
  console.error('');
  console.error('FEHLER: AUTH_HMAC_SECRET muss als ENV-Variable gesetzt sein.');
  console.error('');
  console.error('PowerShell:');
  console.error('  $env:AUTH_HMAC_SECRET="<wert-aus-netlify>"');
  console.error('  node scripts/generate-emergency-token.js');
  console.error('');
  console.error('Bash:');
  console.error('  AUTH_HMAC_SECRET="<wert-aus-netlify>" node scripts/generate-emergency-token.js');
  console.error('');
  console.error('Wert aus Netlify holen: Site -> Site configuration ->');
  console.error('  Environment variables -> AUTH_HMAC_SECRET -> Edit -> Value (kopieren).');
  console.error('');
  process.exit(1);
}

const T = require(path.join(__dirname, '..', 'netlify', 'functions', 'lib', 'auth-token'));

let token;
try {
  token = T.sign({
    sub:         email,
    sv_id:       'rec_emergency',
    plan:        'Solo',
    verified:    true,
    provisional: false,
    emergency:   true
  }, ttlSec);
} catch (e) {
  console.error('FEHLER beim Token-Signieren:', e.message);
  process.exit(2);
}

const expDate = new Date(Date.now() + ttlSec * 1000).toISOString().slice(0, 10);

console.log('');
console.log('═════════════════════════════════════════════════════════════');
console.log(' PROVA Notfall-Token');
console.log('═════════════════════════════════════════════════════════════');
console.log(' Email:   ' + email);
console.log(' Gueltig bis: ' + expDate + ' (90 Tage)');
console.log(' Verified:    true (voller Zugriff, KEIN Provisional)');
console.log(' Marker:      emergency=true (in AUDIT_TRAIL filterbar)');
console.log('');
console.log(' ⚠ NICHT in Git committen, NICHT per E-Mail versenden');
console.log(' Speichern in: 1Password / Bitwarden / Passwort-Manager');
console.log('═════════════════════════════════════════════════════════════');
console.log('');
console.log('TOKEN:');
console.log(token);
console.log('');
console.log('───────────────────────────────────────────────────────────────');
console.log('Bookmarklet — Browser-Bookmark mit dieser URL als Adresse:');
console.log('───────────────────────────────────────────────────────────────');
console.log('javascript:void(localStorage.setItem(%27prova_auth_token%27,%27' + token + '%27));location.href=%27/dashboard.html%27;');
console.log('');
console.log('───────────────────────────────────────────────────────────────');
console.log('Alternative — DevTools-Konsole auf prova-systems.de oeffnen:');
console.log('───────────────────────────────────────────────────────────────');
console.log("localStorage.setItem('prova_auth_token','" + token + "');");
console.log("location.href = '/dashboard.html';");
console.log('');
