# K-1 PDF-Generation — Test-Vorbereitung (F1)

**Sprint:** Mega-Sprint #4 Phase 3 · **Datum:** 28.04.2026
**Status:** Code-Audit ✅ — wartet auf Marcel-Live-Test

---

## ✅ Was Code-Audit verifiziert hat

### Schema-Match Pilot ↔ Edge Function

**Pilot sendet** (`gutachterliche-stellungnahme-logic.js:271-297`):
```js
POST {SUPABASE_URL}/functions/v1/pdf-generate
Headers:
  Authorization: Bearer <session.access_token>
  apikey:        <SUPABASE_ANON_KEY>
  Content-Type:  application/json
Body:
  {
    template_key: 'kurzstellungnahme',
    payload: {
      az,                       // 'GS-2026-NNN'
      datum,
      empfaenger_name,
      empfaenger_email,
      empfaenger_adresse,
      art,                      // Radio-Wert (fachlich-fremd / handwerker-abrechnung / ...)
      frage,                    // Pflicht
      sachverhalt,
      bewertung,
      antwort,                  // Pflicht
      normen                    // optional Multi-Select-Liste
    },
    auftrag_id: <UUID>,         // gesetzt nach erstem Server-Save
    typ: 'kurzstellungnahme_pdf',
    betreff: 'Gutachterliche Stellungnahme · GS-2026-NNN'
  }
```

**Edge Function erwartet** (`supabase/functions/_shared/types.ts` + `pdf-generate/index.ts`):
```ts
PdfGenerateRequest {
  template_key: string,           ✅ matcht
  payload: Record<string, unknown>, ✅ Object akzeptiert
  auftrag_id?: string,            ✅
  kontakt_id?: string,            (Pilot sendet nicht, ist optional ✅)
  typ: dokument_typ ENUM,         ✅ 'kurzstellungnahme_pdf' ist im ENUM
  betreff?: string                ✅
}
```

→ **0 Schema-Mismatch.**

### Edge Function Flow (verified)

```
1. JWT verify     → 401 wenn Token fehlt
2. workspace_id   → 403 wenn keine aktive Membership
3. getTemplateId('kurzstellungnahme') → '4233F240' (siehe templates.ts)
4. PDFMonkey POST /documents → returns {id, status: 'pending'}
5. Polling 1s/30s timeout → status: 'success' || 'failure'
6. Fetch download_url → PDF als Uint8Array
7. Upload zu sv-files Bucket: <workspace>/dokumente/<datum>/kurzstellungnahme-<id>.pdf
8. dokumente INSERT (typ, pdfmonkey_*, storage_path, bytes, status='generiert')
9. createSignedUrl 1h
10. logAuditEvent action='pdf_generate'
11. trackFeatureEvent typ='document_generated'
12. Response: { dokument_id, pdfmonkey_document_id, storage_path, pdf_url, bytes }
```

### Pilot Response-Handling (verified)

```js
if (!resp.ok) alert('PDF-Generation Fehler: ' + (json.error || resp.status));
await dataStore.auditLog('pdf_generate', 'dokument', json.dokument_id, {...});
window.location.href = '/akte.html?id=' + _auftragId + '&pdf=' + encodeURIComponent(json.pdf_url);
```

→ Korrekt: Audit-Log doppelt (Edge Function + Frontend), Redirect zu Akte mit signierter PDF-URL.

### Template-ID Verifikation

```
lib/template-registry.js          'kurzstellungnahme': '4233F240'
supabase/functions/_shared/templates.ts   'kurzstellungnahme': '4233F240'
```
→ Identisch (Mirror).

---

## 🚨 Pre-Test-Checklist (Marcel)

Bevor Marcel den Versenden-Button klickt, muss verifiziert sein:

- [ ] **Edge Functions deployed:** `supabase functions list` zeigt `pdf-generate`
- [ ] **Secrets gesetzt** (`supabase secrets list`):
  - `OPENAI_API_KEY` (für ki-proxy, nicht direkt PDF)
  - `PDFMONKEY_API_KEY` ⚠️ **kritisch für PDF**
  - `SUPABASE_SERVICE_ROLE_KEY` (auto in Edge Functions)
- [ ] **PDFMonkey-Template** `4233F240` existiert + ist „Live published":
  https://dashboard.pdfmonkey.io → Documents → Templates → suchen nach `4233F240`
  Falls nicht published: „Switch to live"
