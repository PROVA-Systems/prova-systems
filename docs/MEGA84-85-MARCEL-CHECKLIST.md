# MEGA⁸⁴/⁸⁵ MARCEL-CHECKLIST — Pass 1: Vor-Ort-Power-Foundation

**Stand:** 2026-05-16 · Branch: `feat/mega84-85-mega-marathon`
**Voraussetzung:** Pull + Hard-Reload (Strg+F5) damit v3400 lädt.

---

## A. Apply (vor Smoke-Test)

### 1. Migration 58 applien
```
mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega84_skizzen_foto_pins
  query=<Inhalt von supabase-migrations/58_mega84_skizzen_foto_pins.sql>
```

### 2. ki-proxy Edge-Function deployen (gpt-5.5-vision)
```bash
supabase functions deploy ki-proxy --project-ref cngteblrbpwsyypexjrv
```

### 3. Verify Migration:
```sql
SELECT count(*) FROM public.skizzen;  -- alle Rows haben foto_pins
SELECT count(*) FROM public.skizzen WHERE jsonb_array_length(foto_pins) > 0;  -- 0 erwartet
```

---

## B. Smoke-Tests (12 Punkte)

### 1️⃣ Akte-Section-Labels prominent

- `/akte.html?az=SCH-2026-XXX` öffnen
- Aktivität-Sidebar rechts: Labels "⏱️ Aktivität", "📎 Dokumente", "⏰ Fristen", "📅 Termine"
- **Erwartung:** Labels deutlich sichtbar (13px bold statt 12px italic) ✅
- Section-Labels in Main analog (Phase-Section etc.)

### 2️⃣ Cross-Subdomain-Login OHNE Doppel-Login

- Inkognito: Login auf `prova-systems.de`
- Klick "App öffnen" → `app.prova-systems.de`
- **Erwartung:** KEIN erneuter Login mehr (Bridge-Hydrate via Cookie)
- F12 → Cookies → `.prova-systems.de`: `prova_auth_token` vorhanden ✅

### 3️⃣ Migration 58 verfügbar

```sql
SELECT pg_typeof(foto_pins) FROM public.skizzen LIMIT 1;
-- Erwartet: jsonb
```

### 4️⃣ Skizzen-Pin-Mode funktioniert

- `/skizzen.html` öffnen, eine Skizze öffnen
- **NÄCHSTER SCHRITT:** Integration in `skizzen.html` ist DEFER Pass 2 — die `lib/skizzen-pins.js` ist bereit zur Einbindung
- Vorerst: Lib testbar via Browser-Console:
```js
const lib = await import('/lib/skizzen-pins.js');
window.ProvaSkizzePins.attach(document.querySelector('#sk-svg'), { skizzeId: 'TEST' });
window.ProvaSkizzePins.setMode(document.querySelector('#sk-svg'), 'pin');
// Click ins SVG → Modal sollte erscheinen
```

### 5️⃣ KI-Vision-Caption funktioniert (gpt-5.5-vision)

- Browser-Console (auf einer App-Page):
```js
const lib = await import('/lib/prova-ki-foto.js');
// Test-Bild: File-Picker oder hardcoded
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.onchange = async (e) => {
  const result = await window.ProvaKiFoto.generateCaption({
    imageFile: e.target.files[0],
    context: 'Schimmelbefall Badezimmer'
  });
  console.log(result);
};
fileInput.click();
```

**Erwartung:** `{ caption: "...", paragraph_suggestion: "§3", confidence: 0.85 }` mit sachlicher Beschreibung in Konjunktiv II ✅

### 6️⃣ Diktat-Mapping funktioniert

- Browser-Console:
```js
const lib = await import('/lib/prova-ki-diktat-mapping.js');
const transkript = "Heute Vor-Ort-Termin in Hürth, Bauherr Müller. Im Bad zeigt sich Schimmelbefall in der Ecke. Vermutlich Wärmebrücke durch fehlende Dämmung.";
const chips = await window.ProvaKiDiktatMapping.structure(transkript);
console.log(chips);
const div = document.createElement('div');
document.body.appendChild(div);
window.ProvaKiDiktatMapping.renderChips(div, chips, (c) => console.log('Übernommen:', c));
```

**Erwartung:** Chips für §1 (Anlass), §3 (Befund), §4 (Ursache) gerendert, editierbar ✅

