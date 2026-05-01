# Audit 11 — localStorage / sessionStorage Audit

**Datum:** 02.05.2026
**Sprint:** S6 Phase 1
**Auditor:** Claude Code
**Methodik:** grep aller `setItem`-Aufrufe + Klassifikation nach Sensitivität

---

## Quantitäten

- **223 unique Keys** identifiziert (mit Const-Variables zusammengefasst)
- **~190 wörtliche String-Keys** (`'prova_*'`-Pattern)
- **~33 Const-Variable-Keys** (KEY, STORAGE_KEY, BB_KEY, etc. — manuell aufzulösen)

**Verteilung:**
- localStorage: ~150 Keys (persistent über Sessions)
- sessionStorage: ~30 Keys (gelöscht beim Tab-Close)

---

## Sensitivitäts-Klassifikation

### 🔴 CRITICAL — PII + Akten-Inhalte + Auth

#### Auth-Token

| Key | Typ | Begründung |
|---|---|---|
| `prova_auth_token` | localStorage | **Bearer-Token / JWT** — direkt aus Supabase-Session. Bei XSS direkter Account-Takeover möglich. |

**Bewertung:** localStorage ist von **jedem JavaScript** auf der Domain lesbar. XSS-Vector → Token-Steal → Server-Side-API-Calls als User möglich.

**Best-Practice-Vergleich:**
- ✅ Industry-Standard für SPAs ist **trotzdem** localStorage (wegen einfacher Cross-Tab-Sharing + keine CSRF-Sorge)
- ⚠️ **Schutz primär durch:**
  1. CSP (verhindert XSS-Quellen)
  2. Input-Sanitization (verhindert XSS-Injection)
  3. Token-Rotation-on-Refresh (Supabase macht das)

**Severity:** **MEDIUM-HIGH** — akzeptiert für SPA-Architektur, aber XSS-Schutz **darf nicht versagen** (siehe Audit 7 unsafe-inline + Audit 19 Code-Quality).

**Action:** keine Migration in Phase 1. Dokumentieren in `docs/public/SECURITY.md`. ggf. in Folge-Sprint Cookie-basiert (HttpOnly + Secure + SameSite=Strict) — aber Supabase-Auth-SDK macht das nicht out-of-the-box.

---

#### Akten-Inhalte (Schweigepflicht §203 StGB!)

| Key | Inhalt | Severity |
|---|---|---|
| `prova_diktat_nachtrag` | Diktat-Text (Akten-Inhalt) | CRITICAL |
| `prova_diktat_ortstermin` | Diktat-Text Ortstermin | CRITICAL |
| `prova_transkript` | Transkript Whisper | CRITICAL |
| `prova_stellungnahme_text` | Gutachten-Text §6 Fachurteil | CRITICAL |
| `prova_manuell_text` | Manueller Text | CRITICAL |
| `prova_entwurf_text` | Entwurfs-Text | CRITICAL |
| `prova_messwerte`, `prova_messwerte_strukturiert` | Messwerte aus Ortstermin | CRITICAL |
| `prova_aufmass_cache` | Aufmasse | CRITICAL |
| `prova_offenlegungstext` | §407a-Hinweis-Text | HIGH |
| `prova_notiz_*` (pro Akte) | Notizen pro Akte | CRITICAL |
| `prova_akte_docs_*` (pro Akte) | Dokumente pro Akte | HIGH |
| `prova_foto_metadata_*` | Foto-Metadaten | MEDIUM |
| `prova_phase_skips_*` | Phase-Tracking | LOW |

**Bewertung:** Akten-Inhalte sind durch §203 StGB streng schweigepflicht-relevant. localStorage-Speicherung bedeutet:
- ✅ Daten verlassen den Server-Pfad nicht (gut — kein Cross-Site-Leak)
- ⚠️ Multi-User-Computer-Risiko: User-A loggt aus → User-B loggt ein → kann lokal noch User-A's Diktat-Text sehen wenn Logout-Funktion localStorage nicht wischt
- ⚠️ Browser-Cache-Daten-Mining: andere Tabs/Plugins/Schadsoftware können auf localStorage zugreifen wenn Browser kompromittiert
- ⚠️ Browser-Backup (Chrome-Sync, Firefox-Sync) könnte Daten in andere Geräte synchronisieren

