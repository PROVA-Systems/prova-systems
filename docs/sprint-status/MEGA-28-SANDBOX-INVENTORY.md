# MEGA²⁸ KORR-2 — Sandbox & Demo-Fall Inventory

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7 (1M context)
**Methodology:** Code-Scan + Live-DB-Verify (Supabase MCP)

---

## Bestandsaufnahme

### A) Code-Vorhandenes (gefunden via grep)

| Komponente | Status | Datei | Notiz |
|---|---|---|---|
| `create-demo-akte.js` Lambda | ✅ existiert | netlify/functions/create-demo-akte.js | Marcel-Decision D2 implementiert |
| Welcome-Wizard Demo-Akte-Step | ✅ existiert | lib/welcome-wizard.js | "DEMO-AKTE — Optional: Test-Akte mit is_demo-Flag" |
| Empty-States verlinken Demo | ✅ aktiv | archiv-logic.js:338, dashboard-logic.js:558, schadensfaelle-logic.js (NEU) | secondaryBtn "Demo-Fall ansehen" → `akte.html?az=SCH-DEMO-001` |
| Email-Templates referenzieren Demo | ✅ aktiv | email-templates/founding/trial-welcome.html, onboarding/trial-day-3-no-akte.html | Marketing-Onboarding-Push |
| `is_demo` Schema-Spalte | ✅ NEU | supabase-migrations/15_auftraege_is_demo.sql | NEU MEGA²⁸ KORR-2, applied |

### B) Live-DB-Status

```
Tabelle public.auftraege:
- Spalte is_demo BOOLEAN DEFAULT FALSE NOT NULL — ✅ MEGA²⁸ Migration 15 applied
- Partial-Index idx_auftraege_is_demo WHERE is_demo=TRUE — ✅ aktiv
```

### C) Was funktioniert

- ✅ Lambda `create-demo-akte.js` kann Demo-Auftrag anlegen (D2-Pattern: Pseudo-Akte mit is_demo-Flag)
- ✅ Empty-States linken seit Pre-MEGA²⁸ auf Demo
- ✅ Welcome-Wizard hat Demo-Akte-Step
- ✅ Email-Templates pushen Marketing-mäßig auf Demo

### D) Was fehlt

- ❌ Auto-Anlage-Trigger im Onboarding-Flow (Lambda existiert, wird vom Wizard ggf. aufgerufen — Verification pflicht via Browser-Test)
- ❌ "Demo-Fall entfernen"-Button in Settings (nicht im Code gefunden)
- ❌ Demo-Daten-Vollständigkeit (3 Befunde, 2 Messwerte, 1 Foto-Placeholder, 1 Diktat-Sample) — Lambda erzeugt vermutlich nur Auftrag-Hülle ohne Sub-Daten
- ❌ Public-No-Login-Sandbox (Subdomain `try.prova-systems.de`)

---

## 3-Varianten-Vergleich (Marcel-Decision)

### Variante (a) — Public-No-Login-Sandbox `try.prova-systems.de`

**Setup:** Separate Subdomain, isolierter Stack, Reset-täglich

| Pro | Contra |
|---|---|
| Best Pre-Sales-Funnel-Material (kein Email pflicht) | ~3 Tage Aufwand (Subdomain + isoliertes Backend) |
| SEO-Boost (öffentlich indexierbar) | Hosting-Kosten verdoppelt (separater Supabase + Netlify) |
| "Try-Without-Signup"-Konzept = USP | DSGVO: Sandbox-Daten brauchen eigenen Datenschutz-Hinweis |

**Aufwand:** ~3 Tage (Backend + Frontend + Reset-Cron)

### Variante (b) — Klick-Mockup auf Landing (no-backend)

**Setup:** Statisches HTML/CSS-Mockup mit fake-Daten + Animations, kein Backend

| Pro | Contra |
|---|---|
| Schnell (~4h) | Funktioniert nicht echt — Klick-Limits |
| Kein Backend-Risk + 0€ Hosting | Conversion: SVs erkennen schnell dass Mockup-only |
| SEO-friendly (statisches HTML) | Keine echte Erfahrung des Workflows |

**Aufwand:** ~4h (Marcel-Marketing-Designer)

### Variante (c) — Demo-Video als Erst-Köder + Sandbox post-Email

**Setup:** HeyGen-Video auf Landing → CTA "Demo-Account anfordern" → Email mit Login-Link

| Pro | Contra |
|---|---|
| Hohes Video-Engagement (~70% Watch-Rate) | Video-Produktion: ~2-3 Tage (Marcel) |
| Email-Lead-Capture für Marcel-Outreach | Verzögerung zwischen Interesse und Login |
| Sandbox-User echt-onboarded (Login = engaged) | Friction-Point: Email-Eingabe schreckt ab |

**Aufwand:** ~2-3 Tage Marcel + ~1h CC für Login-Magic-Link

---

## Meine Meinung als CTO

**Empfehlung: Hybrid (b) + (c)**

1. **Sofort:** Quick-Win SCH-DEMO-001 Auto-Anlage via `create-demo-akte.js` polishen + "Demo-Fall entfernen"-Button in Settings (~2h)
2. **Vor Pilot:** Klick-Mockup auf Landing (Variante b) für Pre-Sales-Funnel (~4h Marcel-Marketing)
3. **Post-Pilot:** Demo-Video-Variante (c) wenn Video-Equipment verfügbar
4. **Später (Skalierungs-Phase):** Public-Sandbox (a) wenn Marketing-Volumen es rechtfertigt

**Begründung:**
- (a) verbrennt zu viel Zeit pre-Pilot
- (b) ist schnell und gibt Marketing-Material
- (c) wirkt persönlicher und ist Marcel-Stil
- Demo-Fall-im-Login (Quick-Win) ist eh schon 90% gebaut

**Tier-Strategie respektiert:** Sandbox-User sieht Solo-Tier als Default, NICHT Founding (Founding ist Pilot-only).

---

## Quick-Win umgesetzt: Migration 15

```
✅ supabase-migrations/15_auftraege_is_demo.sql appliziert (live)
✅ is_demo BOOLEAN DEFAULT FALSE NOT NULL
✅ Partial-Index für Filter-Performance
✅ Comment für Schema-Dokumentation
```

**Status nach Migration 15:**
- Lambda `create-demo-akte.js` kann jetzt `is_demo: true` setzen
- Marcel-Action: Lambda-Code prüfen ob `is_demo`-Field gesetzt wird (Code-Audit pflicht)
- "Demo-Fall entfernen"-Button in Settings: Marcel-Decision pre-Welle-1

---

## Marcel — Action-Items

### 🔴 PRIORITÄT 1 (Code-Audit Demo-Pfad)
1. `netlify/functions/create-demo-akte.js` lesen — setzt es `is_demo: true`?
2. `lib/welcome-wizard.js` Demo-Step — wird Lambda korrekt aufgerufen?
3. Browser-Test: Onboarding → Demo-Fall sichtbar in Akten-Liste?

### 🟡 PRIORITÄT 2 (Sandbox-Strategie-Decision)
4. Variante (a) / (b) / (c) wählen — siehe oben
5. Pre-Pilot-Empfehlung: (b) für Marcel-Marketing

### 🟢 PRIORITÄT 3 (Settings-Button)
6. "Demo-Fall entfernen"-Button in `einstellungen.html` ergänzen — leichter Sprint (~30 Min)

---

*MEGA²⁸ KORR-2 — Sandbox-Inventory + Quick-Win Migration 15*
