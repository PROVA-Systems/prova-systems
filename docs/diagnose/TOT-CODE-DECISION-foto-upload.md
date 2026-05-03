# Tot-Code-Decision: foto-upload.js

**Datum:** 03.05.2026 (Sprint Catch-Up C3)
**Status:** Marcel-Decision pending
**HIGH-Findings die warten:** H-17 (Rate-Limit), H-23 (MIME-Whitelist)

---

## TL;DR (Marcel-2-Min-Read)

**Empfehlung: LÖSCHEN.**

Begründung: foto-upload.js ist 100% Tot-Code post-Voll-Cleanup-Sprint:
- Schreibt in **Airtable** (Voll-Cleanup-Sprint deprecated)
- Einziger Caller `foto-archiv.js` wird **nirgends in HTML geladen** + **nicht in sw.js APP_SHELL**
- Marcel hat 12 AIRTABLE_*-ENV-Vars in Netlify gelöscht → Function liefert ohnehin Fehler
- Frontend nutzt `prova-fetch-auth.js`-Wrapper der Airtable-URLs hart blockt

Aufwand zum Löschen: 5 Min. Aufwand zum Behalten + Fixen (H-17 + H-23): 2-3h.

---

## Code-Analyse

### Was die Function tut
`netlify/functions/foto-upload.js`:
1. Empfängt Foto als Base64-`dataUrl`
2. POST zu Airtable Attachment Upload-API: `${AT_API}/v0/${AIRTABLE_BASE}/${AT_FAELLE}/uploadAttachment`
3. Schreibt URL in Airtable Schadensfall-Record

### Code-Pfad-Analyse
```
foto-upload.js
  → process.env.AIRTABLE_PAT (gelöscht von Marcel in Netlify-UI)
  → Airtable-API (deprecated im Voll-Cleanup-Sprint)
```

**Fehler-Verhalten aktuell:**
- ENV `AIRTABLE_PAT` fehlt → `Bearer undefined` Auth-Header
- Airtable antwortet 401 Unauthorized
- Function gibt 500 zurück

---

## Caller-Analyse (Wer nutzt die Function?)

### grep-Resultate
```bash
$ grep -r "/.netlify/functions/foto-upload" --include="*.js" --include="*.html" .
./foto-archiv.js:  var UPLOAD_ENDPOINT = '/.netlify/functions/foto-upload';
```

**Einziger Caller: `foto-archiv.js`** (Frontend-File).

### Ist `foto-archiv.js` aktiv?
```bash
# In welcher HTML eingebunden?
$ grep -l "foto-archiv\.js" --include="*.html" .
(keine Treffer)

# In sw.js APP_SHELL?
$ grep "foto-archiv" sw.js
(keine Treffer)
```

**→ `foto-archiv.js` wird NIRGENDS geladen.** Tot-Code, der wiederum auf Tot-Code zugreift.

### Verifikation: Frontend-Foto-Upload
Foto-Upload im aktiven Frontend läuft nicht über `foto-archiv.js`:
- `akte.html` / Akten-Page nutzt vermutlich Supabase Storage direkt (geplant Sprint 11+ Logic-Files-Sweep)
- aktuell: kein Foto-Upload im Live-Workflow getestet — Pilot-Bug-Risiko, aber separate Issue

---

## Was passiert wenn wir LÖSCHEN

### Code-Änderungen
1. `netlify/functions/foto-upload.js` löschen
2. `foto-archiv.js` löschen (einziger Caller, ebenfalls Tot-Code)
3. ggf. CSS / HTML-Element-Listener-Konfigurationen die foto-archiv-modal referenzieren entfernen

### Auswirkung
- ✅ 31 → 30 Functions im Netlify-Deployment
- ✅ HIGH-Findings H-17 + H-23 sind aufgehoben (kein Code mehr → keine Fix-Pflicht)
- ✅ Konsistent mit Voll-Cleanup-Sprint-Doktrin
- ✅ kleinerer Attack-Surface

### Risiko
- ⚠️ Wenn ein User **trotzdem** `/.netlify/functions/foto-upload` aufruft → 404
- Mitigation: Browser-Cache-Refresh durch sw.js Bump
- Mitigation: `prova-fetch-auth.js`-Wrapper blockt Airtable-URLs ohnehin

### Marcel-Action wenn LÖSCHEN
```bash
# 1. Files löschen
git rm netlify/functions/foto-upload.js
git rm foto-archiv.js

# 2. sw.js APP_SHELL prüfen — falls foto-archiv.js drin: raus
# (Greg ergab: nicht drin, also OK)

# 3. Smoke-Test
bash scripts/smoke-test-cutover.sh

# 4. Commit
git commit -m "chore(cleanup): foto-upload + foto-archiv geloescht (Tot-Code post-K-1.5)"

# 5. Push + Deploy
git push origin main
```

---

## Was passiert wenn wir BEHALTEN

### Aufwand
**~3h Fix-Sprint:**

1. **Migration auf Supabase Storage** (statt Airtable Attachment):
   - Storage-Bucket-Policy (RLS via `storage.foldername(name)[1] IN (SELECT get_user_workspaces()::text)`)
   - Frontend-Code: signed-URL-Upload statt Base64-POST
   - Backend-Function rebuild für Supabase

2. **HIGH-Fixes:**
   - H-17: Rate-Limit (30 Uploads / Stunde / User) ergänzen
   - H-23: MIME-Whitelist + Magic-Bytes-Check

3. **EXIF-Strip** ergänzen (Audit 12 HIGH FU-02)

4. **foto-archiv.js Frontend-Integration** wieder herstellen:
   - In welche HTML eingebunden? — Marcel-Decision welche Akten-Page
   - Modal-CSS-Regeln aus existierender CSS ableiten

### Wann Behalten Sinn macht
- ❓ Falls Marcel will dass Pilot-SVs **direkten Foto-Upload via Page** haben (statt `data-store.js`-Pattern)
- ❓ Falls Sprint 11+ Logic-Files-Sweep `foto-archiv.js` wiederbeleben soll

---

## Empfehlung

**Option: LÖSCHEN.**

**Wann:** vor Pilot-Launch (heute/morgen).

**Begründung:**
1. Tot-Code-Cleanup-Doktrin (Marcel-Direktive im Voll-Cleanup-Sprint etabliert)
2. Aufwand-Verhältnis: 5 Min löschen vs 3h fixen
3. Pilot-Foto-Upload kommt ohnehin als neuer Workflow (Supabase Storage), nicht als Resurrection von Airtable-Attachment
4. Reduziert Attack-Surface (HIGH-Findings aufgelöst)

**Wenn Marcel BEHALTEN möchte:**
- Folge-Sprint S11+ (Logic-Files-Sweep) baut frischen Supabase-Storage-Foto-Workflow
- Aktueller Code wird trotzdem gelöscht weil Architektur-Bruch — neuer Code ersetzt nicht modifiziert

---

## Marcel-Decision-Slot

- [ ] **A) LÖSCHEN** (empfohlen, 5 Min) — Marcel: ich setze um, push + deploy
- [ ] **B) BEHALTEN + FIXEN** (~3h) — Marcel: ich starte Migration-Sprint nach Pilot-Launch
- [ ] **C) STATUS QUO** (Tot-Code stehen lassen) — Marcel: skipp Decision, BACKLOG-Marker setzen

---

*Tot-Code-Decision foto-upload 03.05.2026 · Marcel-Review pending*
