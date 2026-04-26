# SPRINT 01 — P3 DSGVO Server-Pseudonymisierung

**Tag:** 1  
**Aufwand:** 4-5h  
**Phase:** A Security-Fundament

---

## Ziel (1 Satz)
Alle KI-Pfade (ki-proxy, foto-captioning, whisper, Make-WEBHOOK_G1) sind pseudonymisiert — client-seitig **vor** Send + server-seitig als Defense-in-Depth. Das AVV-Versprechen wird technisch gehalten.

---

## Sprint-Start-Ritual

1. **Code-Realität-Check:** `grep -rn "ki-proxy\|foto-captioning\|WHISPER_WEBHOOK\|WEBHOOK_G1" *.js` — alle Aufrufer identifizieren
2. **Datenfluss-Check:** Welche Felder gehen an welchen Endpoint? Check `sammleDaten()` in app-logic.js
3. **Scope-Fixierung:** Nur KI-Pfade. Nicht Auth (kommt in Sprint 2). Nicht Function-JWT (Sprint 3).

---

## Scope

**In Scope:**
- `prova-pseudo-send.js` (NEU) — zentraler Client-Wrapper der fetch() an alle 4 KI-Endpunkte abfängt und pseudonymisiert
- `netlify/functions/lib/prova-pseudo.js` — Server-Modul (CommonJS-Mirror der Client-Version)
- `ki-proxy.js` — am Handler-Einstieg `pseudonymizeBody(body)` über alle Text-Felder, dann erst zu OpenAI
- `whisper-diktat.js` — Transkript nach Whisper **durch ProvaPseudo.apply() schleusen** bevor zum Client zurück
- `appendUserContext()` in ki-proxy.js — user_kontext pseudonymisieren
- DSGVO-Audit-Logging — Counts (nicht Inhalte!) in AUDIT_TRAIL pro Call

**Out of Scope:**
- Foto-Bildinhalt-Pseudonymisierung (EXIF-Strip, Face-Blur) → eigenes Ticket nach Pilot
- Personen-Regex-Erweiterung (Finding 2.6) → bewusste Design-Entscheidung, dokumentiert
- Auth/JWT auf Functions → Sprint 3

---

## Prompt für Claude Code

