# 📊 PROVA Supabase Schema Reference (Stand: 11.05.2026)

**Project ID:** `cngteblrbpwsyypexjrv`  
**Region:** eu-central-1 (Frankfurt)  
**PostgreSQL:** 17.6.1.111  
**Total Tables:** 64 (alle mit RLS)

**🚨 CC: NIEMALS Code schreiben ohne diese Doku konsultiert zu haben!**

---

## 🔑 KRITISCHE NAMING-REGELN

| FALSCH (alte Annahme) | RICHTIG (echtes Schema) |
|---|---|
| `schadensfaelle` | **`auftraege`** (Universal-Tabelle für alle 10 Gutachten-Typen) |
| `workspace_members` | **`workspace_memberships`** (M:N mit Rollen-System) |
| `service_health` | **`system_health`** (mit `kategorie` ENUM) |
| `created_at`/`updated_at` | gleich (✅) |
| `erstellt_von`/`erstellt_am` | **`created_by_user_id`/`created_at`** |
| `aktualisiert_am` | **`updated_at`** |
| `deleted_at` | gleich (✅) Soft-Delete-Pattern |

---

## 📋 ALLE TABELLEN (64) — Übersicht

### Multi-Tenancy & Auth

| Tabelle | Zweck | Rows |
|---|---|---|
| `workspaces` | Multi-Tenancy Foundation. Solo=1 User, Team=mehrere User pro Workspace. | 3 |
| `users` | SV-Profile, 1:1 mit auth.users. Persönliche Daten + Settings. | 3 |
| `workspace_memberships` | M:N zwischen User und Workspace mit Rollen-System | 3 |
| `user_sessions` | Session-Tracking für Multi-Device + AUTH-COCKPIT | 0 |
| `workspace_invitations` | (kein Kommentar) | 0 |
| `api_keys` | (kein Kommentar) | 0 |

### Auftrag-System (Universal)

| Tabelle | Zweck | Rows |
|---|---|---|
| `auftraege` | Universale Auftrag-Tabelle — alle 10 Typen mit JSONB für typ-spezifische Felder | 1 |
| `auftrag_kontakte` | M:N — ein Auftrag kann mehrere Kontakte mit verschiedenen Rollen haben | 0 |
| `auftrag_phasen` | (kein Kommentar) | 0 |
| `auftrag_normen` | (kein Kommentar) | 0 |
| `az_sequences` | (kein Kommentar) | 0 |

### Akten-Daten (Inhalte)

| Tabelle | Zweck | Rows |
|---|---|---|
| `ortstermine` | (kein Kommentar) | 0 |
| `eintraege` | (kein Kommentar) | 0 |
| `anknuepfungstatsachen` | (kein Kommentar) | 0 |
| `befunde` | (kein Kommentar) | 0 |
| `messwerte` | (kein Kommentar) | 0 |
| `messgeraete` | (kein Kommentar) | 0 |
| `ursachen_hypothesen` | (kein Kommentar) | 0 |
| `sanierungspositionen` | (kein Kommentar) | 0 |
| `notizen` | (kein Kommentar) | 0 |

### Dokumente & Medien

| Tabelle | Zweck | Rows |
|---|---|---|
| `dokumente` | Universale Dokument-Tabelle: Gutachten-PDFs, Rechnungen, Briefe, Mahnungen, Besc | 2 |
| `dokument_positionen` | (kein Kommentar) | 0 |
| `dokument_templates` | (kein Kommentar) | 0 |
| `dok_sequences` | (kein Kommentar) | 0 |
| `fotos` | Foto-Records. EXIF-Strip Pflicht (DSGVO). 10+ Jahre Aufbewahrung in EU Storage. | 0 |
| `audio_dateien` | Diktat-Audios. Whisper-Transkription, Pseudonymisierung Pflicht. | 0 |
| `anhaenge` | Hochgeladene Dokumente von außen — Klageschriften, Verträge, Privatgutachten. Mi | 0 |

### Termine & Notifications

| Tabelle | Zweck | Rows |
|---|---|---|
| `termine` | Universale Termin-Tabelle mit iCal-Support für Outlook/Google-Subscription | 0 |
| `notifications` | In-App-Benachrichtigungen, 4 Kategorien (aufgaben/termine/achtung/system) | 0 |
| `push_subscriptions` | (kein Kommentar) | 0 |

### Kontakte & Organisationen

