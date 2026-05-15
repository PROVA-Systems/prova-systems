# MEGA⁸² Vorbereitung — APP-LANDING-SPLIT-Audit

**Stand:** 2026-05-15 · **Status:** Audit only, keine Code-Änderungen.
**Scope:** Welche der 138 Root-HTMLs gehört zu welcher Domain?

---

## Architektur-Recap

```
prova-systems.de       → LANDING (Marketing + Legal + Public-Forms)
app.prova-systems.de   → APP     (SaaS, Login-protected)
admin.prova-systems.de → ADMIN   (Founder-Cockpit, separat)
```

- `netlify.toml` hat **186 host-conditionierte Redirects** für Cross-Domain
- `_redirects` ist host-unabhängig — gilt nur für LANDING-Aliases
- `sw.js APP_SHELL` listet ~30 explizit cached App-Pages
- Status seit 30.04.2026: APP-LANDING-SPLIT Phase 3 live (MEGA77-Sprint-Status)

---

## Kategorisierung der 138 Root-HTMLs

### A · LANDING (prova-systems.de) — 17 Files

Marketing, Legal, Public-Forms. SOLLEN am Root bleiben (CLAUDE.md Regel 16 für Legal: 48+ Cross-Refs).

| Datei | Zweck |
|---|---|
| `index.html` | Marketing-Startseite |
| `pricing.html` | Pricing-Page |
| `demo.html` | Demo-Anfrage |
| `kontakt.html` | Kontakt-Formular (Public) |
| `impressum.html` | Legal §5 TMG |
| `datenschutz.html` | DSGVO |
| `agb.html` | AGB |
| `avv.html` | Auftragsverarbeitungsvertrag |
| `cookie-einstellungen.html` | Cookie-Banner |
| `share.html` | Public-Share-Pages für Gutachten-Vorschauen |
| `pilot.html` | Founding-Pilot-Lead-Page |
| `404.html`, `500.html` | Error-Pages |
| `maintenance.html` | Wartung |
| `offline.html` | PWA-Offline-Page |
| `public-status.html`, `status.html`, `health-test-down.html` | Status-Pages |

### B · AUTH (app.prova-systems.de — pre-login) — 12 Files

Login + Onboarding. Auf APP-Subdomain, aber pre-authentifiziert.

| Datei | Zweck |
|---|---|
| `app-login.html` | Login (kanonisch via /login) |
| `app-register.html` | Registrierung |
| `admin-login.html` | Admin-Login (eigentlich auf admin-Subdomain) |
| `onboarding.html` | Onboarding-Hauptflow |
| `onboarding-supabase.html` | Supabase-Variante |
| `onboarding-welcome.html` | Welcome-Step |
| `onboarding-schnellstart.html` | Quick-Onboarding |
| `account-gesperrt.html` | Account-Suspended-Page |
| `setup-2fa.html` | 2FA-Setup |
| `push-setup.html` | Push-Notification-Setup |
| `dsgvo-mein-konto.html` | DSGVO-Selbstbedienung |
| `smtp-einrichtung.html` | SMTP-Setup |

### C · APP-CORE (app.prova-systems.de — post-login) — 53 Files

Die eigentliche SaaS. Alle in `sw.js` APP_SHELL ODER referenziert via Sidebar.

