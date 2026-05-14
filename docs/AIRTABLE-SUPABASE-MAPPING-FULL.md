# AIRTABLE → SUPABASE SCHEMA-MAPPING

**Stand:** 2026-05-14
**Zweck:** Vorab-Lieferung für CC Sprint F Phase 2 — Caller-Migration ohne Phase 2.
**Verifiziert:** Live via Supabase-MCP gegen Production-DB cngteblrbpwsyypexjrv.

---

## TL;DR

- Airtable-Base `appJ7bLlAHZoxENWE` hat **29 Tabellen**.
- Supabase-Schema `public` hat **84 Tabellen + 20 Cockpit-Views** (umfangreichere Datenmodellierung).
- **Operative Daten in Supabase:** 1 Auftrag, 2 Kontakte, 2 Dokumente, 3 Users, 3 Workspaces (Marcel's Test-Account)
- **Operative Daten LEER in Supabase:** termine, fristen, eintraege, einwilligungen, leads_pipeline, ki_lernpool, empfehlungen
- **Stammdaten gut migriert:** normen_bibliothek (190), textbausteine (100), versicherungs_partner (10)
- **Daten-Verlust-Risk beim Airtable-Kill:** NIEDRIG (keine Pilot-Kunden, nur Marcels Test-Daten)

---

## Schema-Mapping Tabelle für Tabelle

### 1. SCHADENSFAELLE → auftraege

**Airtable:** `appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0` (SCHADENSFAELLE)
**Supabase:** `public.auftraege` (48 Spalten)
**Migration-Status:** ✅ Schema fertig, 1 Test-Row drin

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| ID | id (auto) | name change, type UUID statt text |
| Sachverstaendiger_ID | created_by_user_id | UUID-FK statt text |
| Auftrags_Nr | az | rename |
| Auftraggeber_Typ | auftraggeber_typ | ENUM |
| Auftraggeber_Name | (in kontakt via auftraggeber_kontakt_id) | normalisiert |
| Auftraggeber_Email | (in kontakt) | normalisiert |
| Versicherung | (in kontakt typ='versicherung') | normalisiert |
| Versicherungsschein_Nr | objekt->>'policennummer' (JSONB) | in objekt-JSONB |
| Schaden_Strasse | objekt->>'strasse' (JSONB) | in objekt-JSONB |
| PLZ | objekt->>'plz' | in objekt-JSONB |
| Ort | objekt->>'ort' | in objekt-JSONB |
| Schadensart | schadensart_label | rename |
| Schadensunterart | schadensart_kategorie | rename |
| Schadensdatum | schadensstichtag | rename |
| Status | status | ENUM statt singleSelect |
| Dringlichkeit | (jetzt in fristen-Tabelle) | strukturiert |
| Erstellt_Am | created_at | auto-managed |
| Abgeschlossen_Am | abgeschlossen_am | OK |
| Fotos_Anzahl | umfang_fotos | rename |
| Gutachten_PDF_URL | (dokumente.typ='kurzgutachten'+) | normalisiert |
| Schadenswert_Geschaetzt_EUR | kosten_geschaetzt_netto | rename |
| Notizen | details->>'notizen' (JSONB) | in details-JSONB |
| KI_Entwurf | fachurteil_text + ki_protokoll | strukturiert |
| Vollgutachten | dokumente.typ='vollgutachten' | normalisiert |
| sv_email | (über workspace_id → workspace_memberships → users.email) | RLS-managed |
| Aktenzeichen | az | rename |
| sv_stellungnahme_original | (in dokumente.typ='kurzstellungnahme') | normalisiert |
| sv_stellungnahme_final | fachurteil_text | rename + final |
| phase_aktuell | phase_aktuell | OK |
| phase_2..5_completed_at | auftrag_phasen (Tabelle) | normalisiert |

**Beispiel-Caller-Fix:**
```js
// Vorher (Airtable):
const records = await provaFetch('/.netlify/functions/airtable?table=SCHADENSFAELLE&filter={sv_email}="...');

// Nachher (Supabase):
const { data } = await sb.from('auftraege').select('*').is('deleted_at', null);
// (RLS filtert automatisch nach workspace_id)
```

---

### 2. TERMINE → termine

**Airtable:** `tblyMTTdtfGQjjmc2` (TERMINE)
**Supabase:** `public.termine` (32 Spalten)
**Migration-Status:** ⚠️ Schema fertig, **0 Rows drin** (alles in Airtable)

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| aktenzeichen | (über auftrag_id-FK → auftraege.az) | normalisiert |
| termin_datum | datum + uhrzeit_von (separate) | gesplittet |
| termin_typ | typ | rename + ENUM |
| objekt_adresse | ort_adresse + ort_plz + ort_ort | gesplittet |
| Status | status | ENUM |
| teilnehmer | teilnehmer | OK (jetzt text[]/jsonb) |
| erinnerung_24h | erinnerung_minuten (zahl) | flexibler |
| erinnerung_2h | erinnerung_minuten (zahl) | flexibler |
| notizen | **beschreibung** ← WICHTIG | rename + es gibt zusätzlich `notizen_nach_termin` |
| sv_email | (RLS via workspace_id) | RLS |
| auftragstyp | (über auftrag_id → auftraege.typ) | normalisiert |
| abgabefrist | (in fristen-Tabelle mit frist_typ='abgabe') | normalisiert |

**🐛 AKTUELLER BUG:** `termine-logic.js:62` ruft `column termine.notiz` → 400. Spalte heißt **beschreibung** (Haupt-Text) oder **notizen_nach_termin** (Protokoll danach). Code-Fix: `notiz` → `beschreibung`.

---

### 3. RECHNUNGEN → dokumente (typ='rechnung*')

**Airtable:** `tblF6MS7uiFAJDjiT` (RECHNUNGEN)
**Supabase:** `public.dokumente` mit `typ IN ('rechnung', 'rechnung_jveg', 'rechnung_stunden')` (59 Spalten)
**Migration-Status:** ⚠️ Schema fertig, **0 Rechnungs-Rows in dokumente**

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| Rechnungsnummer (formula) | doc_nummer | rename |
| Rechnungstyp | typ | ENUM: rechnung/rechnung_jveg/rechnung_stunden |
| empfaenger_name | (über kontakt_id-FK → kontakte) | normalisiert |
| empfaenger_Strasse | (in kontakte.adresse_strasse) | normalisiert |
| empfaenger_plz | (kontakte.plz) | normalisiert |
| empfaenger_ort | (kontakte.ort) | normalisiert |
| rechnungsdatum | rechnungsdatum | OK |
| aktenzeichen | (über auftrag_id → auftraege.az) | normalisiert |
| schadensnummer | (auftraege.az) | normalisiert |
| leistungszeitraum | leistungszeitraum_von + leistungszeitraum_bis | gesplittet |
| netto_betrag_eur | betrag_netto | rename |
| ust_satz | mwst_satz | rename |
| brutto_betrag_eur | betrag_brutto | rename |
| position_json | dokument_positionen (Tabelle) | normalisiert |
| pdf_url | pdf_url | OK |
| status | status | ENUM |
| faellig_am | **faelligkeit** | rename |
| mahnstufe | **mahn_stufe** | rename (Underscore) |
| mahngebuehren_eur | mahn_gebuehr | rename |
| bezahlt_am | bezahlt_at | rename |
| notizen | (separate notizen-Tabelle mit dokument_id-FK) | normalisiert |
| pdf_url_rechnung | pdf_url | duplikat |

**Bekannt aus Sprint D:** Frontend ruft `sb.from('rechnungen')` was nicht existiert. Fix in lib/prova-dashboard-widgets.js wurde gemacht (Commit 9bdfc3c), aber noch nicht live (sw.js v3220).

---

### 4. KONTAKTE → kontakte

**Airtable:** `tblMKmPLjRelr6Hal` (KONTAKTE)
**Supabase:** `public.kontakte` (37 Spalten)
**Migration-Status:** ✅ 2 Rows drin

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| Name | nachname | rename |
| Vorname | vorname | OK |
| Typ | typ | ENUM (auftraggeber/geschaedigter/anwalt/versicherung/...) |
| Firma | firma | OK |
| Strasse | adresse_strasse + adresse_nr | gesplittet |
| PLZ | plz | OK |
| Ort | ort | OK |
| Telefon | telefon | OK |
| Email | email | OK |
| Ansprechpartner | (separate Spalten oder im notizen) | merge |
| Notizen | notizen | OK |
| Faelle_Anzahl | (computed via v_kontakte_overview.auftraege_total) | View |
| sv_email | (RLS via workspace_id) | RLS |

---

### 5. SACHVERSTEANDIGE → users + workspaces + workspace_memberships

**Airtable:** `tbladqEQT3tmx4DIB` (SACHVERSTEANDIGE)
**Supabase:** Auf 3 Tabellen aufgesplittet:
- `users` (auth+Profil) — 33 Spalten
- `workspaces` (Billing+Konfig) — 39 Spalten
- `workspace_memberships` (Many-to-Many) — 14 Spalten

| Airtable-Field | Supabase | Drift |
|---|---|---|
| Vorname/Nachname | users.name | merge |
| Email | auth.users.email + users.email | dupliziert |
| Telefon/Mobil/Fax | users.telefon/mobil/fax | OK |
| Strasse/PLZ/Ort | users.anschrift/plz/ort | rename |
| Paket | workspaces.abo_tier | rename |
| trial_end | workspaces.abo_trial_endet_am | rename |
| subscription_status | workspaces.abo_status | rename |
| stripe_customer_id | workspaces.stripe_customer_id | OK |
| stripe_subscription_id | workspaces.stripe_subscription_id | OK |
| password_hash | (auth.users via Supabase Auth) | managed |
| two_factor_secret | users.totp_secret | rename |
| two_factor_enabled | users.totp_enabled | rename |
| smtp_host/port/user/from_name/provider | workspaces.briefkopf->>'email_*' (JSONB?) | TBD — möglicherweise in users.letterhead_config |
| Anrede/Titel/Berufsbezeichnung | users.titel | merge |
| IBAN/BIC/Bank/USt_IdNr | workspaces.billing_*-Felder? | TBD |
| dashboard_config | (separate user-Preferences) | normalisiert |
| Faelle_Zusatz | (workspaces oder users?) | TBD |
| onboarding_done | users.onboarding_completed_at | rename |

**Note:** SV-Profile sind das komplexeste Mapping — Marcel-Verify nötig bei IBAN/SMTP-Migration.

---

### 6. AUDIT_TRAIL → audit_trail

**Airtable:** `tblqQmMwJKxltXXXl` (AUDIT_TRAIL)
**Supabase:** `public.audit_trail` (19 Spalten)
**Migration-Status:** ✅ 4 Rows drin

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| aktenzeichen | (über entity_typ='auftrag' + entity_id → auftraege.az) | normalisiert |
| sv_email | (über workspace_id → users.email) | RLS |
| paket | (über workspace_id → workspaces.abo_tier) | RLS |
| aktion | action | rename ENUM |
| ki_modell | ki_model | rename |
| sv_validiert | (in payload-JSONB) | JSONB |
| timestamp | created_at | rename |
| input_hash | (in payload) | JSONB |
| output_laenge | (in payload) | JSONB |
| aenderungsquote | (in payload) | JSONB |
| offenlegungstext | (in payload + eu_ai_act_disclosed bool) | strukturiert |
| notizen | (in payload) | JSONB |

**Plus neue Spalten:** integrity_hash, prev_hash (Hash-Chain), source, ki_confidence, original_ki_ref, kategorie.

---

### 7. EINTRAEGE → eintraege

**Airtable:** `tblTcapjDGDI2f58h` (EINTRAEGE)
**Supabase:** `public.eintraege` (20 Spalten)
**Migration-Status:** ⚠️ Schema fertig, **0 Rows drin**

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| name | titel | rename |
| fall_az | (über auftrag_id-FK) | normalisiert |
| sv_email | (RLS via workspace_id) | RLS |
| typ | typ | ENUM |
| text_volltext | content | rename |
| text_revidiert_von | (in audit_trail mit entity_typ='eintrag') | normalisiert |
| aufgenommen_am | datum | rename |
| dauer_sekunden | (in audio_dateien-Tabelle) | normalisiert |
| transkription_modell | (in audio_dateien.transkriptions_modell) | normalisiert |
| audio_url | (in audio_dateien-Tabelle via audio_dateien_ids[]) | normalisiert |
| erstellt_am | created_at | rename |

---

### 8. BRIEFE → dokumente (typ='brief')

**Airtable:** `tblSzxvnkRE6B0thx` (BRIEFE)
**Supabase:** `public.dokumente` mit `typ='brief'`
**Migration-Status:** ⚠️ Schema fertig, 0 Brief-Rows

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| sv_email | (RLS) | RLS |
| empfaenger_name | (kontakt_id-FK → kontakte) | normalisiert |
| empfaenger_email | (kontakte.email) | normalisiert |
| betreff | betreff | OK |
| inhalt | inhalt_text + inhalt_strukturiert | gesplittet |
| aktenzeichen | (auftrag_id-FK → auftraege.az) | normalisiert |
| brief_typ | (in inhalt_strukturiert oder tags) | TBD |
| versand_status | status | rename |
| gesendet_am | sent_at | rename |
| brief_vorlage_datei | pdfmonkey_template_id | rename |
| brief_pdf_url | pdf_url | rename |
| mahnstufe | mahn_stufe | rename |

---

### 9. KI_STATISTIK → ki_protokoll

**Airtable:** `tblv9F8LEnUC3mKru` (KI_STATISTIK)
**Supabase:** `public.ki_protokoll` (35 Spalten — viel detaillierter)
**Migration-Status:** Schema fertig, Daten leer

| Airtable-Field | Supabase-Column |
|---|---|
| Schadenart | (über auftrag_id → auftraege.schadensart_label) |
| Ursache_Quelle | (in payload) |
| Ursache_Kategorien | (in payload) |
| Eigentext_Zeichen | output_laenge_chars |
| Weg | feature_kontext |
| Diktat | (über audio_id-FK) |
| Datum | created_at |

**Plus neue:** modell, modell_version, provider, token_input, token_output, kosten_eur, dauer_ms, status, konjunktiv_check_passed, halluzinations_check_passed.

---

### 10. KI_LERNPOOL → ki_lernpool

**Airtable:** `tbl4LEsMvcDKFCYaF` (KI_LERNPOOL)
**Supabase:** `public.ki_lernpool` (16 Spalten)
**Migration-Status:** ⚠️ 0 Rows. Hat `importiert_aus_airtable` + `airtable_record_id` — bereit für Import.

| Airtable-Field | Supabase-Column | Drift |
|---|---|---|
| Schadenart | schadenart | OK |
| SV_Ursache | sv_ursache_pseudonym | + Pseudonymisierung |
| Datum | datum | OK |
| foto_beschreibung | foto_beschreibung_pseudonym | + Pseudonymisierung |
| foto_tags | foto_tags | OK |

---

### 11. PIPELINE_AKQUISE → leads_pipeline

**Airtable:** `tblK7a3mBdsrxsrp5` (PIPELINE_AKQUISE)
**Supabase:** `public.leads_pipeline` (28 Spalten)
**Migration-Status:** Schema fertig + `importiert_aus_airtable` Spalten

| Airtable-Field | Supabase |
|---|---|
| Vorname/Nachname | vorname/nachname |
| Firma | firma |
| Email | email |
| Telefon | telefon |
| PLZ/Ort | plz/ort |
| Spezialisierung | spezialisierung |
| Quelle | quelle |
| Erstkontakt_Datum | erstkontakt_datum |
| Status | (über stufe ENUM) |
| Stufe | stufe |
| Demo_Datum | demo_geplant_am + demo_durchgefuehrt_am |
| MRR_EUR | erwarteter_mrr_eur |
| Abschluss_Wahrscheinlichkeit_Pct | abschluss_wahrscheinlichkeit_pct |
| Naechster_Schritt | naechster_schritt |
| Verbands_Mitglied | verbands_mitglied |
| Notizen | notizen |

---

### 12. EMPFEHLUNGEN → empfehlungen + referrals

**Airtable:** `tblXYzXuIwRhBv4ei` (EMPFEHLUNGEN)
**Supabase:** Aufgesplittet auf `empfehlungen` (19 Spalten — Auszahlungs-Tracking) + `referrals` (27 Spalten — Code-Verwaltung)

| Airtable-Field | Supabase |
|---|---|
| empfehler_email | empfehlungen.empfehler_user_id |
| neuer_sv_email | empfehlungen.neuer_user_id + neuer_email |
| paket | empfehlungen.paket |
| abschluss_ts | empfehlungen.abschluss_at |
| bonus_betrag | empfehlungen.bonus_betrag_eur |
| bonus_status | empfehlungen.status |
| auszahlung_ts | empfehlungen.auszahlung_at |
| ref_code | referrals.code |

---

### 13. TEXTBAUSTEINE + TEXTBAUSTEINE_CUSTOM → textbausteine

**Airtable:** `tbljPQrdMDsqUzieD` (global) + `tblDS8NQxzceGedJO` (custom per SV)
**Supabase:** `public.textbausteine` (22 Spalten, mit `is_global` flag)
**Migration-Status:** ✅ 100 Rows drin (vermutlich beide Tabellen schon konsolidiert)

| Airtable | Supabase |
|---|---|
| Titel | titel |
| Text | text |
| Kategorie | kategorie |
| Tags | tags |
| sv_email | (workspace_id) — globale haben is_global=true |
| Nutzungen | nutzungen |

---

### 14. NORMEN → normen_bibliothek

**Airtable:** `tblnceVJIW7BjHsPF` (NORMEN)
**Supabase:** `public.normen_bibliothek` (35 Spalten — viel reicher)
**Migration-Status:** ✅ 190 Rows drin

| Airtable | Supabase |
|---|---|
| Norm-Nummer | norm_nr |
| Titel | titel |
| Bereich | bereich |
| Schadensarten | schadensarten |
| Anwendung | anwendung |
| Grenzwerte | grenzwerte + grenzwerte_strukturiert |
| Messtechnik | messtechnik |
| Gutachter-Hinweis | gutachter_hinweis |
| Häufigkeit | haeufigkeit |
| Status | aktiv |
| Aktiv | aktiv |

**Plus:** embedding (vector für RAG), version_jahr, ersatz_fuer_norm_id, quelle/quellen_url, nutzungs_count.

---

### 15. VERSICHERUNGS_PARTNER → versicherungs_partner

**Airtable:** `tbleqbvmGQd2sAGC9`
**Supabase:** `public.versicherungs_partner` (26 Spalten)
**Migration-Status:** ✅ 10 Rows drin (`importiert_aus_airtable` true)

1:1-Mapping, alle Felder vorhanden.

---

### 16. POSITIONEN_DATENBANK → positionen_bibliothek

**Airtable:** `tblQ2WfO1LucdEZNE`
**Supabase:** `public.positionen_bibliothek` (25 Spalten)
**Migration-Status:** Schema mit `importiert_aus_airtable`

Standard-Mapping (Kategorie, Schadensart, Bezeichnung, Einheit, EP_Min/Median/Max_EUR, VOB_Abschnitt).

---

### 17. SUPPORT_TICKETS → support_tickets

**Airtable:** `tblEb3A4dukGX8GFs`
**Supabase:** `public.support_tickets` (42 Spalten — viel reicher mit Browser-Snapshot, AI-Response, FAQ-Match)

Plus zugehörige Tabellen: `support_replies`, `support_attachments`.

---

### 18. EINWILLIGUNGEN → einwilligungen

**Airtable:** `tblwgUQgtBWckPMHp`
**Supabase:** `public.einwilligungen` (18 Spalten + RPC `record_einwilligung()`)
**Migration-Status:** 0 Rows, mit `importiert_aus_airtable`-Spalten

---

### 19. RECHTSDOKUMENTE → rechtsdokumente

**Airtable:** `tbljJkS3HOvtmpAGT`
**Supabase:** `public.rechtsdokumente` (23 Spalten)
**Migration-Status:** mit `importiert_aus_airtable`-Spalten

---

### 20. GUTACHTEN_TEMPLATES → dokument_templates

**Airtable:** `tblW1DGrXIKoSTvJN`
**Supabase:** `public.dokument_templates` (28 Spalten) mit `importiert_aus_airtable`

---

### 21. KI_PROMPT_LIBERY → ki_prompt_templates

**Airtable:** `tblHYTzBmSlYIcgNg`
**Supabase:** `public.ki_prompt_templates` (35 Spalten — A/B-Testing-fähig) mit `importiert_aus_airtable`

---

### 22. PUSH_SUBSCRIPTIONS → push_subscriptions

**Airtable:** `tblAiF38HeS1R1Umj`
**Supabase:** `public.push_subscriptions` (13 Spalten)

| Airtable | Supabase |
|---|---|
| Email | (über user_id-FK) |
| Subscription | (gesplittet: endpoint, keys_p256dh, keys_auth) |
| Endpoint | endpoint |
| Aktiv | aktiv |

---

### Tabellen ohne Supabase-Pendant (KEINE Migration nötig)

- **VERSICHERUNGS_PARTNER** ✅ migriert (siehe 15)
- **MAKE_SZENARIEN_LOG** — Make-Automation-Log, KANN deprecated bleiben (Make hat eigene Logs)
- **SYSTEM_KONIGURATION** — kann durch `service_endpoints` + `feature_flags` ersetzt werden, Detail-Mapping bei Bedarf
- **STATISTIKEN** — wird ersetzt durch Cockpit-Views (v_cockpit_*)
- **ADMIN_FINANZEN** — wird ersetzt durch v_cockpit_mrr + v_cockpit_jahres_verlauf + v_cockpit_master_uebersicht
- **PASSWORD_RESET_TOKENS** — Supabase Auth managed das automatisch
- **LOGIN_ATTEMPTS** — Supabase Auth + user_sessions
- **WORKFLOW_ERRORS** — public.workflow_errors (Supabase-Pendant)
- **EINTRAGSAMMLUNG** — wird durch eintraege ersetzt
- **GUTEACHTEN** (Typo im Airtable-Name) — wird durch dokumente.typ='vollgutachten' ersetzt

---

## Häufigste Drift-Patterns (für CC zum schnellen Finden)

```bash
# In CC's Grep nach diesen alten Namen suchen:

# Tabellen die nicht existieren:
grep -rln "from('rechnungen')\|from(\"rechnungen\")" --include="*.js"
grep -rln "from('mahnungen')\|from(\"mahnungen\")" --include="*.js"
grep -rln "from('schadensfaelle')\|from(\"schadensfaelle\")" --include="*.js"
grep -rln "from('gutachten')\|from(\"gutachten\")" --include="*.js"
grep -rln "from('briefe')\|from(\"briefe\")" --include="*.js"
grep -rln "from('einwilligung')\|from(\"einwilligung\")" --include="*.js"

# Falsche Spaltennamen:
grep -rln "termine\.notiz\|termine\.termin_datum\|termine\.objekt_adresse"
grep -rln "fristen\.faellig_am\|fristen\.titel"
grep -rln "rechnungsnr\|mahnung_stufe" --include="*.js"
grep -rln "doc\.rechnungsnummer\|doc\.brutto_betrag_eur"

# Wrapper-Caller (alle migrieren):
grep -rln "/.netlify/functions/airtable" --include="*.js" --include="*.html"
grep -rln "prova-sv-airtable" --include="*.js" --include="*.html"
```

---

## Migration-Pattern (für CC einsetzbar)

```js
// Pattern: Read-Migration
// Vorher:
const r = await fetch('/.netlify/functions/airtable?table=SCHADENSFAELLE');
const { records } = await r.json();
const data = records.map(rec => rec.fields);

// Nachher:
const mod = await import('/lib/supabase-client.js');
const sb = mod.supabase;
const { data, error } = await sb.from('auftraege')
  .select('*')
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
// RLS filtert automatisch nach workspace_id
```

```js
// Pattern: Write-Migration
// Vorher:
await fetch('/.netlify/functions/airtable', { 
  method: 'POST', 
  body: JSON.stringify({ table: 'KONTAKTE', fields: { Name: 'Mustermann', sv_email: '...' } })
});

// Nachher:
const adapters = await import('/lib/prova-supabase-adapters.js');
const wsId = await adapters.getCurrentWorkspaceId();
const { data, error } = await sb.from('kontakte').insert({
  workspace_id: wsId,  // RLS-Pflicht!
  nachname: 'Mustermann',
  typ: 'auftraggeber'
}).select().single();
```

---

## Cockpit-Views (read-only Helper für CC)

Statt komplexe JOINs neu schreiben — diese Views nutzen wenn passend:

- `v_auftraege_overview` — Auftrag + Counts (befunde, messwerte, etc.)
- `v_auftrag_360` — Vollständige Akten-Übersicht (Inkl. Foto/Audio-Counts)
- `v_kontakte_overview` — Kontakte mit Auftrags-Counts + Offene Rechnungssumme
- `v_cockpit_mrr` — Monthly Recurring Revenue
- `v_cockpit_master_uebersicht` — Founder-Dashboard-Daten
- `v_cockpit_funnel` — Signup→Konversion-Funnel
- `v_cockpit_ki_performance` — KI-Modell-Stats
- `v_cockpit_ki_kosten_pro_user` — KI-Kosten pro User
- `v_cockpit_kunden_liste` — Komplette Kundenliste mit Billing-Daten

⚠️ **Note:** Alle Cockpit-Views sind `SECURITY DEFINER` → bypassen RLS. Nur für Founder-Cockpit nutzen, nicht für End-User-Pages.

---

## Was Marcel NACH Sprint F manuell macht

1. Airtable-Base `appJ7bLlAHZoxENWE` → "Trash" oder "Archive" (Marcel-Entscheidung)
2. Netlify ENV-Vars löschen: `AIRTABLE_PAT`, `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`
3. Make.com Airtable-Connection ID `5417164` deactivieren
4. Make.com Szenarien die noch Airtable lesen/schreiben → Trigger umstellen oder pausieren

---

**ENDE** — diese Datei kann CC direkt als Phase-2-Output nutzen. Spart ihm 30-45 Min.