| Tabelle | Zweck | Rows |
|---|---|---|
| `kontakte` | Universale Kontakt-Tabelle — Personen + Firmen | 2 |
| `versicherungs_partner` | (kein Kommentar) | 0 |

### KI-Compliance (DSGVO + EU AI Act)

| Tabelle | Zweck | Rows |
|---|---|---|
| `ki_protokoll` | Jeder KI-Call dokumentiert. DSGVO Art. 30 + EU AI Act + Kosten-Tracking. | 0 |
| `ki_lernpool` | Anonymisierte SV-Ursachen. Datenbank waechst, NICHT "KI lernt". | 0 |
| `ki_feedback` | SV-Bewertung nach KI-Antwort. Pflegt erfolgsquote in prompt_templates. | 0 |
| `ki_prompt_templates` | KI-Prompt-Bibliothek. Nur Founder editierbar. Versioniert. A/B-testbar. | 0 |
| `wissen_diagnostik` | Marcel-Fachwissen strukturiert. Mit pgvector fuer KI-RAG. | 0 |

### DSGVO & Audit

| Tabelle | Zweck | Rows |
|---|---|---|
| `audit_trail` | INSERT-only Audit-Log. UPDATE/DELETE durch RLS verboten. DSGVO Art. 30 + IHK-SVO | 4 |
| `einwilligungen` | DSGVO Art. 7 Pflicht: Einwilligungs-Dokumentation mit Inhalts-Hash | 0 |
| `rechtsdokumente` | (kein Kommentar) | 0 |
| `impersonation_log` | DSGVO-Pflicht: jedes Login-as-User dokumentiert | 0 |

### Bibliotheken (Master-Daten)

| Tabelle | Zweck | Rows |
|---|---|---|
| `normen_bibliothek` | Normen-Bibliothek hybrid: globale Master-Normen (Marcel-pflegt) + Workspace-spez | 0 |
| `textbausteine` | Textbausteine zusammengefuehrt: globale (is_global=TRUE) + workspace-spezifische | 0 |
| `positionen_bibliothek` | (kein Kommentar) | 0 |

### Operations & Health

| Tabelle | Zweck | Rows |
|---|---|---|
| `system_health` | (kein Kommentar) | 0 |
| `workflow_errors` | (kein Kommentar) | 0 |
| `feature_flags` | (kein Kommentar) | 0 |
| `feature_events` | Granulares Click-Tracking fuer Cockpit-Heatmap + Drop-off-Funnel | 2 |

### Support & Onboarding