**Severity:** **HIGH**

**Action (Phase 1.9 Fix):**
1. Verifizieren: Logout-Funktion wischt **alle** `prova_*`-Keys aus localStorage + sessionStorage. Phase 1.9 prüft das.
2. Verifizieren: bei User-Wechsel (Workspace-Switch) werden alle aktiven Akten-Daten gewischt.
3. Dokumentieren in SV-Onboarding: „PROVA nicht auf öffentlichen / geteilten Computern verwenden ohne Logout."

---

#### Auftraggeber-PII (DSGVO Art. 5)

| Key | Inhalt | Severity |
|---|---|---|
| `prova_auftraggeber_name`, `prova_auftraggeber_typ` | Auftraggeber-Name | HIGH |
| `prova_jveg_ag_name`, `prova_jveg_ag_anschrift`, `prova_jveg_ag_email` | Auftraggeber-Daten | HIGH |
| `prova_kontakte`, `prova_kontakte_recent` | Kontakte-Cache (PII!) | HIGH |
| `prova_kontakt_import` | Importierte Kontakte (PII) | HIGH |
| `prova_archiv_cache_v2`, `prova_archiv_import` | Archiv-Daten (Akten-PII) | HIGH |
| `prova_faelle_cache` | Akten-Cache | HIGH |
| `prova_jveg_gericht`, `prova_jveg_gericht_adresse`, `prova_jveg_gericht_az` | Gerichts-Aktenzeichen | MEDIUM |
| `prova_termine`, `prova_termine_cache` | Termin-Daten | MEDIUM |
| `prova_rechnungen`, `prova_rechnungen_local`, `prova_rechnungen_import` | Rechnungs-Cache (PII + Bankdaten) | HIGH |
| `prova_objekt`, `prova_current_objekt`, `prova_current_baujahr` | Objekt-Daten | MEDIUM |

**Bewertung:** PII wird im Browser-Cache gehalten. DSGVO-Konsequenzen siehe oben (Schweigepflicht). Zusätzlich:
- ⚠️ DSGVO Art. 17 (Löschung): User-Daten-Export muss **auch** localStorage berücksichtigen?
  - Realität: localStorage ist client-side, nicht Teil des „Verarbeitungs-Verzeichnisses" — ABER Pseudonymisierung gilt nur server-side
