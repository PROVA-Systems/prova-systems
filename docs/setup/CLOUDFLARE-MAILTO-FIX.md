# Cloudflare-Email-Obfuscation deaktivieren

**Datum:** 2026-05-10 (MEGA²⁸ W3-I2)
**Status:** Active Solution dokumentiert
**Severity:** Medium (UX-Bug — Mailto-Links broken)

---

## Problem

Cloudflare hat ein Feature **Email-Obfuscation** (auch: Email-Address-Hiding), das standardmäßig auf der Free/Pro/Business-Tier aktiv ist. Dieses Feature ersetzt:

```html
<a href="mailto:support@prova-systems.de">support@prova-systems.de</a>
```

automatisch durch:

```html
<a href="/cdn-cgi/l/email-protection" class="__cf_email__"
   data-cfemail="dcafa9acacb3aea89cacaeb3aabdf1afa5afa8b9b1aff2b8b9">[email&#160;protected]</a>
```

**Konsequenz:**
- Mailto-Links funktionieren nicht mehr (Klick führt auf cdn-cgi/l/email-protection statt Mail-Client)
- Email-Adressen werden im JavaScript-decoded — bei deaktiviertem JS bricht die Anzeige
- Keine Spam-Schutz-Wirkung in modernen Spam-Bots, der mehr Probleme als Nutzen schafft

---

## Lösung 1 (EMPFOHLEN): Cloudflare-Page-Rule

**Vorteil:** keine zusätzlichen Failure-Modes durch Build-Skripte. Quasi-Permanent-Lösung.

**Vorgehen:**
1. Login zu **dash.cloudflare.com** → Domain `prova-systems.de`
2. Navigation: **Rules** → **Page Rules** → **Create Page Rule**
3. URL-Pattern: `*prova-systems.de/*` (matcht alle Subdomains: app, admin, etc.)
4. Setting: **Email Obfuscation** → **Off**
5. Save and Deploy

**Verification:**
```bash
curl -s https://app.prova-systems.de/onboarding-welcome.html | grep "cf-email\|cdn-cgi"
# → keine Treffer, wenn die Page-Rule aktiv ist
```

**Hinweis:** Cloudflare Page-Rules sind in Anzahl pro Plan begrenzt (Free: 3 Page-Rules). Falls Limit erreicht: Account-Settings → Email-Address-Obfuscation für die Domain global deaktivieren.

---

## Lösung 2 (Backup): Account-Setting global deaktivieren

**Vorgehen:**
1. dash.cloudflare.com → Domain `prova-systems.de`
2. **Scrape Shield** → **Email Address Obfuscation** → Toggle **Off**
3. Wirkt für alle Pages der Domain.

**Vorteil:** verbraucht keine Page-Rule.
**Nachteil:** wirkt domain-weit (kein Path-spezifisches Override mehr möglich).

---

## Lösung 3 (Notfall): Post-Build-Sweep-Skript

Falls Page-Rule nicht greift (z.B. Cloudflare-Bug, Cache-Problem) — Fallback-Skript.

**Datei:** `scripts/post-build-cloudflare-sweep.js`
```js
#!/usr/bin/env node
/**
 * MEGA²⁸ W3-I2 — Cloudflare-Email-Obfuscation Post-Build-Sweep
 * Falls Cloudflare-Page-Rule nicht greift, ersetzt dieses Skript
 * `__cf_email__` Spans zurück durch echte mailto:-Links.
 *
 * Aufruf: nach Netlify-Build, vor Cloudflare-Cache-Refresh.
 * Konfiguration: KNOWN_EMAILS Map (cf-email-hash → email).
 */
const fs = require('fs');
const path = require('path');

// Bekannte Mappings (manuell pflegen wenn Cloudflare neue Hashes erzeugt):
const KNOWN_EMAILS = {
  'dcafa9acacb3aea89cacaeb3aabdf1afa5afa8b9b1aff2b8b9': 'support@prova-systems.de'
};

function decodeCfEmail(hash) {
  // Cloudflare-eigener Decode-Algorithmus
  const r = parseInt(hash.substr(0, 2), 16);
  let email = '';
  for (let n = 2; n < hash.length; n += 2) {
    email += String.fromCharCode(parseInt(hash.substr(n, 2), 16) ^ r);
  }
  return email;
}

function rewriteFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  html = html.replace(
    /<a\s+href="\/cdn-cgi\/l\/email-protection"[^>]*data-cfemail="([0-9a-f]+)"[^>]*>[^<]*<\/a>/gi,
    (match, hash) => {
      const email = KNOWN_EMAILS[hash] || decodeCfEmail(hash);
      count++;
      return `<a href="mailto:${email}">${email}</a>`;
    }
  );
  if (count > 0) {
    fs.writeFileSync(filePath, html);
    console.log(`[cf-sweep] ${filePath}: ${count} replacements`);
  }
  return count;
}

function walk(dir) {
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') &&
        entry.name !== 'node_modules') {
      total += walk(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.html')) {
      total += rewriteFile(fullPath);
    }
  }
  return total;
}

const root = process.argv[2] || '.';
const total = walk(root);
console.log(`[cf-sweep] Total replacements: ${total}`);
process.exit(0);
```

**Netlify-Build-Hook (netlify.toml):**
```toml
[[plugins]]
  package = "/scripts/post-build-cloudflare-sweep.js"
```

**Wann nutzen:** Nur als Backup wenn Page-Rule für >2 Tage nicht greift.

---

## Status (heute, 2026-05-10)

- ✅ `netlify.toml` hat `skip_processing = true` (CLAUDE.md Regel 26 — Netlify-eigene Email-Obfuscation aus)
- ✅ `onboarding-welcome.html:865` Cloudflare-Hash zurück durch Mailto-Link ersetzt (W3-I2 Sweep)
- ⏸ **Marcel-TODO:** Cloudflare-Page-Rule oder Account-Setting deaktivieren (3-5 min)
- ⏸ **Bei Bedarf:** Fallback-Skript bauen + in netlify.toml hooken

---

## Verification nach Marcel-Setup

Nach Deploy + Page-Rule-Aktivierung:

```bash
# Auf allen Subdomains prüfen
for host in app admin "" pilot; do
  url="https://${host}${host:+.}prova-systems.de"
  echo "=== $url ==="
  curl -s "$url/onboarding-welcome.html" | grep -c "cf-email\|cdn-cgi"
done
# Erwartung: alle 0
```

---

## Owner

- **Setup:** Marcel (Cloudflare-Account-Login pflicht)
- **Verification:** Claude Code (curl-Test wie oben)
- **Skript-Maintenance:** Claude Code (Lösung 3 wenn nötig)

---

*MEGA²⁸ W3-I2 — Empfehlung Lösung 1 (Page-Rule), Backup Lösung 3 dokumentiert.*