| Tabelle | Zweck | Rows |
|---|---|---|
| `support_tickets` | (kein Kommentar) | 0 |
| `support_replies` | (kein Kommentar) | 0 |
| `support_attachments` | (kein Kommentar) | 0 |
| `onboarding_progress` | (kein Kommentar) | 3 |
| `user_workflow_settings` | Triple-Mode-Settings pro User: A=Standard, B=Editor, C=Word-Vorlagen | 0 |
| `user_vorlagen` | Mode C: User-eigene Word-Vorlagen. variables=[$Var1,$Var2], variable_mapping={"$ | 0 |

### Stripe & Billing

| Tabelle | Zweck | Rows |
|---|---|---|
| `stripe_events` | (kein Kommentar) | 0 |
| `email_log` | (kein Kommentar) | 0 |

### Marketing & Growth

| Tabelle | Zweck | Rows |
|---|---|---|
| `referrals` | MEGA²⁷ Referral-System: Founding-Member empfehlen Kollegen, 30-Tage-Hold + Auto- | 0 |
| `churn_reasons` | (kein Kommentar) | 0 |
| `leads_pipeline` | (kein Kommentar) | 0 |
| `empfehlungen` | (kein Kommentar) | 0 |

### Import & Tags

| Tabelle | Zweck | Rows |
|---|---|---|
| `import_jobs` | (kein Kommentar) | 0 |
| `import_records` | (kein Kommentar) | 0 |
| `tags_global` | (kein Kommentar) | 0 |
| `bookmarks` | (kein Kommentar) | 0 |

---

## 🎯 DETAIL-SCHEMAS (Wichtigste Tabellen für W12+)

### `workspaces`

**Kommentar:** Multi-Tenancy Foundation. Solo=1 User, Team=mehrere User pro Workspace.

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `typ` | `workspace_typ` | `'solo'::workspace_typ` | ✓ |
| `name` | `text` | `—` | ✓ |
| `slug` | `text` | `—` | ✓ |
| `briefkopf` | `jsonb` | `'{}'::jsonb` | ✓ |
| `abo_tier` | `abo_tier` | `'solo'::abo_tier` | ✓ |
| `abo_status` | `abo_status` | `'trial'::abo_status` | ✓ |
| `abo_trial_endet_am` | `timestamptz` | `—` | ✓ |
| `abo_aktiv_seit` | `timestamptz` | `—` | ✓ |
| `abo_gekuendigt_am` | `timestamptz` | `—` | ✓ |
| `stripe_customer_id` | `text` | `—` | ✓ |
| `stripe_subscription_id` | `text` | `—` | ✓ |
| `datev_settings` | `jsonb` | `'{}'::jsonb` | ✓ |
| `preferred_ki_provider` | `ki_provider` | `'openai'::ki_provider` | ✓ |
| `ki_pseudonymisierung_aktiv` | `bool` | `true` | ✓ |
| `max_auftraege_pro_monat` | `int4` | `30` | ✓ |
| `max_team_members` | `int4` | `1` | ✓ |
| `storage_quota_mb` | `int4` | `5120` | ✓ |
| `dsgvo_aufbewahrung_jahre` | `int4` | `10` | ✓ |
| `dsgvo_loeschen_geplant_am` | `timestamptz` | `—` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |
| `updated_at` | `timestamptz` | `now()` | ✓ |
| `deleted_at` | `timestamptz` | `—` | ✓ |
| `abrechnungs_intervall` | `abrechnungs_intervall` | `'monatlich'::abrechnungs_intervall` | ✓ |
| `mrr_eur_snapshot` | `numeric` | `—` | ✓ |
| `jahresabo_rabatt_pct` | `numeric` | `0` | ✓ |
| `stripe_price_id` | `text` | `—` | ✓ |
| `naechste_zahlung_am` | `date` | `—` | ✓ |
| `letzte_zahlung_am` | `date` | `—` | ✓ |
| `letzte_zahlung_betrag_eur` | `numeric` | `—` | ✓ |
| `gesamtzahlungen_lifetime_eur` | `numeric` | `0` | ✓ |
| `kuendigung_zum_am` | `date` | `—` | ✓ |
| `kuendigung_grund_kategorie` | `text` | `—` | ✓ |
| `billing_email` | `text` | `—` | ✓ |
| `billing_kontakt_name` | `text` | `—` | ✓ |
| `zahlungsmethode` | `text` | `—` | ✓ |
| `zahlungsmethode_letzte_4` | `text` | `—` | ✓ |

### `users`

**Kommentar:** SV-Profile, 1:1 mit auth.users. Persönliche Daten + Settings.

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `—` | ✓ |
| `email` | `text` | `—` | ✓ |
| `email_verified` | `bool` | `false` | ✓ |
| `name` | `text` | `—` | ✓ |
| `titel` | `text` | `—` | ✓ |
| `qualifikation` | `text` | `—` | ✓ |
| `sachgebiet` | `text` | `—` | ✓ |
| `bestellungsstelle` | `text` | `—` | ✓ |
| `anschrift` | `text` | `—` | ✓ |
| `plz` | `text` | `—` | ✓ |
| `ort` | `text` | `—` | ✓ |
| `telefon` | `text` | `—` | ✓ |
| `mobil` | `text` | `—` | ✓ |
| `fax` | `text` | `—` | ✓ |
| `signatur_storage_path` | `text` | `—` | ✓ |
| `stempel_storage_path` | `text` | `—` | ✓ |
| `locale` | `text` | `'de-DE'::text` | ✓ |
| `timezone` | `text` | `'Europe/Berlin'::text` | ✓ |
| `notification_settings` | `jsonb` | `'{"push_aktiv": true, "email_neuer_auftr…` | ✓ |
| `onboarding_completed_at` | `timestamptz` | `—` | ✓ |
| `last_login_at` | `timestamptz` | `—` | ✓ |
| `last_active_at` | `timestamptz` | `—` | ✓ |
| `totp_secret` | `text` | `—` | ✓ |
| `totp_enabled` | `bool` | `false` | ✓ |
| `is_founder` | `bool` | `false` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |
| `updated_at` | `timestamptz` | `now()` | ✓ |
| `deleted_at` | `timestamptz` | `—` | ✓ |
| `letterhead_config` | `jsonb` | `'{}'::jsonb` | ✓ |

### `workspace_memberships`

**Kommentar:** M:N zwischen User und Workspace mit Rollen-System

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `user_id` | `uuid` | `—` | ✓ |
| `rolle` | `member_rolle` | `'sv'::member_rolle` | ✓ |
| `can_invite_members` | `bool` | `false` | ✓ |
| `can_manage_billing` | `bool` | `false` | ✓ |
| `can_export_data` | `bool` | `false` | ✓ |
| `can_delete_records` | `bool` | `false` | ✓ |
| `invited_by_user_id` | `uuid` | `—` | ✓ |
| `invited_at` | `timestamptz` | `—` | ✓ |
| `accepted_at` | `timestamptz` | `—` | ✓ |
| `is_active` | `bool` | `true` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |
| `updated_at` | `timestamptz` | `now()` | ✓ |

### `auftraege`

**Kommentar:** Universale Auftrag-Tabelle — alle 10 Typen mit JSONB für typ-spezifische Felder

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `typ` | `auftrag_typ` | `—` | ✓ |
| `az` | `text` | `—` | ✓ |
| `status` | `auftrag_status` | `'entwurf'::auftrag_status` | ✓ |
| `zweck` | `auftrag_zweck` | `'privat'::auftrag_zweck` | ✓ |
| `phase_aktuell` | `int4` | `1` | ✓ |
| `phase_max` | `int4` | `3` | ✓ |
| `titel` | `text` | `—` | ✓ |
| `schadensart_label` | `text` | `—` | ✓ |
| `schadensart_kategorie` | `text` | `—` | ✓ |
| `fragestellung` | `text` | `—` | ✓ |
| `schadensstichtag` | `date` | `—` | ✓ |
| `auftragsdatum` | `date` | `—` | ✓ |
| `gutachtendatum` | `date` | `—` | ✓ |
| `abgeschlossen_am` | `timestamptz` | `—` | ✓ |
| `objekt` | `jsonb` | `'{}'::jsonb` | ✓ |
| `details` | `jsonb` | `'{}'::jsonb` | ✓ |
| `fachurteil_text` | `text` | `—` | ✓ |
| `fachurteil_eigenleistung_chars` | `int4` | `—` | ✓ |
| `kurzbeantwortung` | `text` | `—` | ✓ |
| `grenzen_sachkunde` | `text` | `—` | ✓ |
| `kosten_geschaetzt_netto` | `numeric` | `—` | ✓ |
| `kosten_geschaetzt_brutto` | `numeric` | `—` | ✓ |
| `kosten_summe_card_label` | `text` | `—` | ✓ |
| `ki_anzeige_datum` | `date` | `—` | ✓ |
| `ki_anzeige_empfaenger` | `text` | `—` | ✓ |
| `ki_tasks` | `jsonb` | `'{}'::jsonb` | ✓ |
| `hilfskraefte` | `jsonb` | `'[]'::jsonb` | ✓ |
| `parent_auftrag_id` | `uuid` | `—` | ✓ |
| `umfang_seiten` | `int4` | `—` | ✓ |
| `umfang_anlagen` | `int4` | `0` | ✓ |
| `umfang_fotos` | `int4` | `0` | ✓ |
| `search_vector` | `tsvector` | `—` | ✓ |
| `tags` | `_text` | `'{}'::text[]` | ✓ |
| `is_template` | `bool` | `false` | ✓ |
| `created_by_user_id` | `uuid` | `—` | ✓ |
| `assigned_to_user_id` | `uuid` | `—` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |
| `updated_at` | `timestamptz` | `now()` | ✓ |
| `archiviert_am` | `timestamptz` | `—` | ✓ |
| `deleted_at` | `timestamptz` | `—` | ✓ |
| `vorlage_id` | `uuid` | `—` | ✓ |
| `beweisbeschluss_pdf_url` | `text` | `—` | ✓ |
| `beweisbeschluss_extrakt` | `jsonb` | `—` | ✓ |
| `is_demo` | `bool` | `false` | ✓ |

### `eintraege`

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `auftrag_id` | `uuid` | `—` | ✓ |
| `ortstermin_id` | `uuid` | `—` | ✓ |
| `typ` | `eintrag_typ` | `'text'::eintrag_typ` | ✓ |
| `nr` | `int4` | `0` | ✓ |
| `datum` | `date` | `CURRENT_DATE` | ✓ |
| `titel` | `text` | `—` | ✓ |
| `content` | `text` | `—` | ✓ |
| `audio_dateien_ids` | `_uuid` | `'{}'::uuid[]` | ✓ |
| `foto_ids` | `_uuid` | `'{}'::uuid[]` | ✓ |
| `pseudonymisiert` | `bool` | `false` | ✓ |
| `konjunktiv_check_passed` | `bool` | `—` | ✓ |
| `search_vector` | `tsvector` | `—` | ✓ |
| `created_by_user_id` | `uuid` | `—` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |
| `updated_at` | `timestamptz` | `now()` | ✓ |

### `system_health`

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `kategorie` | `health_check_kategorie` | `—` | ✓ |
| `component` | `text` | `—` | ✓ |
| `status` | `text` | `—` | ✓ |
| `response_time_ms` | `int4` | `—` | ✓ |
| `error_rate_pct` | `numeric` | `—` | ✓ |
| `details` | `jsonb` | `—` | ✓ |
| `error_message` | `text` | `—` | ✓ |
| `sampled_at` | `timestamptz` | `now()` | ✓ |
| `window_minutes` | `int4` | `5` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |

### `fotos`

**Kommentar:** Foto-Records. EXIF-Strip Pflicht (DSGVO). 10+ Jahre Aufbewahrung in EU Storage.

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `auftrag_id` | `uuid` | `—` | ✓ |
| `ortstermin_id` | `uuid` | `—` | ✓ |
| `kontakt_id` | `uuid` | `—` | ✓ |
| `eintrag_id` | `uuid` | `—` | ✓ |
| `dokument_id` | `uuid` | `—` | ✓ |
| `typ` | `foto_typ` | `'detail'::foto_typ` | ✓ |
| `storage_bucket` | `text` | `'sv-files'::text` | ✓ |
| `storage_path` | `text` | `—` | ✓ |
| `thumbnail_path` | `text` | `—` | ✓ |
| `original_filename` | `text` | `—` | ✓ |
| `mime_type` | `text` | `'image/jpeg'::text` | ✓ |
| `bytes` | `int4` | `—` | ✓ |
| `width` | `int4` | `—` | ✓ |
| `height` | `int4` | `—` | ✓ |
| `exif_stripped` | `bool` | `false` | ✓ |
| `exif_stripped_at` | `timestamptz` | `—` | ✓ |
| `exif_stripped_by` | `text` | `—` | ✓ |
| `captured_at` | `timestamptz` | `—` | ✓ |
| `beschreibung` | `text` | `—` | ✓ |
| `beweisfrage_ref` | `text` | `—` | ✓ |
| `tags` | `_text` | `'{}'::text[]` | ✓ |
| `position_in_dokument` | `int4` | `—` | ✓ |
| `search_vector` | `tsvector` | `—` | ✓ |
| `uploaded_by_user_id` | `uuid` | `—` | ✓ |
| `uploaded_at` | `timestamptz` | `now()` | ✓ |
| `deleted_at` | `timestamptz` | `—` | ✓ |

### `termine`

**Kommentar:** Universale Termin-Tabelle mit iCal-Support für Outlook/Google-Subscription

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `auftrag_id` | `uuid` | `—` | ✓ |
| `kontakt_id` | `uuid` | `—` | ✓ |
| `typ` | `termin_typ` | `'ortstermin'::termin_typ` | ✓ |
| `status` | `termin_status` | `'geplant'::termin_status` | ✓ |
| `titel` | `text` | `—` | ✓ |
| `beschreibung` | `text` | `—` | ✓ |
| `datum` | `date` | `—` | ✓ |
| `uhrzeit_von` | `time` | `—` | ✓ |
| `uhrzeit_bis` | `time` | `—` | ✓ |
| `ganztaegig` | `bool` | `false` | ✓ |
| `dauer_minuten` | `int4` | `—` | ✓ |
| `timezone` | `text` | `'Europe/Berlin'::text` | ✓ |
| `ort_name` | `text` | `—` | ✓ |
| `ort_adresse` | `text` | `—` | ✓ |
| `ort_plz` | `text` | `—` | ✓ |
| `ort_ort` | `text` | `—` | ✓ |
| `ort_geo_lat` | `numeric` | `—` | ✓ |
| `ort_geo_lng` | `numeric` | `—` | ✓ |
| `teilnehmer` | `jsonb` | `'[]'::jsonb` | ✓ |
| `ical_uid` | `text` | `(extensions.uuid_generate_v4() || '@prov…` | ✓ |
| `ical_sequence` | `int4` | `0` | ✓ |
| `erinnerung_minuten` | `int4` | `—` | ✓ |
| `erinnerung_gesendet_at` | `timestamptz` | `—` | ✓ |
| `notizen_nach_termin` | `text` | `—` | ✓ |
| `durchgefuehrt_am` | `timestamptz` | `—` | ✓ |
| `assigned_to_user_id` | `uuid` | `—` | ✓ |
| `created_by_user_id` | `uuid` | `—` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |
| `updated_at` | `timestamptz` | `now()` | ✓ |
| `deleted_at` | `timestamptz` | `—` | ✓ |

### `kontakte`

**Kommentar:** Universale Kontakt-Tabelle — Personen + Firmen

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `typ` | `kontakt_typ` | `'privat'::kontakt_typ` | ✓ |
| `anrede` | `text` | `—` | ✓ |
| `titel` | `text` | `—` | ✓ |
| `vorname` | `text` | `—` | ✓ |
| `nachname` | `text` | `—` | ✓ |
| `firma` | `text` | `—` | ✓ |
| `abteilung` | `text` | `—` | ✓ |
| `name` | `text` | `—` | ✓ |
| `adresse_strasse` | `text` | `—` | ✓ |
| `adresse_nr` | `text` | `—` | ✓ |
| `adresse_zusatz` | `text` | `—` | ✓ |
| `plz` | `text` | `—` | ✓ |
| `ort` | `text` | `—` | ✓ |
| `land` | `text` | `'DE'::text` | ✓ |
| `email` | `text` | `—` | ✓ |
| `email_2` | `text` | `—` | ✓ |
| `telefon` | `text` | `—` | ✓ |
| `mobil` | `text` | `—` | ✓ |
| `fax` | `text` | `—` | ✓ |
| `website` | `text` | `—` | ✓ |
| `ust_id` | `text` | `—` | ✓ |
| `steuernummer` | `text` | `—` | ✓ |
| `iban` | `text` | `—` | ✓ |
| `bic` | `text` | `—` | ✓ |
| `behoerden_az` | `text` | `—` | ✓ |
| `kanzlei` | `text` | `—` | ✓ |
| `versicherungs_nr` | `text` | `—` | ✓ |
| `schaden_nr` | `text` | `—` | ✓ |
| `notizen` | `text` | `—` | ✓ |
| `tags` | `_text` | `'{}'::text[]` | ✓ |
| `search_vector` | `tsvector` | `—` | ✓ |
| `created_by_user_id` | `uuid` | `—` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |
| `updated_at` | `timestamptz` | `now()` | ✓ |
| `deleted_at` | `timestamptz` | `—` | ✓ |

### `audit_trail`

**Kommentar:** INSERT-only Audit-Log. UPDATE/DELETE durch RLS verboten. DSGVO Art. 30 + IHK-SVO Nachweis.

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `user_id` | `uuid` | `—` | ✓ |
| `action` | `audit_action` | `—` | ✓ |
| `entity_typ` | `text` | `—` | ✓ |
| `entity_id` | `uuid` | `—` | ✓ |
| `payload` | `jsonb` | `—` | ✓ |
| `ip_address` | `inet` | `—` | ✓ |
| `user_agent` | `text` | `—` | ✓ |
| `request_id` | `text` | `—` | ✓ |
| `integrity_hash` | `text` | `—` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |

### `einwilligungen`

**Kommentar:** DSGVO Art. 7 Pflicht: Einwilligungs-Dokumentation mit Inhalts-Hash

| Spalte | Typ | Default | Nullable |
|---|---|---|---|
| `id` | `uuid` | `extensions.uuid_generate_v4()` | ✓ |
| `workspace_id` | `uuid` | `—` | ✓ |
| `user_id` | `uuid` | `—` | ✓ |
| `typ` | `einwilligung_typ` | `—` | ✓ |
| `rechtsdokument_id` | `uuid` | `—` | ✓ |
| `version` | `text` | `—` | ✓ |
| `inhalt_hash` | `text` | `—` | ✓ |
| `erteilt_at` | `timestamptz` | `now()` | ✓ |
| `ip_address` | `inet` | `—` | ✓ |
| `user_agent` | `text` | `—` | ✓ |
| `session_id` | `uuid` | `—` | ✓ |
| `onboarding_schritt` | `text` | `—` | ✓ |
| `page_url` | `text` | `—` | ✓ |
| `widerrufen_at` | `timestamptz` | `—` | ✓ |
| `widerruf_grund` | `text` | `—` | ✓ |
| `importiert_aus_airtable` | `bool` | `false` | ✓ |
| `airtable_record_id` | `text` | `—` | ✓ |
| `created_at` | `timestamptz` | `now()` | ✓ |

---

## 🔢 ENUMs (USER-DEFINED Types)

**Hinweis:** ENUM-Werte sind aus `default_value` extrahiert. Für vollständige Werte SQL ausführen: `SELECT enum_range(NULL::ENUM_NAME);`

| ENUM-Name | Wo verwendet | Bekannter Wert (aus Default) |
|---|---|---|
| `workspace_typ` | workspaces.typ | `'solo'::workspace_typ` |
| `abo_tier` | workspaces.abo_tier | `'solo'::abo_tier` |
| `abo_status` | workspaces.abo_status | `'trial'::abo_status` |
| `ki_provider` | workspaces.preferred_ki_provider | `'openai'::ki_provider` |
| `abrechnungs_intervall` | workspaces.abrechnungs_intervall | `'monatlich'::abrechnungs_intervall` |
| `member_rolle` | workspace_memberships.rolle | `'sv'::member_rolle` |
| `audit_action` | audit_trail.action | `` |
| `notification_kategorie` | notifications.kategorie | `` |
| `kontakt_typ` | kontakte.typ | `'privat'::kontakt_typ` |
| `auftrag_typ` | az_sequences.typ | `` |
| `auftrag_status` | auftraege.status | `'entwurf'::auftrag_status` |
| `auftrag_zweck` | auftraege.zweck | `'privat'::auftrag_zweck` |
| `kontakt_rolle` | auftrag_kontakte.rolle | `` |
| `phase_status` | auftrag_phasen.status | `'offen'::phase_status` |
| `ursache_prioritaet` | ursachen_hypothesen.prioritaet | `'alternativ'::ursache_prioritaet` |
| `eintrag_typ` | eintraege.typ | `'text'::eintrag_typ` |
| `dokument_typ` | dokumente.typ | `` |
| `dokument_status` | dokumente.status | `'entwurf'::dokument_status` |
| `versand_kanal` | dokumente.sent_via | `` |
| `foto_typ` | fotos.typ | `'detail'::foto_typ` |
| `anhang_typ` | anhaenge.typ | `'sonstiges'::anhang_typ` |
| `anhang_herkunft` | anhaenge.herkunft | `'manuell_upload'::anhang_herkunft` |
| `termin_typ` | termine.typ | `'ortstermin'::termin_typ` |
| `termin_status` | termine.status | `'geplant'::termin_status` |
| `norm_bereich` | normen_bibliothek.bereich | `'sonstiges'::norm_bereich` |
| `vector` | normen_bibliothek.embedding | `` |
| `textbaustein_kategorie` | textbausteine.kategorie | `'sonstiges'::textbaustein_kategorie` |
| `prompt_purpose` | ki_prompt_templates.purpose | `` |
| `ki_modell_typ` | ki_prompt_templates.bevorzugtes_modell | `'gpt_4o'::ki_modell_typ` |
| `ki_call_status` | ki_protokoll.status | `'erfolg'::ki_call_status` |
| `ki_feedback_bewertung` | ki_feedback.bewertung | `` |
| `import_quelle` | import_jobs.quelle | `` |
| `import_job_status` | import_jobs.status | `'geplant'::import_job_status` |
| `import_record_status` | import_records.status | `` |
| `health_check_kategorie` | system_health.kategorie | `` |
| `ticket_typ` | support_tickets.typ | `'frage'::ticket_typ` |
| `ticket_prioritaet` | support_tickets.prioritaet | `'normal'::ticket_prioritaet` |
| `ticket_status` | support_tickets.status | `'neu'::ticket_status` |
| `feature_event_typ` | feature_events.typ | `` |
| `einwilligung_typ` | einwilligungen.typ | `` |
| `rechtsdoc_typ` | rechtsdokumente.typ | `` |
| `referral_status` | empfehlungen.status | `'eingereicht'::referral_status` |
| `lead_stufe` | leads_pipeline.stufe | `'kalt'::lead_stufe` |
| `stripe_event_status` | stripe_events.status | `'empfangen'::stripe_event_status` |
| `email_status` | email_log.status | `'queued'::email_status` |
| `invitation_status` | workspace_invitations.status | `'offen'::invitation_status` |
| `api_key_scope` | api_keys.scope | `'read_only'::api_key_scope` |

---

## 🛡️ STANDARD-PATTERNS (CC Pflicht)

### RLS-Policy-Pattern (für ALLE neuen Tabellen)

```sql
-- IMMER auf workspace_memberships referenzieren, NIE workspace_members!
CREATE POLICY "<table>_workspace_select"
  ON public.<table> FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid()
  ));

-- INSERT, UPDATE, DELETE analog mit WITH CHECK / USING
```

### FK-Pattern für Auftrags-Bezug (für Einträge / Skizzen / Fristen / etc.)

```sql
-- IMMER auftrag_id, NIE schadensfall_id!
auftrag_id UUID NOT NULL REFERENCES public.auftraege(id) ON DELETE CASCADE,
workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
created_by_user_id UUID NOT NULL REFERENCES public.users(id)
```

### Standard-Spalten (für ALLE Business-Tabellen)

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMPTZ NULL  -- Soft-Delete!
```

---

## ⚠️ WICHTIGE HINWEISE FÜR CC

1. **`auftraege`-Universal:** Alle 10 Gutachten-Typen nutzen die SELBE Tabelle. Diskriminator: `typ` (auftrag_typ ENUM). Typ-spezifische Felder in `details` JSONB.
2. **`eintraege` existiert bereits:** NICHT neu erstellen. Spalten: `auftrag_id`, `ortstermin_id`, `typ` (ENUM), `nr`, `datum`, `titel`, `content`, `audio_dateien_ids[]`, `foto_ids[]`, `pseudonymisiert`, `konjunktiv_check_passed`, `search_vector`.
3. **`system_health` existiert bereits:** NICHT als `service_health` neu erstellen. Spalten: `kategorie` (ENUM `health_check_kategorie`), `component`, `status`, `response_time_ms`, `error_rate_pct`, `details`, `sampled_at`, `window_minutes`.
4. **TOTP in `users`:** `totp_secret` + `totp_enabled` existieren bereits. NICHT neu erstellen!
5. **Alle Tabellen haben RLS aktiviert** — mit `auth.uid()` und `workspace_memberships`-Joins.
6. **DSGVO-Pflicht:** `audit_trail` (INSERT-only) + `einwilligungen` + `impersonation_log` + Pseudonymisierung-Flags wo vorhanden.
7. **KI-Compliance:** Jeder KI-Call MUSS in `ki_protokoll` dokumentiert werden (DSGVO Art. 30 + EU AI Act Art. 50).
8. **`audio_dateien` + `fotos`:** EXIF-Strip Pflicht für Fotos (DSGVO). Pseudonymisierung-Pipeline für Whisper-Transkription.

---

## 📌 STAND-DIFF zu W10/W10b-Code (zu korrigieren in W12)

| Code-Annahme | Echtes Schema | Action |
|---|---|---|
| `eintraege.beschreibung_text` | `eintraege.content` | Lambda-Rename |
| `eintraege.dauer_min` | NICHT in Schema (in `details` JSONB?) | Migration ODER details JSONB nutzen |
| `eintraege.abrechenbar` | NICHT in Schema (in `details` JSONB?) | Migration ODER details JSONB |
| `eintraege.schadensfall_id` | `eintraege.auftrag_id` | Lambda-Rename |
| `eintraege.erstellt_von` | `eintraege.created_by_user_id` | Lambda-Rename |
| `service_health` | `system_health` | Lambda + Frontend Rename |
| `fristen` Tabelle | EXISTIERT NICHT | Migration mit auftrag_id-FK |
| `skizzen` Tabelle | EXISTIERT NICHT | Migration mit auftrag_id-FK |
| `users.totp_recovery_codes` | EXISTIERT NICHT | Migration (3 Spalten ergänzen) |
| `auftraege.auftraggeber_typ` | TBD (verifizieren!) | W12-I0 Audit |

---

*Schema-Doku generiert von Claude Opus 4.7 (Web) — 11.05.2026, basierend auf Supabase-MCP `list_tables` verbose=true*
*Quelle: cngteblrbpwsyypexjrv (PROVA-Systems Project)*