| Datei | Zweck |
|---|---|
| `dashboard.html` | Cockpit |
| `app.html` | Auftrag-Wizard |
| `akte.html` | Akten-Detail |
| `archiv.html` | Archiv |
| `neuer-fall.html` | Fall-Anlage |
| `portal.html` | (Was?) |
| `briefe.html`, `briefvorlagen.html` | Briefe |
| `termine.html`, `fristen.html` | Kalender |
| `kontakte.html`, `kontakte-supabase.html`, `kontakt-detail.html` | CRM |
| `rechnungen.html`, `mahnung.html`, `mahnwesen.html`, `erechnung.html`, `schnelle-rechnung.html` | Finanzen |
| `einstellungen.html` | Settings |
| `profil-supabase.html` | Profil |
| `freigabe.html`, `freigabe-queue.html` | Freigabe-Flow |
| `fachurteil.html` | §6 Editor |
| `kurzstellungnahme.html`, `gutachten-zusammenfassung.html` | Editor-Spezial |
| `normen.html`, `textbausteine.html`, `bibliothek.html` | Bibliotheken |
| `dokument-import.html`, `dokument-neu.html`, `dokument-vorlagen.html`, `import-assistent.html` | Import |
| `skizzen.html`, `eintraege.html`, `fragmente.html` | Erfassung |
| `jveg.html`, `schadensfaelle.html`, `beratung.html`, `wertgutachten.html`, `baubegleitung.html` | Flow-Pages |
| `ergaenzung.html`, `gericht-auftrag.html`, `schiedsgutachten.html`, `stellungnahme-gegengutachten.html` | Spezial-Aufträge |
| `diktat-mobile.html`, `ortstermin-modus.html`, `vor-ort.html` | Mobile/Field |
| `benachrichtigungen.html`, `audit-trail.html`, `statistiken.html`, `jahresbericht.html` | Reporting |
| `hilfe.html`, `support.html`, `pilot-tutorial.html` | Help |
| `wiederherstellbare-entwuerfe.html` | Drafts |
| `editor-demo.html` | Editor-Sandbox |
| `bescheinigung-erstellen.html`, `bescheinigungen.html` | Bescheinigungen |
| `honorar-rechner.html`, `kostenermittlung.html`, `positionen.html` | Kalkulation |

### D · APP-BRIEFE (app.prova-systems.de — Brief-Pattern-HTMLs) — 26 Files

Brief-Vorlagen. Werden via Frontend gerendert UND als PDF-Templates verwendet. Theoretisch könnten alle in einen `/briefe/`-Subfolder, **aber** die HTMLs sind als eigenständige Pages aufrufbar.

| Datei | Bemerkung |
|---|---|
| `abnahmeprotokoll-formal.html`, `abschlussbericht-versicherung.html`, `aktennotiz.html`, `akteneinsicht-antrag.html` | |
| `auftrag-ablehnen.html`, `auftrag-ablehnung.html` | **Duplikat?** Beide existieren — Audit-Kandidat |
| `auftragsbestaetigung.html`, `begehungsprotokoll.html`, `datenschutz-einwilligung-gericht.html`, `datenschutz-mandant.html` | |
| `einladung-ortstermin.html`, `einverstaendnis-dsgvo.html`, `erinnerungsschreiben.html`, `erstbericht-versicherung.html` | |
| `kuendigung-auftrag.html`, `nachforderung-unterlagen.html`, `ortsbesichtigung-protokoll-gericht.html` | |
| `rechnungskorrektur.html`, `schlussrechnung-aufstellung.html`, `sicherheitsbedenken.html` | |
| `terminabsage.html`, `terminsbestaetigung.html`, `terminsverlegung-antrag.html` | |
| `verguetungsanzeige.html`, `vollmacht-sv.html`, `widerspruch-gegengutachten.html`, `widerspruch-gutachten.html` | |
| `zpo-anzeige.html`, `zwischenbericht.html` | |

### E · ADMIN (admin.prova-systems.de) — 3 Files

| Datei | Zweck |
|---|---|
| `admin-cockpit.html` | Founder-Cockpit-Hauptpage |
| `admin-dashboard.html` | Admin-Dashboard |
| `admin-login.html` | (siehe AUTH) — entscheiden ob hier oder dort |

### F · PDF/INTERNAL (kein User-URL) — 17 Files

Nicht direkt aufgerufen. Werden von PDFMonkey gerendert oder als interne Templates referenziert.

| Datei | Zweck |
|---|---|
| `pdfmonkey-brief-template.html`, `pdfmonkey-messprotokoll-template.html` | PDFMonkey-Templates |
| `checkliste-sturmschaden.html`, `checkliste-wasserschaden.html` | Vor-Ort-Checklisten |
| `vorlage-01-standard.html` … `vorlage-11-bauabnahmeprotokoll.html` | 11 Vorlagen für Gutachten-Typen |
| `integration-template.html` | Test-Template (möglich Dead) |

### Σ Summe