- [ ] **Storage-Bucket** `sv-files` existiert mit RLS-Policy:
  Supabase Dashboard → Storage → `sv-files` → Policies
  - INSERT-Policy: `(bucket_id = 'sv-files' AND auth.uid() IS NOT NULL)`
  - SELECT-Policy: `(bucket_id = 'sv-files' AND owner = auth.uid())`
  - Falls fehlend: Edge Function-Upload schlägt mit 403 fehl
- [ ] **Founder-Workspace** existiert (sollte aus K-1.0):
  ```sql
  SELECT w.id, w.name FROM workspaces w
  JOIN workspace_memberships m ON m.workspace_id = w.id
  JOIN users u ON u.id = m.user_id
  WHERE u.email = 'marcel.schreiber@prova-systems.de'
    AND m.rolle = 'owner' AND m.is_active = true;
  ```

---

## 📋 Marcel-Test-Anleitung — Step-by-Step

### Schritt 1: Login
```
URL:   https://prova-systems.de/auth-supabase.html
Email: marcel.schreiber@prova-systems.de
Passwort: <bekannt>
```
**Erwartet:** Redirect zu `/tools/test-supabase-login.html?logged_in=1` (oder `next`-Param falls gesetzt)
**Wenn nicht:** Console-Errors prüfen, Anon-Key in localStorage prüfen (`prova-supabase-anon-key`)

### Schritt 2: Pilot-Page öffnen
```
URL: https://prova-systems.de/gutachterliche-stellungnahme.html
```
**Erwartet:**
- Topbar: „Gutachterliche Stellungnahme"
- Subtitle: „IHK-konforme gutachterliche Stellungnahme nach §§ 36 GewO und SVO · 3 Phasen"
- 3-Step-Stepper Phase 1/2/3
- AZ-Feld: vorausgefüllt mit `GS-2026-NNN` (NNN = lokal-counter+1)
- Datum-Feld: heute
- TODO-Banner ist UNSICHTBAR (Logic versteckt ihn)

