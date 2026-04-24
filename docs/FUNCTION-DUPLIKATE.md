# Function-Duplikate-Inventar

**Stand:** 25.04.2026 (S-SICHER Paket 2 Commit P2.4)
**Bezug:** AUDIT-REPORT Finding 4.5
**Status:** Read-only — **keine Datei in diesem Commit gelöscht.** Marcel bestätigt vor Löschung pro Datei.

---

## Kontext

Die meisten Function-Duplikate im Repo-Root wurden bereits in **S-SICHER Paket 1 Commit `239700c`** (24.04.2026) entfernt — 24 Dateien gelöscht, die in `netlify/functions/` aktuellere Varianten haben.

Damals als „nicht anfassen" markiert wurden 4 Dateien, weil die Root-Versionen per `git log` neuer als die Function-Versionen waren oder als Frontend-Script geladen werden. Diese sind jetzt die einzig verbleibenden Duplikate.

Netlify deployt laut `netlify.toml:7,16` **ausschließlich** `netlify/functions/` als Functions-Directory. Alle Root-Versionen, die keine Frontend-Scripts sind, sind damit toter Code im Deploy.

---

## Inventar

| Datei | Root-Größe / Git-Stand | netlify/functions/ Größe / Git-Stand | Content | Als Frontend-Script (`<script src>`) | Empfehlung |
|---|---|---|---|---|---|
| `ki-statistik.js` | 4.059 B · `39f5e8c` (2026-04-13) | 4.563 B · `c49876b` (2026-04-13) | unterschiedlich | **0 HTMLs** | **Root löschen** — keine Frontend-Nutzung, Function-Version ist größer/neuer. |
| `mahnung-pdf.js` | 13.026 B · `869fedc` (2026-04-17) | 12.300 B · `c49876b` (2026-04-13) | unterschiedlich | **0 HTMLs** | **Marcel prüfen**: Root-Version ist neuer (vermutlich manuelle Änderung). Änderungen aus Root in `netlify/functions/mahnung-pdf.js` mergen, dann Root löschen. |
| `prova-sv-airtable.js` | 6.408 B · `93b4247` (2026-04-11) | 6.408 B · `1a9918e` (2026-04-10) | **identisch** | **18 HTMLs** | **Netlify-Function-Kopie löschen** (nicht Root). Root ist das echte Frontend-Script (eingebunden in app-login, archiv, beratung, briefvorlagen, effizienz, ergaenzung, freigabe-queue, gericht-auftrag, kontakte, mahnwesen, portal, rechnungen, schiedsgutachten, stellungnahme-gegengutachten, termine, textbausteine, vor-ort, widerspruch-gutachten). Die Function-Kopie ist der Namens-Dublette-Bug. |
| `team-interest.js` | 4.871 B · `39f5e8c` (2026-04-13) | 5.978 B · `c49876b` (2026-04-13) | unterschiedlich | **0 HTMLs** | **Root löschen** — keine Frontend-Nutzung, Function-Version ist größer/neuer. |

---

## Konkrete Löschungs-Kommandos (erst nach Marcel-Freigabe)

```bash
# Variante A — sichere Defaults:
git rm ki-statistik.js team-interest.js netlify/functions/prova-sv-airtable.js

# Für mahnung-pdf.js vorher manuell mergen:
# 1. diff Root mahnung-pdf.js vs netlify/functions/mahnung-pdf.js ansehen
# 2. relevante Änderungen in netlify/functions/ übertragen
# 3. dann: git rm mahnung-pdf.js
```

Nach Löschung: `sw.js` CACHE_VERSION inkrementieren, node --check der verbleibenden Dateien.

---

## Frontend-Scripts (18 HTMLs), die `prova-sv-airtable.js` aus dem Repo-Root laden

```
app-login.html              archiv.html                beratung.html
briefvorlagen.html          effizienz.html             ergaenzung.html
freigabe-queue.html         gericht-auftrag.html       kontakte.html
mahnwesen.html              portal.html                rechnungen.html
schiedsgutachten.html       stellungnahme-gegengutachten.html
termine.html                textbausteine.html         vor-ort.html
widerspruch-gutachten.html
```

Wenn `netlify/functions/prova-sv-airtable.js` gelöscht wird, ändern sich diese Einbindungen **nicht** — sie zeigen auf `/prova-sv-airtable.js` (= Root).

---

## Historie

Zur Nachvollziehbarkeit: Die 24 bereits entfernten Duplikate aus S-SICHER P1 Commit `239700c`:

```
admin-auth.js, airtable.js, audit-log.js, brief-pdf-senden.js,
brief-senden.js, dsgvo-auskunft.js, emails.js, error-log.js,
foto-anlage-pdf.js, identity-signup.js, invite-user.js, ki-proxy.js,
mein-aktivitaetsprotokoll.js, push-notify.js, rechnung-pdf.js,
setup-tabellen.js, smtp-senden.js, smtp-test.js, stripe-checkout.js,
stripe-portal.js, stripe-webhook.js, termin-reminder.js,
whisper-diktat.js, zugferd-rechnung.js
```

Damals zusätzlich in `admin-dashboard.html:178` das tote `<script src="admin-auth.js">`-Tag entfernt (Root-Version war Server-Code mit `require('bcryptjs')` / `exports.handler`, im Browser nie funktionsfähig).
