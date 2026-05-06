# Subprocessor-Audit V2 — DocRaptor + Cloudflare Klärung

**Datum:** 2026-05-10 (MEGA²⁸ W6P2-I7)
**Auditor:** Claude Opus 4.7
**Vorgänger:** `SUBPROCESSOR-AUDIT.md` (W5-I3)
**Trigger:** Marcel-Action-Items aus W5-I3 (Cloudflare + DocRaptor TBD)

---

## TL;DR

- **DocRaptor:** Skeleton-Code vorhanden, aber **NICHT aktiv** in Production. Default `PDF_SERVICE=pdfmonkey`. Skeleton-File enthält Marker `'DocRaptor noch nicht implementiert'`. → AVV-Status: **PLANNED, NICHT ACTIVE** (kann bei Aktivierung in 14-Tage-Vorlauf-Verfahren ergänzt werden).
- **Cloudflare:** Nur **DNS-Service** (vermutet) + Email-Obfuscation. 0 echte API-Code-Refs. Keine Workers, keine R2, keine Page-Rules in Code. **Marcel-Action: Dashboard-Status verifizieren** (vor AVV-final).

---

## DocRaptor — Detail

### Code-Refs (lib/pdf-service-*)

| File | Status | Inhalt |
|---|---|---|
| `lib/pdf-service-docraptor.js` | **Stub** | "DocRaptor noch nicht implementiert" Hard-Throw |
| `lib/pdf-service-interface.js` | Dispatcher | `PDF_SERVICE === 'docraptor'` Branch verfügbar |
| `netlify/functions/generate-pdf-mode-c.js` | Comment-only | Erwähnt DocRaptor als Option-A in Migration-Comment |

### ENV-Vars
- `DOCRAPTOR_API_KEY` — falls gesetzt: keine Auswirkung (Stub wirft `'DocRaptor noch nicht implementiert'`)
- `DOCRAPTOR_TEST_MODE` — würde im Stub gelesen, aber nie aufgerufen
- `PDF_SERVICE` — Switch: bei `'docraptor'` würde Stub-Throw ausgelöst (de facto = Service-Outage)

### Bewertung
- **Production-Status:** INAKTIV. Default `PDF_SERVICE = 'pdfmonkey'` ist Single-Source-of-Truth.
- **Risk:** Falls Marcel `PDF_SERVICE = 'docraptor'` setzt → unmittelbarer 500-Error (Stub-Throw).
- **AVV-Empfehlung:** **NICHT in aktuellen AVV aufnehmen** (würde Verbraucher-Verwirrung erzeugen). Bei späterer Aktivierung: 14-Tage-Vorlauf-Verfahren.

### Marcel-Action-Items
- 🟢 **Optional:** ENV-Vars `DOCRAPTOR_API_KEY`, `DOCRAPTOR_TEST_MODE`, `PDF_SERVICE` aus Netlify-Production-ENV bereinigen falls nicht aktiv
- 🟢 **Optional:** Skeleton-File `lib/pdf-service-docraptor.js` als `.legacy.js` umbenennen oder Marker-Kommentar verstärken

---

## Cloudflare — Detail (V2 Erweiterung)

### Code-Refs Re-Audit
| Pattern | Treffer | Befund |
|---|---|---|
| `cloudflare` (case-i) | 1 | nur in onboarding-welcome.html (cf-email-decode-script) |
| `CF_API`, `CF_ZONE`, `CF_ACCOUNT` | 0 | keine API-Integration |
| `workers.dev` | 0 | keine Cloudflare-Workers |
| `pages.dev` | 0 | keine Cloudflare-Pages |
| `R2` | 0 | kein Cloudflare R2 |
| `cf_token`, `cf_ray` | 0 | keine Cloudflare-Auth-Token-Header |
| `cdn-cgi/scripts/email-decode` | 1 | Cloudflare-Auto-Inject (W6P2-I7 entfernt) |
| `__cf_email__` | 0 | bereits in W3-I2 + W5-I7 entfernt |

### Quick-Fix W6P2-I7
- **onboarding-welcome.html:902** — Cloudflare-Email-Decode-Script entfernt (obsolet nach cf-email-Span-Removal in W3-I2)

### Bewertung
- **Production-Status:** **DNS-Service vermutet** (Domain `prova-systems.de` Cloudflare-DNS-typisch). Keine API-Workers/Pages/R2.
- **Email-Obfuscation:** Cloudflare hat das automatisch injiziert ("Auto-Cloudflare-Feature"). W6P2-I7 entfernt das Script-Tag, aber Cloudflare wird es bei nächstem Build vermutlich neu injizieren wenn Page-Rule "Email Obfuscation Off" nicht aktiv (siehe `docs/setup/CLOUDFLARE-MAILTO-FIX.md`).

### Marcel-Action-Items 🔴 PFLICHT
1. **Cloudflare-Dashboard öffnen** → `prova-systems.de` Domain
2. **DNS-Records-Liste**: nutzen wir Cloudflare-Nameservers oder NetLify?
3. **Page-Rule "Email Obfuscation Off"** für `*prova-systems.de/*` aktivieren
4. **Falls aktiv:** Cloudflare voll in AVV §5 ergänzen (Standort: USA + EU-Edge, DPA + SCC pflicht)
5. **Falls nicht aktiv:** Status-Doku mit "Cloudflare nicht in PROVA-Stack" final festhalten + ENV-Vars-Reinigung

---

## AVV / SUBPROCESSOR-LISTE Update — wartet Marcel-Action

### Bei Cloudflare ACTIVE (Marcel-Verifikation):
Subprocessor-Liste-Eintrag aus `docs/legal/SUBPROCESSOR-LISTE.md` Zeile 11 ist bereits TBD:
> "11. Cloudflare, Inc. (TBD) — Marcel-Action: Cloudflare-Dashboard öffnen…"

→ Nach Marcel-Verifikation: TBD entfernen, Standard-Eintrag mit DPA + SCC + Sub-Subprocessor übernehmen.

### Bei Cloudflare INACTIVE:
- AVV §5: Eintrag löschen
- ENV-Bereinigung
- `docs/setup/CLOUDFLARE-MAILTO-FIX.md` als historisch markieren

### DocRaptor:
- AVV §5: KEIN Eintrag (Skeleton ≠ Subprocessor)
- Erst bei Aktivierung: 14-Tage-Vorlauf an Pilot-User

---

## Welle-7-Backlog (aus W6P2-I7)

- DocRaptor: Skeleton vollständig implementieren (falls PDF-Provider-Backup gewünscht)
- Cloudflare: nach Marcel-Klärung → AVV-final + ENV-Cleanup
- Email-Obfuscation-Skip-Verfahren testen nach Page-Rule-Aktivierung

---

*MEGA²⁸ W6P2-I7 — DocRaptor INAKTIV bestätigt, Cloudflare DNS-only vermutet, 1 Cleanup-Quick-Fix umgesetzt.*