- ⚠️ Bei Logout MUSS localStorage gewischt werden (DSGVO Art. 5 Abs. 1 lit. c „Datenminimierung")

**Severity:** **HIGH**

**Action:** Phase 1.9 verifiziert Logout-Wipe. Dokumentation in `docs/public/SECURITY.md`.

---

### 🟠 MEDIUM — SV-Stammdaten + Geschäftsdaten

#### SV-Stammdaten (eigene Daten, weniger kritisch)

| Key | Inhalt |
|---|---|
| `prova_sv_email` | SV-Email |
| `prova_sv_name`, `prova_sv_vorname`, `prova_sv_nachname`, `prova_sv_anrede` | Name |
| `prova_sv_firma` | Firma |
| `prova_sv_strasse`, `prova_sv_plz`, `prova_sv_ort`, `prova_sv_telefon` | Adresse + Tel |
| `prova_sv_iban`, `prova_sv_bic` | Bankdaten |
| `prova_sv_steuernr`, `prova_sv_ihk`, `prova_sv_quali`, `prova_sv_qualifikation` | IHK-Identifikation |
| `prova_sv_signatur`, `prova_sv_stempel` | Signatur (Image-Base64?) |
| `prova_sv_zahlungsziel`, `prova_sv_mwst` | Geschäfts-Konfig |
| `prova_kontodaten` | Kontodaten (combined) |
| `prova_profil`, `prova_bueronamen` | Profile-Settings |
| `prova_arbeitstage`, `prova_urlaub_bis` | Arbeitszeit |

**Bewertung:** SV's eigene Daten sind weniger kritisch als Auftraggeber-PII (eigene Verfügungsgewalt). Trotzdem MEDIUM weil bei Logout/Computer-Wechsel sichtbar.

**Severity:** MEDIUM (eigene Daten, akzeptabel im Browser, aber Logout-Wipe Pflicht)

---

#### Geschäfts-Caches

| Key | Inhalt |
|---|---|
| `prova_paket`, `prova_status`, `prova_subscription_status` | Abo-Status |
| `prova_trial_start`, `prova_trial_end`, `prova_trial_days` | Trial-Daten |
| `prova_account_status` | Account-Status |
| `prova_avv_signed`, `prova_avv_ts`, `prova_avv_version` | AVV-Einwilligung |
| `prova_dsgvo_signed`, `prova_dsgvo_version` | DSGVO-Einwilligung |
| `prova_agb_signed`, `prova_agb_version` | AGB-Einwilligung |
| `prova_settings` | App-Settings |
| `prova_lernpool`, `prova_ki_statistik` | KI-Lernpool/Stats |
| `prova_textbausteine`, `prova_textbausteine_cache` | Textbausteine |
| `prova_audit_log`, `prova_error_log` | Client-Side-Logs |
| `prova_kostenermittlung`, `prova_kostenermittlung_done` | Kostenermittlung |

**Severity:** MEDIUM (Geschäftsdaten, Datenschutz-relevant aber nicht Schweigepflicht)

---

### 🟢 LOW — UI-State + Onboarding-Flags

| Key | Inhalt |
|---|---|
| `prova_theme`, `prova_accent`, `prova_primary_color`, `prova_fontsize` | UI-Theme |
| `prova_sb_collapsed`, `prova_sb_scroll`, `prova_np_collapsed` | Sidebar-State |
| `prova_tour_done`, `prova_welcome_seen`, `prova_profil_banner_seen` | Onboarding-Flags |
| `prova_listenansicht` | Listen-View |
| `prova_safari_warn` | Safari-Warning |
| `prova_startseite` | Default-Page |
| `prova_logout_grund` | Logout-Reason |
| `prova_active_workspace` | Workspace-ID (öffentlich, nicht sensitiv) |

**Severity:** LOW (UI-State, harmlos)

---

### 🔵 INFO — Public-Keys + Test-Daten

| Key | Inhalt |
|---|---|
| `prova-supabase-anon-key` | **PUBLIC anon-Key** — designed-for-browser, RLS-geschützt → OK in localStorage |
| `prova_test_auftrag_id` | Test-Daten — sollte aus Production raus |
| `prova_testpilot` | Pilot-Status |
| `prova_airtable_status` | **DEPRECATED** — Voll-Cleanup-Sprint |
| `prova_at_sv_record_id` | **Airtable-Legacy** — DEPRECATED |
| `prova_sv_airtable_extra` | **Airtable-Legacy** — DEPRECATED |
| `prova_sv_record_id` | **Airtable-Legacy** Record-ID — DEPRECATED |

**Severity:** INFO (Funktional OK, aber Airtable-Refs sind Tot-Code aus Voll-Cleanup-Sprint)

**Action:** in Folge-Sprint (Sprint 11+) bei Logic-Files-Sweep mitlöschen.

---

## Findings (Aggregat)

### HIGH-1 — Akten-Inhalte in localStorage (Schweigepflicht §203 StGB)

**Risiko:** Multi-User-Computer-Szenario, Browser-Sync-Risk, Schadsoftware-Lesbarkeit.
**Mitigation aktuell:** localStorage ist Domain-isoliert (XSS-Schutz vorausgesetzt).
**Mitigation Pflicht:** Logout-Funktion **MUSS alle `prova_*`-Keys wischen**. Phase 1.9 verifiziert + ggf. fixt.

---

### HIGH-2 — Auftraggeber-PII in localStorage (DSGVO Art. 5)

**Risiko:** PII in Client-Storage.
**Mitigation aktuell:** dieselbe Browser-Sicherheit.
**Mitigation Pflicht:** dieselbe Logout-Wipe + Dokumentation in Onboarding.

---

### MEDIUM-1 — `prova_auth_token` in localStorage (XSS-Steal-Vektor)

**Risiko:** XSS würde Token erbeuten.
**Mitigation aktuell:** CSP + Input-Sanitization (Audit 7 + Audit 10).
**Mitigation Pflicht:** XSS-Schutz darf nicht brechen. Dokumentieren in SECURITY.md.

---

### LOW-1 — Tot-Code Airtable-Keys

**Files:** `prova_airtable_status`, `prova_at_sv_record_id`, `prova_sv_airtable_extra`, `prova_sv_record_id`
**Action:** Sprint 11+ Logic-Files-Sweep cleanup.

---

### INFO-1 — Const-Variable-Keys nicht aufgelöst

**Beobachtung:** ~33 Keys nutzen Const-Variablen (`STORAGE_KEY`, `KEY`, `BB_KEY`). Volle Sensitivitäts-Klassifikation würde Const-Auflösung erfordern.

**Action:** in Folge-Audit Phase 4 (Code-Quality + Dead-Code-Sprint) mit-bearbeiten.

---

## Phase-1.9-Fixes / Verifikationen

### Fix-Verifikation: Logout wischt localStorage + sessionStorage

**Test:**
1. Login mit Test-Account
2. Stellungnahme-Page öffnen, Text eingeben
3. Logout
4. DevTools → Application → Local Storage prüfen
5. Erwartung: alle `prova_*`-Keys gelöscht

**Ergebnis:** Phase 1.9 testet das + fixt wenn nötig.

---

### Fix-Verifikation: Workspace-Switch wischt aktive Akten-Daten

**Test:**
1. Login Workspace-A, Akte X öffnen, Diktat speichern
2. Workspace-Switch zu Workspace-B (über Workspace-Switcher, geplant Sprint AUTH-PERFEKT 2.0)
3. Erwartung: Akten-Daten der Workspace-A gewischt

**Status:** Workspace-Switcher noch nicht implementiert (Sprint AUTH-PERFEKT 2.0). Nicht in Phase 1.9 testbar.

---

### Optional — Sentry-Sentitive-Field-Filtering

Wenn Sentry/Error-Monitoring eingerichtet wird (Phase 4 Audit 21), Filter-Konfiguration für sensitive localStorage-Werte:

```js
Sentry.init({
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data?.key?.startsWith('prova_diktat_')) return null;
    if (breadcrumb.data?.key?.startsWith('prova_stellungnahme_')) return null;
    if (breadcrumb.data?.key === 'prova_auth_token') return null;
    return breadcrumb;
  }
});
```

→ Notiz für Audit 21 Phase 4.

---

## Severity-Zusammenfassung

| Severity | Anzahl Keys | Phase-1.9-Action |
|---|---:|---|
| CRITICAL | ~13 (Akten-Inhalte) | Logout-Wipe verifizieren ✅ |
| HIGH | ~14 (Auftraggeber-PII) | Logout-Wipe verifizieren ✅ |
| MEDIUM | ~30 (SV-Daten + Geschäfts-Caches + Auth-Token) | Doku, Token akzeptiert |
| LOW | ~13 (UI + Tot-Code Airtable) | Sprint 11+ Cleanup |
| INFO | ~3 (Test-Daten + Public-Keys) | – |

**Phase 1.9 Action:**
- ✅ Logout-Wipe verifizieren (Klick-Test) + ggf. fix
- Dokumentieren in `docs/public/SECURITY.md` warum Auth-Token in localStorage akzeptiert ist

---

## Reproduktion

```bash
# Working-Tree-Scan
grep -rE "(localStorage|sessionStorage)\.setItem\([^)]+\)" \
  --include="*.js" --include="*.html" \
  --exclude-dir=node_modules --exclude-dir=docs --exclude-dir=tests \
  | grep -oE "(localStorage|sessionStorage)\.setItem\(['\"]?[a-zA-Z_][a-zA-Z0-9_-]*['\"]?" \
  | sort -u
```

---

*Audit 11 abgeschlossen 02.05.2026 nachmittags*