### 7️⃣ Bridge in 83 Pages

Browser-Suche nach `prova-legacy-bridge.js` Script-Tag:
- `dashboard.html` ✓
- `akte.html` ✓
- `kalender.html` ✓
- `archiv.html`, `kontakte.html`, `rechnungen.html` ✓
- Alle anderen App-Pages ✓

### 8️⃣ sw v3400 lädt

- F12 → Application → Service Workers
- Active: `prova-v3400-mega84-pass1-vor-ort-power`
- Wenn alt: Clear-Storage + Hard-Reload

### 9️⃣ ki-proxy hat neue Vision-Support

```bash
curl -X POST https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/ki-proxy \
  -H "Authorization: Bearer <marcel-token>" \
  -H "Content-Type: application/json" \
  -d '{"purpose":"foto_caption_vision","prompt":"test","image_base64":"<base64>"}'
```

**Erwartung:** 200 mit JSON-Output, NICHT 400 ✅

### 🔟 ki_protokoll-Eintrag mit Vision-Modell

```sql
SELECT modell, modell_version, kosten_eur, purpose 
FROM public.ki_protokoll 
WHERE purpose IN ('foto_caption_vision', 'diktat_paragraph_mapping')
ORDER BY created_at DESC LIMIT 5;
```

**Erwartung:** `modell_version='gpt-5.5-vision'` für Foto-Caption ✅

### 1️⃣1️⃣ Console sauber

- F12 → Console
- Keine kritischen Errors auf Dashboard/Akte/Kalender
- prova-legacy-bridge.js logged "hydrated X keys from cookie" (Cross-Subdomain)

### 1️⃣2️⃣ Edge-Reaping-Doku bereit

- `docs/MEGA84-EDGE-DELETED.md` enthält kopierbare CLI-Commands
- Bei Zeit: 6 Functions löschen via Supabase-CLI

---

## C. Bei Fehlern

| Symptom | Lösung |
|---|---|
| Migration 58 schlägt fehl | Conflict auf `foto_pins`-Spalte? `ALTER TABLE skizzen DROP COLUMN IF EXISTS foto_pins` + re-apply |
| ki-proxy Vision 400 | Edge-Function nicht deployed → Step A.2 wiederholen |
| Vision-Call timeout | OpenAI-API-Key korrekt? gpt-5.5-vision verfügbar im Account? |
| Diktat-Chips JSON-Parse-Error | Prompt-Output ist evtl. nicht reines JSON — Code-Fence-Defense im Lib aktiv, sonst Marcel-Bug-Report |
| Bridge-Script auf einigen Pages fehlt | sed-Bulk-Pattern hat nur Pages mit `lib/prova-config.js` erwischt — Marcel kann grep nachholen |

---

## D. DEFER Pass 2/3

| Item | Pass | Begründung |
|---|---|---|
| Block A.5 vor-ort.html 3-Tab-Mobile-Refactor | Pass 2 | Komplettes Mobile-UI-Refactor ohne Browser-Test invasiv |
| Block B Founder-Cockpit (admin-dashboard + KPIs + 2FA + Login-as-User) | Pass 2 | Eigenständiger Sprint mit admin-Subdomain-Auth-Tests |
| Block C Frontend-gpt-4o-Caller-Migration | Pass 2 | Backend-Aliases sind da, Frontend-grep + replace |
| Block D 3 PDFMonkey-Templates LG-Disclosure | Pass 3 | Liquid-Templates pro Template |
| Block E Trial-Guard 30T + Coupons | Pass 3 | Stripe-Webhook-Logic + UI-Banner |
| Block F Global-Search-360 Strg+K | Pass 3 | RPC-Erweiterung + Modal |
| Block G 5-Audit-Edges → 1 audit-log-v1 | Pass 3 | Compliance-Pflicht-Pfad |

---

## E. Apply-Pfad gesamt

1. Pull `feat/mega84-85-mega-marathon`
2. Migration 58 applien (siehe A.1)
3. ki-proxy deployen (siehe A.2)
4. Hard-Reload App
5. 12-Punkte-Smoke-Test
6. Bei grün: PR mergen in main + Tag `v3400-mega84-pass1-vor-ort-power`
7. Optional vor Pilot: Edge-Reaping CLI-Apply + Migration-Tool entfernen