| Kategorie | Count |
|---|---|
| A LANDING | 17 |
| B AUTH | 12 |
| C APP-CORE | 53 |
| D APP-BRIEFE | 26 |
| E ADMIN | 3 |
| F PDF/INTERNAL | 17 |
| **Σ** | **128** |

**Differenz zu 138**: 10 Files nicht eindeutig zugeordnet. Wahrscheinlich:
- `wiederherstellbare-entwuerfe.html` (in C gelistet aber unklar)
- Dubletten via `*-supabase`-Variante (`profil-supabase`, `kontakte-supabase`, `onboarding-supabase`)
- Helper-Pages die in beiden Kategorien Sinn machen

---

## Inkonsistenzen + Audit-Kandidaten

### 1. Duplikate

| File 1 | File 2 | Verdacht |
|---|---|---|
| `auftrag-ablehnen.html` | `auftrag-ablehnung.html` | Sehr ähnlicher Name — bewusst zwei Pages oder Leftover? |
| `widerspruch-gegengutachten.html` | `stellungnahme-gegengutachten.html` | Beide vorhanden — bewusst, oder ist eines Legacy? |
| `kontakte.html` | `kontakte-supabase.html` | Migration-Artefakt — Legacy raus? |
| `profil-supabase.html` | (kein `profil.html`?) | Nur Supabase-Variante existiert — Naming könnte vereinfacht werden |
| `onboarding.html` | `onboarding-supabase.html` | Wie oben |

### 2. Status der `-supabase`-Suffix-Pages

Diese Suffix kam aus der Cutover-Phase (Auth-Migration MEGA67-70). Nach Stable-Run (mind. MEGA75-MEGA80 = 2+ Wochen) sollten Legacy-Versionen weg sein.

**Empfehlung MEGA82:** Konsolidierung `-supabase`-Pages auf kanonische Namen, alte Versionen 410-stub.

### 3. `share.html` (Public-Share)

In LANDING-A einsortiert. Aber: prova-systems.de oder app.prova-systems.de? Wenn User Gutachten teilen sollen mit /share/<token> → muss Cross-Domain-fähig sein.

Aktuell: `share.html` ist am Root, würde also unter prova-systems.de/share.html ausgeliefert — das ist OK weil Public.

### 4. APP-BRIEFE in Subfolder?

Die 26 Brief-HTMLs am Root machen die Repository-Übersicht unübersichtlich. **Empfehlung**: in `/briefe/<typ>.html` verschieben mit Rewrite-Regeln.

**Aber**: Risiko von Broken-Links + PDFMonkey-Path-Probleme. Defer auf eigenen Sprint.

### 5. `editor-demo.html` Status?

Sandbox-Page, möglich Dead-Weight. MEGA82-Reaping-Kandidat (mit Frontend-Grep auf Linkage).

### 6. `vorlage-XX`-Pages: Wer rendert die?

Die 11 Vorlagen werden vermutlich nur von PDFMonkey via render-PDF-Call angesprochen. Direkter Browser-Aufruf vermutlich nicht gewollt. **Audit-Kandidat**: prüfen ob URL geschützt werden sollte (Auth-Required).

---

## Was MEGA82 daraus machen kann

| Item | Aufwand | Risiko |
|---|---|---|
| `-supabase`-Suffix-Cleanup (3 Files) | klein | mittel — Caller-Sweep nötig |
| `auftrag-ablehnen` vs `auftrag-ablehnung` Audit | klein | klein |
| `editor-demo.html` killen (wenn dead) | klein | klein |
| `vorlage-XX` Auth-Gate | mittel | klein |
| Brief-HTMLs in `/briefe/`-Folder | groß | groß |
| `kontakte.html` vs `kontakte-supabase.html` Konsolidierung | klein | mittel |

---

## Quick-Wins für MEGA82 Phase B (Audit-Cleanup)

1. **Frontend-Grep auf `kontakte.html` vs `kontakte-supabase.html`** — wer linkt wohin?
2. **Frontend-Grep auf `profil-supabase.html`** — gibt's noch Refs auf `profil.html`?
3. **Frontend-Grep auf `editor-demo`** — irgendwo verlinkt?

Diese 3 Greps + Cleanup wären 1-2h Arbeit. Würde Repo-Übersicht messbar verbessern.