### Schritt 3: Phase 1 ausfüllen
**Pflichtfelder:**
- Datum (vorausgefüllt OK)
- Art der Anfrage (Radio: „fachlich-fremd" wählen)
- Konkrete Frage (z.B. „Wurde der Estrich fachgerecht eingebaut?")

**Empfehlung Test-Daten:**
- Auftraggeber Name: „Test Mustermann"
- E-Mail: marcel.schreiber@prova-systems.de (Self-Test)
- Adresse: „Teststraße 1, 12345 Testort"

**„Weiter →" klicken**

**Erwartet:**
- Stepper-Update Phase 1 → done, Phase 2 → active
- Console: `[supabase] insert auftraege ...` ODER `[supabase] update auftraege ...`
- Toast (rechts unten): „☁ Supabase-Save"

### Schritt 4: Phase 2 ausfüllen
**Pflichtfeld:**
- Antwort auf konkrete Frage (z.B. „Aufgrund der vorgelegten Fotos und Aussagen lässt sich nicht abschließend feststellen ob ...")

**Empfehlung Test-Daten:**
- Sachverhalt: „Der Estrich wurde in 2 Schichten eingebaut."
- Bewertung: „Die Schichtdicken sind nicht DIN 18560-konform."
- Normen: „DIN 18560-1, DIN 18560-2"

**„Weiter →" klicken**

**Erwartet:**
- Phase 2 → done, Phase 3 → active
- Console: Auto-Save mit `phase_aktuell: 3`

### Schritt 5: Versenden (PDF-Generation)
**Phase 3:**
- Honorar-Felder können leer bleiben (für Test)
- **„Versenden →"** klicken

**Erwartet (sequenziell):**
1. Toast: „📄 PDF wird generiert…" (sofort)
2. Browser-Network-Tab: `POST /functions/v1/pdf-generate` → 200 (5-15s wegen PDFMonkey-Polling)
3. Toast: „✓ PDF fertig"
4. Redirect nach 1.2s zu `/akte.html?id=<UUID>&pdf=<signed-url>`

**Bei Erfolg sehen wir in Supabase:**
- `auftraege` neue Row mit `typ='kurzstellungnahme'`, `status='aktiv'`, `phase_aktuell=3`
- `dokumente` neue Row mit `typ='kurzstellungnahme_pdf'`, `status='generiert'`, `bytes>0`
- `audit_trail` 2-3 Events: `create` (auftrag), `pdf_generate` (dokument)

---

## ⚠️ Bekannte Risiken + Fix-Vorschläge

### Risiko 1: `Edge Function returned a non-2xx status code`

**Mögliche Ursachen:**

| Status | Ursache | Fix |
|---|---|---|
| 401 | JWT abgelaufen oder fehlt | Re-Login |
| 403 | `workspace_memberships` für User fehlt | SQL-Check (Pre-Test-Checklist Punkt 5) |
| 502 PDFMonkey | Template `4233F240` nicht published | PDFMonkey-Dashboard → Switch to Live |
| 502 PDFMonkey-Timeout | Template-Engine langsam | Retry; falls persistent: Marcel-Hinweis |
| 500 Storage upload | RLS-Policy auf `sv-files` fehlt | Bucket-Policies einrichten (Pre-Test) |
| 500 dokumente insert | `kurzstellungnahme_pdf` nicht im ENUM | Sollte sein (verified) — ggf. SQL-Check |

### Risiko 2: PDF kommt aber sieht falsch aus

PDFMonkey-Template-Variablen müssen 1:1 zu den Payload-Keys passen. Aktuell senden wir:
```
{{ az }}, {{ datum }}, {{ empfaenger_name }}, {{ empfaenger_email }},
{{ empfaenger_adresse }}, {{ art }}, {{ frage }}, {{ sachverhalt }},
{{ bewertung }}, {{ antwort }}, {{ normen }}
```

**Falls Template andere Variablen erwartet:** im PDFMonkey-Dashboard Template-Editor öffnen und prüfen welche `{{ }}`-Tokens verwendet werden. Ggf. Logic-Payload erweitern oder Template anpassen.

### Risiko 3: Kein Redirect zu /akte.html

**Wenn Toast „✓ PDF fertig" kommt aber kein Redirect:**
- Console-Check: `_auftragId` gesetzt?
- json.pdf_url undefined? (Storage-Upload fehlgeschlagen, dokument-Row aber existiert)
- → Marcel kann manuell zu `/akte.html?id=<UUID>` (UUID aus Console-Log)

### Risiko 4: localStorage-Draft-Konflikt

`prova_ts_draft_v1` (Legacy-Key, semantisch alt) und `prova_ts_last_num`-Counter werden weiter genutzt. Wenn Marcel die Page mehrfach besucht, lädt die Logic den letzten Draft. Reset:
```js
// Browser-Console:
localStorage.removeItem('prova_ts_draft_v1');
localStorage.removeItem('prova_ts_last_num');
```

---

## 🔍 Schnell-Diagnose (wenn was schief geht)

### Edge Function Logs ansehen

```bash
# Marcel-Terminal (mit supabase CLI):
supabase functions logs pdf-generate --follow
```

**Oder Supabase Dashboard:**
Project → Edge Functions → `pdf-generate` → Logs

**Erwartete Log-Lines bei Erfolg:**
```
[pdf-generate] starting for workspace=<UUID> template_key=kurzstellungnahme
[pdf-generate] PDFMonkey doc=<UUID> status=success after 4200ms
[pdf-generate] uploaded <UUID>/dokumente/2026-04-28/kurzstellungnahme-<id>.pdf bytes=12345
[pdf-generate] dokument-row=<UUID>
[audit] insert ok
```

### Browser Network-Tab inspizieren

1. F12 → Network
2. Filter: `pdf-generate`
3. Klick auf den Request
4. **Headers**: prüfen ob `Authorization: Bearer eyJ...` da ist
5. **Payload**: prüfen ob alle 11 Felder gesendet werden
6. **Response**: bei Fehler — Error-JSON mit `error` und `detail`

### Fix-Pfad bei stale Draft

Wenn Draft alte „TS-2026-..."-AZ-Werte hat, die durch `prova_ts_draft_v1` localStorage rein-geladen werden:
```js
localStorage.removeItem('prova_ts_draft_v1');  // Browser-Console
```
Dann Page reload — neue AZ wird mit `GS-`-Prefix generiert.

---

## ✅ Akzeptanz F1

- ✅ Code-Audit: Schema-Match Pilot ↔ Edge Function
- ✅ Template-ID konsistent in 2 Stellen
- ✅ Logic-Flow Phase 1 → 2 → 3 → Versenden intakt
- ⏳ **Marcel-Live-Test** (siehe Schritte 1-5)
- ⏳ Bei Erfolg: F1 grün → in F2 (Dashboard) weitermachen
