# MEGA⁸² D.3 — PDFMonkey-Cleanup-Audit

**Stand:** 2026-05-16 · Branch: `feat/mega82-verkauf-ready`

## Methodik

Grep über alle `.html` + `.js` Files am Repo-Root (case-insensitive).
Skip: `netlify/functions/`, `supabase/functions/`, `docs/`, `tests/`, `pdf-templates/`, `_archiv*`.

## Patches in MEGA82 D.1

| File | Stelle | Original | Patched |
|---|---|---|---|
| `akte.html` Z.450 | Button-Label | `📥 PDF generieren (PDFMonkey)` | `📥 PDF erstellen` |
| `akte.html` Z.747 | Loading-Text | `⏳ Generiere via PDFMonkey…` | `⏳ PDF wird erstellt…` |
| `akte.html` Z.765 | Error-Message | `PDFMonkey-Timeout…` | `PDF-Generator-Timeout…` |
| `akte.html` Z.793 | Error-Alert | `PDFMonkey: ` + msg | `PDF-Fehler: ` + msg |
| `akte.html` Z.795 | Button-Reset | wie Z.450 | wie Z.450 |
| `kurzstellungnahme.html` Z.246, 249 | Empty-State | `PDFMonkey-Template` / `PDFMonkey-Template-Setup` | `PDF-Vorlage` / `Vorlagen-Setup` |
| `pilot-tutorial.html` Z.105 | Tutorial-Text | `PDF wird generiert (PDFMonkey)` | `PDF wird erstellt` |
| `pilot-tutorial.html` Z.120 | Tutorial-Service-Liste | `Supabase / OpenAI / PDFMonkey` | `Supabase / OpenAI / PDF-Generator` |
| `push-setup.html` Z.100 | Service-Pill | `🟡 PDFMonkey` | `🟡 PDF-Generator` |
| `status.html` Z.136 | Service-Desc | `PDFMonkey` | `PDF-Generator` |
| `public-status.html` Z.68 | Service-Name | `PDF-Generation (PDFMonkey)` | `PDF-Generation` |

**Σ 11 Patches in 7 Files.**

## Bewusst NICHT gepatcht (Tech-Identifier + Internal)

| File | Stelle | Begründung |
|---|---|---|
| `hilfe.html` Z.287 | Error-Code `NO_PDFMONKEY` | Tech-Identifier in FAQ, taucht 1:1 in Logs auf — Match-Sensitiv |
| `status.html` Z.187 | Service-ID `pdfmonkey-api: 'svc-pdf'` | Mapping-Tabelle, kein User-String |
| `app-logic.js` Z.85, 983 | Kommentare | Internal-Doku, kein UI |
| `akte.html` Z.739, 782 | Kommentare in JS-Block | Internal |
| `akte-logic.js` Z.182 | `AKTE_PHASEN` ki-Beschreibung | Wird in Phase B.1 (4-Phasen-Refactor) durch neue Struktur ersetzt |
| `admin-dashboard.html` | Founder-internal | Admin-only, Tech-Tier OK |
| `legal/datenschutz-intern.html` | Auftragsverarbeiter-Liste | Rechtlich erfordert echten Service-Namen (DSGVO Art.&nbsp;28) |
| `docs/templates-goldstandard/*.html` | Liquid-Templates | PDFMonkey-Variablen-Namen, Match-Sensitiv |
| `pdf-templates/*.html` | Tech-Templates | Internal |
| `vorlage-*.html`, `formulare/vorlage-*.html` | Template-Master-Files | Internal |
| `netlify/functions/*` | Backend | Spec sagt: User-facing UI only |
| `supabase/functions/*` | Backend | Dito |
| `tests/*` | Test-Assertions | Match-Sensitiv, breaking on rename |
| `sw.js` | Service-Worker-Kommentare | Internal |
| `lib/prova-supabase-adapters.js`, `nav.js`, `beratung-logic.js`, `jveg-logic.js`, `prova-preise.js`, `prova-layout.config.js` | Mix aus Kommentaren + internen Pfad-Strings | Kein UI-User-facing |
| `mahnung-pdf.js` | Library, primär Logs | Internal |

**Σ ~25 Files mit verbleibenden Treffern — alle als Tech-Identifier / Internal akzeptiert.**

## Marcel-Visual-Check (Browser-Search empfohlen)

Auf `app.prova-systems.de` nach Login:
1. Browser-Search „pdfmonkey" / „PDFMonkey" auf:
   - Dashboard
   - Akte mit aktivem Auftrag
   - Freigabe-Page
   - Einstellungen
   - Hilfe
   - Pilot-Tutorial
   - Status-Page
2. **Erwartung:** 0 Treffer in User-facing Pages (sichtbarer Text)

Auf `prova-systems.de` (Landing):
1. Browser-Search „pdfmonkey" / „PDFMonkey"
2. **Erwartung:** 0 Treffer

## Standard für künftige UI-Strings

Siehe `docs/WORDING-STANDARDS.md`.
