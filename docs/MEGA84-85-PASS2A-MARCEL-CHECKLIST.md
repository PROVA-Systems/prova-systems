# MEGA⁸⁴/⁸⁵ Pass 2a MARCEL-CHECKLIST

**Stand:** 2026-05-16 · Branch: `feat/mega84-85-pass2-cockpit-mobile-compliance`

---

## A. Smoke-Tests (10 Punkte)

### 1️⃣ vor-ort-tabs.html lädt
- `/vor-ort-tabs.html?id=<auftrag-uuid>` öffnen (Marcels SCH-2026-001)
- Topbar: ← Akte · Titel · AZ-Sub · ⚙
- Tab-Bar: Skizze (aktiv) / Foto / Diktat
- Bottom-CTA: 💾 Speichern + zurück ✅

### 2️⃣ Skizze-Tab: Pin-Mode
- Pin-Mode-Button rechts klicken → wird `data-active="true"` (Accent-Color)
- Click ins SVG → Modal öffnet sich mit Label/Kategorie/Foto-ID-Felder
- Speichern → Pin als Circle+Number auf SVG sichtbar
- Reload → Pin bleibt (persistiert in `skizzen.foto_pins`) ✅

### 3️⃣ Foto-Tab: KI-Vision-Caption
- "Foto aufnehmen / hochladen" → Datei-Picker
- Foto hochladen → "KI analysiert…" Loading-State
- Nach 2-5s: Foto-Card mit Caption + §-Chip
- Erwartung: Konjunktiv-II-Sprache, §-Vorschlag aus §2-§5 ✅

### 4️⃣ Diktat-Tab: Whisper + Mapping
- Rec-Button (🎙️) klicken → Permission-Prompt für Mikrofon
- Aufnahme starten → Pulse-Animation, Stop nach Diktat
- Whisper-Transkript erscheint nach ~5-10s
- KI-Mapping: §-Chips mit Paragraph-Select + Confidence
- "Übernehmen" auf Chip → fades + persistiert ✅

### 5️⃣ Save-Workflow
- Bottom-CTA "Speichern" klicken
- Fotos → `dokumente` typ=foto_befund + ki_caption in inhalt_strukturiert
- Diktat → `eintraege` typ=diktat
- Mapping → `auftraege.details.paragraphen.p1..p5`
- Audit-Trail-Eintrag `source=vor-ort-tabs`
- Redirect zur Akte ✅

### 6️⃣ admin-kpis.html lädt
- `/admin-kpis.html` öffnen (Marcel als admin)
- 8 KPI-Kacheln 4×2 Grid (Desktop) / 2×4 (Mobile)
- Workspace-Liste mit Tier-Badges
- KI-Health-Bars + Audit-Events
- Auto-Refresh-Indikator oben rechts ✅

### 7️⃣ admin-kpis: Login-as-User
- Button "Login-as →" auf Workspace-Row klicken
- Prompt für Reason (min 5 Zeichen)
- Bei valid: Edge-Call → neuer Tab mit Read-Only-Token
- Bei Rate-Limit (3/24h): Alert "Rate-Limit erreicht"
- Audit-Trail-Eintrag: `entity_typ=admin_impersonation` ✅

### 8️⃣ admin-kpis: 2FA-Check
- Auf `admin.prova-systems.de` (oder simulieren via hostname-Mock):
  - Wenn TOTP nicht verifiziert: Auto-Redirect `/setup-2fa.html?required=admin`
  - Sonst: Cockpit lädt ✅

### 9️⃣ KI-Disclosure-Audit
- `/hilfe.html` "KI-Vision via gpt-5.5-Reihe" (NICHT "GPT-4o Vision")
- `/statistiken.html` "via KI-Vision (gpt-5.5)" (NICHT "via GPT-4o Vision")
- `/admin-dashboard.html` "Whisper + gpt-5.5" + "Ø KI-Response (gpt-5.5)"
- `/onboarding.html` "KI-Entwurf (gpt-5.5)" Feature-Liste
- `/status.html` "OpenAI gpt-5.5 + Whisper" Service-Desc
- Browser-Search nach "GPT-4o" auf diesen Pages → 0 Treffer ✅

### 🔟 sw v3500
- F12 → Application → Service Workers
- Active: `prova-v3500-mega84-pass2a-cockpit-mobile`
- Wenn alt: Clear-Storage + Hard-Reload ✅

---

## B. Bei Fehlern

| Symptom | Lösung |
|---|---|
| vor-ort-tabs lädt nicht | Migration 58 nicht appliziert? `mcp Supabase apply_migration` |
| Pin-Mode-Click funktioniert nicht | `lib/skizzen-pins.js` 404? Network-Tab prüfen |
| Foto-Caption Fehler | ki-proxy nicht deployed mit Vision-Support? siehe `supabase functions deploy ki-proxy` |
| Whisper-Diktat 502 | sv-files Storage-Bucket existiert? Workspace-RLS-Policy? |
| admin-kpis: User sieht es nicht | Email nicht in ADMIN_EMAILS-Whitelist in admin-kpis.html |
| Login-as 429 | Rate-Limit erreicht, max 3/24h pro Admin |

---

## C. DEFER Pass 2b/2c

| Pass | Items |
|---|---|
| 2b | D PDF-Compliance + E Trial-Guard + F Global-Search-360 |
| 2c | G 5-Audit-Edges → audit-log-v1 + H Bibliothek + Final |

---

## D. Apply-Pfad

1. Pull `feat/mega84-85-pass2-cockpit-mobile-compliance`
2. Hard-Reload App
3. 10-Punkte-Smoke-Test
4. Bei grün: PR mergen in main + Tag `v3500-mega84-pass2a-cockpit-mobile`
5. Falls noch nicht: `admin.prova-systems.de` DNS bei IONOS einrichten (Marcel-Task)