```
PROVA Sprint 01 — P3 DSGVO-Pseudonymisierung (Tag 1)

Pflicht-Lektuere vor Start:
- CLAUDE.md (Regel 10 DSGVO, Regel 14 node --check, Regel 4 sw.js bump)
- AKTUELLE-ABWEICHUNGEN.md
- AUDIT-REPORT.md Phase 2 (Findings 2.1, 2.3, 2.4, 2.5)
- prova-pseudo.js (Repo-Root) — bestehender Client-Pseudonymisierer
- Masterplan-v2: 00_MASTERPLAN.md und 03_SYSTEM-ARCHITEKTUR.md

KONTEXT
=======
Heute pseudonymisieren nur 4 von 8 KI-Aufrufer-Files (diktat-parser, paragraph-generator, 
baubegleitung-polish mit Pseudo). Die anderen (app-logic, stellungnahme-logic, freigabe-logic, 
ki-lernpool) senden ungefiltert. Haupt-Gutachten-Flow WEBHOOK_G1 (app-logic.js:3200) sendet 
komplette Stammdaten (auftraggeber_name, geschaedigter, strasse, plz, ort, transkript, 
beweisfragen, etc.) an Make.com und von dort zu OpenAI.

Fix zweischichtig:
1. CLIENT: Neuer prova-pseudo-send.js fängt alle fetch() an KI-Endpunkte ab und pseudonymisiert.
2. SERVER: ki-proxy.js + whisper-diktat.js pseudonymisieren nochmal als Defense-in-Depth.


SCOPE
=====

Folgende Sprints in dieser Reihenfolge, jeweils eigener Commit:

Commit 1: Server-Modul spiegeln
- prova-pseudo.js nach netlify/functions/lib/prova-pseudo.js spiegeln (CommonJS)
- API identisch (apply, audit, lastReport)
- Kommentar oben: "Manuell synchron halten mit Client-Version"
- Test: node -e mit Beispiel-Text → alle 5 Kategorien ersetzt

Commit 2: prova-pseudo-send.js (Client-Wrapper)
- Neue Datei im Repo-Root
- Exportiert window.PROVA_PSEUDO_SEND.fetch(url, options)
- Intercept wenn URL einem von 4 Mustern matcht:
  * /.netlify/functions/ki-proxy
  * /.netlify/functions/foto-captioning  
  * hook.eu1.make.com/h019... (WHISPER)
  * hook.eu1.make.com/imn2... (G1)
- Bei Match: JSON-Parse body, alle Text-Felder durch ProvaPseudo.apply, dann fetch mit 
  pseudonymisiertem Body
- Audit-Counts als Header "X-Pseudo-Counts": {iban:0,person:2,adresse:1,telefon:1,email:0}
- In allen 11 Kern-HTMLs einbinden (gleiche Liste wie prova-sanitize.js)
- Alle bestehenden fetch()-Calls in app-logic.js, stellungnahme-logic.js, freigabe-logic.js, 
  akte-logic.js von `fetch(` auf `window.PROVA_PSEUDO_SEND.fetch(` umstellen WENN der Call an 
  einen der 4 Endpunkte geht — sonst nicht anfassen

Commit 3: ki-proxy.js Server-Pseudonymisierung
- Am Handler-Einstieg nach JSON.parse, vor Router-Switch:
  const ProvaPseudo = require('./lib/prova-pseudo');
  const safeBody = pseudonymizeBody(body);
- pseudonymizeBody():
  - Felder die pseudonymisiert werden: diktat, messwerte, objekt, az, auftraggeber, 
    user_kontext, kontext.*, paragraphen.*, messages (alle content), user_input, frage, 
    gutachten_text, einträge[].inhalt_text (Sprint 06 vorbereitend)
  - Felder die NICHT: schadenart, baujahr, ki_analyse_modus, aufgabe, paragraph_nr, 
    verwendungszweck (Steuer-Daten, keine Personendaten)
- Nach pseudonymizeBody: 
  const audit = ProvaPseudo.audit(JSON.stringify(safeBody));
  if (Object.values(audit).some(v => v > 0)) {
    console.warn('[ki-proxy] Pseudonymisierungs-Reste:', audit);
  }
- safeBody statt body an alle Handler durchreichen

Commit 4: whisper-diktat.js Transkript-Pseudonymisierung
- const ProvaPseudo = require('./lib/prova-pseudo');
- Vor Response-Return:
  const transkriptSafe = ProvaPseudo.apply(transkript);
  console.log('[AUDIT-DSGVO]', JSON.stringify({
    function: 'whisper-diktat',
    sv_email_hash: crypto.createHash('sha256').update(body.sv_email||'').digest('hex').slice(0,8),
    pseudo_counts: ProvaPseudo.lastReport,
    timestamp: new Date().toISOString()
  }));
- transkriptSafe statt transkript zurückgeben

Commit 5: appendUserContext pseudonymisieren (Finding 2.4)
- In ki-proxy.js Funktion appendUserContext:
  - Nach trim+slice, vor Template: const cleanPseudo = ProvaPseudo.apply(clean);
  - cleanPseudo statt clean im Template verwenden

Commit 6: sw.js CACHE_VERSION v203 → v204 + prova-pseudo-send.js in APP_SHELL


QUALITÄTSKRITERIEN
==================
- node --check für jede geänderte .js vor Commit
- Kein doppeltes Pseudonymisieren (wenn Client schon ersetzt hat, Server findet nichts mehr)
- Immutability: Original-body unverändert, neuer safeBody für downstream
- Schadenart darf nicht verfälscht werden (z.B. "Wasserschaden" trotz Großbuchstabe)
- User-Kontext-Konsistenz: Gleicher Name → gleicher Token in allen Fällen der Session


TESTS
=====
Manueller Node-Test:
  node -e "const P = require('./netlify/functions/lib/prova-pseudo');
    console.log(P.apply('Herr Mueller, IBAN DE89370400440532013000, wohnt Hauptstr. 5, 
    50667 Koeln, Tel 0221 123456, mueller@test.de'));"
  → Erwartet: alle 5 Tokens ersetzt

Playwright existent: tests/05-security.spec.js:411-538 — muss grün bleiben

Curl-Test:
  curl -X POST https://prova-systems.de/.netlify/functions/ki-proxy \
    -H "Content-Type: application/json" \
    -d '{"aufgabe":"freitext","frage":"Herr Mueller hat IBAN DE89370400440532013000"}'
  → Bei Abruf der OpenAI-Logs (per console): IBAN nicht mehr im Prompt


ACCEPTANCE
==========
1. prova-pseudo-send.js in 11 HTMLs eingebunden (curl + grep)
2. sw.js zeigt prova-v204
3. curl auf ki-proxy mit Fake-Daten → Server-Log zeigt Pseudonymisierung
4. Whisper-Response enthält keine Klardaten (per Playwright-Test)
5. AUDIT_TRAIL Statistik wird nach Call geschrieben (bzw. als console.log)
6. tests/05-security.spec.js grün


COMMIT-MESSAGES (Muster)
========================
"S-SICHER P3.1: prova-pseudo.js nach netlify/functions/lib/ gespiegelt"
"S-SICHER P3.2: prova-pseudo-send.js Client-Wrapper + Einbindung in 11 HTMLs"
"S-SICHER P3.3: ki-proxy.js Server-Pseudonymisierung am Handler-Einstieg"
"S-SICHER P3.4: whisper-diktat.js Transkript pseudonymisiert vor Rueckgabe"
"S-SICHER P3.5: appendUserContext pseudonymisiert (Finding 2.4)"
"S-SICHER P3.6: sw.js v203 -> v204"


PUSH + TAG
==========
git push origin main
git tag v180-ssicher-p3-done
git push origin v180-ssicher-p3-done


ROLLBACK
========
git reset --hard v180-ssicher-p2-6-done
git push --force-with-lease origin main
```

---

## Server-Acceptance-Checks (Claude Code selbst)

```bash
# 1. Client-Wrapper existiert und ist in HTMLs
curl -sI https://prova-systems.de/prova-pseudo-send.js | head -1  # 200
for f in dashboard archiv akte app einstellungen kontakte rechnungen termine ortstermin-modus freigabe stellungnahme; do
  count=$(curl -sS https://prova-systems.de/${f}.html | grep -c "prova-pseudo-send.js")
  echo "$f: $count"
done  # alle = 1

# 2. Server-Modul gespiegelt
curl -sS https://prova-systems.de/.netlify/functions/ki-proxy -X POST \
  -H "Content-Type: application/json" \
  -d '{"aufgabe":"messages","messages":[{"role":"user","content":"Test"}]}' | head -c 200

# 3. sw.js v204
curl -sS https://prova-systems.de/sw.js | grep "CACHE_VERSION" | head -1
```

## Marcel-Browser-Test (5 Min)

1. Edge Inkognito → Login
2. Neuen Fall anlegen mit Fake-Auftraggeber "Max Mustermann" + fake Adresse
3. Diktat starten, 30 Sek aufnehmen: "Herr Mustermann in Hauptstrasse 5, 50667 Köln, IBAN DE89 3704 0044 0532 0130 00"
4. DevTools → Network-Tab → Bei Whisper-Response + KI-Proxy-Request:
   - Request-Body: `[PERSON]`, `[ADRESSE]`, `[IBAN]` statt Klartext
   - Response-Transkript: auch Tokens
5. Airtable AUDIT_TRAIL öffnen: neuer Eintrag mit Pseudo-Counts

---

## Wenn was schiefgeht

- **KI-Antworten schlechter Qualität:** Pseudonymisierung zu aggressiv. Temporäres Ausschalten via `prova_pseudo_disabled`-Flag in localStorage für Marcel → dann debuggen
- **Whisper bricht ab:** Server-Modul kann nicht geladen werden. node-Syntax-Check, require-Pfad prüfen
- **Kein Eintrag in AUDIT_TRAIL:** Function hat kein Schreibrecht. Dann nur console.log als Fallback

---

## Notiz für Masterplan-Update nach Sprint

Nach Abschluss in `00_MASTERPLAN.md` im Abschnitt "Stand-Notiz":
- Tag 1: Sprint 01 fertig, Tag v180-ssicher-p3-done
- Erledigte Findings: 2.1, 2.3, 2.4 (Kritisch + Hoch)
