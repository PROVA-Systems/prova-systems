# MEGA³² W12-I0 — Schema-Audit (echtes Supabase, 2026-05-11)

**Project:** cngteblrbpwsyypexjrv (eu-central-1)

## audio_dateien (28 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| auftrag_id | uuid | YES | — |
| ortstermin_id | uuid | YES | — |
| eintrag_id | uuid | YES | — |
| storage_bucket | text | NO | 'sv-files'::text |
| storage_path | text | NO | — |
| original_filename | text | YES | — |
| mime_type | text | NO | 'audio/opus'::text |
| codec | text | YES | — |
| bitrate_kbps | integer (int4) | YES | — |
| duration_seconds | integer (int4) | YES | — |
| bytes | integer (int4) | YES | — |
| transkript_text | text | YES | — |
| transkript_pseudonym | text | YES | — |
| transkribiert_am | timestamp with time zone (timestamptz) | YES | — |
| transkriptions_modell | text | YES | — |
| transkriptions_dauer_ms | integer (int4) | YES | — |
| transkriptions_kosten_eur | numeric | YES | — |
| pseudonymisiert | boolean (bool) | NO | false |
| pseudonymisiert_am | timestamp with time zone (timestamptz) | YES | — |
| halluzination_check_passed | boolean (bool) | YES | — |
| halluzination_check_at | timestamp with time zone (timestamptz) | YES | — |
| search_vector | tsvector | YES | — |
| recorded_by_user_id | uuid | YES | — |
| recorded_at | timestamp with time zone (timestamptz) | YES | — |
| uploaded_at | timestamp with time zone (timestamptz) | NO | now() |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |

## auftraege (46 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| typ | USER-DEFINED (auftrag_typ) | NO | — |
| az | text | NO | — |
| status | USER-DEFINED (auftrag_status) | NO | 'entwurf'::auftrag_status |
| zweck | USER-DEFINED (auftrag_zweck) | YES | 'privat'::auftrag_zweck |
| phase_aktuell | integer (int4) | NO | 1 |
| phase_max | integer (int4) | NO | 3 |
| titel | text | YES | — |
| schadensart_label | text | YES | — |
| schadensart_kategorie | text | YES | — |
| fragestellung | text | YES | — |
| schadensstichtag | date | YES | — |
| auftragsdatum | date | YES | — |
| gutachtendatum | date | YES | — |
| abgeschlossen_am | timestamp with time zone (timestamptz) | YES | — |
| objekt | jsonb | YES | '{}'::jsonb |
| details | jsonb | YES | '{}'::jsonb |
| fachurteil_text | text | YES | — |
| fachurteil_eigenleistung_chars | integer (int4) | YES | — |
| kurzbeantwortung | text | YES | — |
| grenzen_sachkunde | text | YES | — |
| kosten_geschaetzt_netto | numeric | YES | — |
| kosten_geschaetzt_brutto | numeric | YES | — |
| kosten_summe_card_label | text | YES | — |
| ki_anzeige_datum | date | YES | — |
| ki_anzeige_empfaenger | text | YES | — |
| ki_tasks | jsonb | YES | '{}'::jsonb |
| hilfskraefte | jsonb | YES | '[]'::jsonb |
| parent_auftrag_id | uuid | YES | — |
| umfang_seiten | integer (int4) | YES | — |
| umfang_anlagen | integer (int4) | YES | 0 |
| umfang_fotos | integer (int4) | YES | 0 |
| search_vector | tsvector | YES | — |
| tags | ARRAY (_text) | YES | '{}'::text[] |
| is_template | boolean (bool) | NO | false |
| created_by_user_id | uuid | YES | — |
| assigned_to_user_id | uuid | YES | — |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |
| archiviert_am | timestamp with time zone (timestamptz) | YES | — |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |
| vorlage_id | uuid | YES | — |
| beweisbeschluss_pdf_url | text | YES | — |
| beweisbeschluss_extrakt | jsonb | YES | — |
| is_demo | boolean (bool) | NO | false |

## dokumente (58 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| typ | USER-DEFINED (dokument_typ) | NO | — |
| doc_nummer | text | YES | — |
| auftrag_id | uuid | YES | — |
| kontakt_id | uuid | YES | — |
| termin_id | uuid | YES | — |
| parent_dokument_id | uuid | YES | — |
| betreff | text | YES | — |
| inhalt_text | text | YES | — |
| inhalt_strukturiert | jsonb | YES | '{}'::jsonb |
| pdfmonkey_template_id | text | YES | — |
| pdfmonkey_document_id | text | YES | — |
| pdf_payload | jsonb | YES | — |
| storage_bucket | text | NO | 'sv-files'::text |
| storage_path | text | YES | — |
| pdf_url | text | YES | — |
| pdf_url_expires_at | timestamp with time zone (timestamptz) | YES | — |
| bytes | integer (int4) | YES | — |
| status | USER-DEFINED (dokument_status) | NO | 'entwurf'::dokument_status |
| generated_at | timestamp with time zone (timestamptz) | YES | — |
| sent_at | timestamp with time zone (timestamptz) | YES | — |
| sent_via | USER-DEFINED (versand_kanal) | YES | — |
| sent_to_email | text | YES | — |
| gelesen_at | timestamp with time zone (timestamptz) | YES | — |
| betrag_netto | numeric | YES | — |
| betrag_brutto | numeric | YES | — |
| mwst_satz | numeric | YES | — |
| waehrung | text | NO | 'EUR'::text |
| rechnungsdatum | date | YES | — |
| leistungszeitraum_von | date | YES | — |
| leistungszeitraum_bis | date | YES | — |
| faelligkeit | date | YES | — |
| zahlungsfrist_tage | integer (int4) | YES | 14 |
| bezahlt_at | timestamp with time zone (timestamptz) | YES | — |
| bezahlt_betrag | numeric | YES | — |
| skonto_satz | numeric | YES | — |
| skonto_frist_tage | integer (int4) | YES | — |
| mahn_stufe | integer (int4) | YES | — |
| mahn_gebuehr | numeric | YES | — |
| verzug_zinsen | numeric | YES | — |
| datev_konto_soll | text | YES | — |
| datev_konto_haben | text | YES | — |
| datev_steuerschluessel | text | YES | — |
| datev_kostenstelle | text | YES | — |
| datev_belegfeld_1 | text | YES | — |
| datev_belegfeld_2 | text | YES | — |
| datev_buchungstext | text | YES | — |
| datev_exported_at | timestamp with time zone (timestamptz) | YES | — |
| datev_export_id | uuid | YES | — |
| xrechnung_xml_path | text | YES | — |
| leitweg_id | text | YES | — |
| search_vector | tsvector | YES | — |
| tags | ARRAY (_text) | YES | '{}'::text[] |
| created_by_user_id | uuid | YES | — |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |

## eintraege (17 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| auftrag_id | uuid | NO | — |
| ortstermin_id | uuid | YES | — |
| typ | USER-DEFINED (eintrag_typ) | NO | 'text'::eintrag_typ |
| nr | integer (int4) | NO | 0 |
| datum | date | NO | CURRENT_DATE |
| titel | text | YES | — |
| content | text | YES | — |
| audio_dateien_ids | ARRAY (_uuid) | YES | '{}'::uuid[] |
| foto_ids | ARRAY (_uuid) | YES | '{}'::uuid[] |
| pseudonymisiert | boolean (bool) | NO | false |
| konjunktiv_check_passed | boolean (bool) | YES | — |
| search_vector | tsvector | YES | — |
| created_by_user_id | uuid | YES | — |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |

## fotos (28 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| auftrag_id | uuid | YES | — |
| ortstermin_id | uuid | YES | — |
| kontakt_id | uuid | YES | — |
| eintrag_id | uuid | YES | — |
| dokument_id | uuid | YES | — |
| typ | USER-DEFINED (foto_typ) | NO | 'detail'::foto_typ |
| storage_bucket | text | NO | 'sv-files'::text |
| storage_path | text | NO | — |
| thumbnail_path | text | YES | — |
| original_filename | text | YES | — |
| mime_type | text | NO | 'image/jpeg'::text |
| bytes | integer (int4) | YES | — |
| width | integer (int4) | YES | — |
| height | integer (int4) | YES | — |
| exif_stripped | boolean (bool) | NO | false |
| exif_stripped_at | timestamp with time zone (timestamptz) | YES | — |
| exif_stripped_by | text | YES | — |
| captured_at | timestamp with time zone (timestamptz) | YES | — |
| beschreibung | text | YES | — |
| beweisfrage_ref | text | YES | — |
| tags | ARRAY (_text) | YES | '{}'::text[] |
| position_in_dokument | integer (int4) | YES | — |
| search_vector | tsvector | YES | — |
| uploaded_by_user_id | uuid | YES | — |
| uploaded_at | timestamp with time zone (timestamptz) | NO | now() |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |

## kontakte (37 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| typ | USER-DEFINED (kontakt_typ) | NO | 'privat'::kontakt_typ |
| anrede | text | YES | — |
| titel | text | YES | — |
| vorname | text | YES | — |
| nachname | text | YES | — |
| firma | text | YES | — |
| abteilung | text | YES | — |
| name | text | NO | — |
| adresse_strasse | text | YES | — |
| adresse_nr | text | YES | — |
| adresse_zusatz | text | YES | — |
| plz | text | YES | — |
| ort | text | YES | — |
| land | text | NO | 'DE'::text |
| email | text | YES | — |
| email_2 | text | YES | — |
| telefon | text | YES | — |
| mobil | text | YES | — |
| fax | text | YES | — |
| website | text | YES | — |
| ust_id | text | YES | — |
| steuernummer | text | YES | — |
| iban | text | YES | — |
| bic | text | YES | — |
| behoerden_az | text | YES | — |
| kanzlei | text | YES | — |
| versicherungs_nr | text | YES | — |
| schaden_nr | text | YES | — |
| notizen | text | YES | — |
| tags | ARRAY (_text) | YES | '{}'::text[] |
| search_vector | tsvector | YES | — |
| created_by_user_id | uuid | YES | — |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |

## notizen (16 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| auftrag_id | uuid | YES | — |
| kontakt_id | uuid | YES | — |
| termin_id | uuid | YES | — |
| dokument_id | uuid | YES | — |
| titel | text | YES | — |
| content | text | NO | — |
| important | boolean (bool) | NO | false |
| pinned | boolean (bool) | NO | false |
| tags | ARRAY (_text) | YES | '{}'::text[] |
| search_vector | tsvector | YES | — |
| created_by_user_id | uuid | YES | — |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |

## ortstermine (18 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| auftrag_id | uuid | NO | — |
| nr | integer (int4) | NO | 1 |
| datum | date | NO | — |
| uhrzeit | time without time zone (time) | YES | — |
| dauer_minuten | integer (int4) | YES | — |
| ort | text | YES | — |
| anwesende | jsonb | YES | '[]'::jsonb |
| wetter | text | YES | — |
| temperatur_aussen | text | YES | — |
| temperatur_innen | text | YES | — |
| luftfeuchte | text | YES | — |
| ablauf | text | YES | — |
| notizen | text | YES | — |
| created_by_user_id | uuid | YES | — |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |

## system_health (11 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| kategorie | USER-DEFINED (health_check_kategorie) | NO | — |
| component | text | NO | — |
| status | text | NO | — |
| response_time_ms | integer (int4) | YES | — |
| error_rate_pct | numeric | YES | — |
| details | jsonb | YES | — |
| error_message | text | YES | — |
| sampled_at | timestamp with time zone (timestamptz) | NO | now() |
| window_minutes | integer (int4) | NO | 5 |
| created_at | timestamp with time zone (timestamptz) | NO | now() |

## termine (32 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| auftrag_id | uuid | YES | — |
| kontakt_id | uuid | YES | — |
| typ | USER-DEFINED (termin_typ) | NO | 'ortstermin'::termin_typ |
| status | USER-DEFINED (termin_status) | NO | 'geplant'::termin_status |
| titel | text | NO | — |
| beschreibung | text | YES | — |
| datum | date | NO | — |
| uhrzeit_von | time without time zone (time) | YES | — |
| uhrzeit_bis | time without time zone (time) | YES | — |
| ganztaegig | boolean (bool) | NO | false |
| dauer_minuten | integer (int4) | YES | — |
| timezone | text | NO | 'Europe/Berlin'::text |
| ort_name | text | YES | — |
| ort_adresse | text | YES | — |
| ort_plz | text | YES | — |
| ort_ort | text | YES | — |
| ort_geo_lat | numeric | YES | — |
| ort_geo_lng | numeric | YES | — |
| teilnehmer | jsonb | YES | '[]'::jsonb |
| ical_uid | text | NO | (uuid_generate_v4() \|\| '@prova-systems.de'::text) |
| ical_sequence | integer (int4) | NO | 0 |
| erinnerung_minuten | integer (int4) | YES | — |
| erinnerung_gesendet_at | timestamp with time zone (timestamptz) | YES | — |
| notizen_nach_termin | text | YES | — |
| durchgefuehrt_am | timestamp with time zone (timestamptz) | YES | — |
| assigned_to_user_id | uuid | YES | — |
| created_by_user_id | uuid | YES | — |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |

## users (29 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | — |
| email | text | NO | — |
| email_verified | boolean (bool) | NO | false |
| name | text | YES | — |
| titel | text | YES | — |
| qualifikation | text | YES | — |
| sachgebiet | text | YES | — |
| bestellungsstelle | text | YES | — |
| anschrift | text | YES | — |
| plz | text | YES | — |
| ort | text | YES | — |
| telefon | text | YES | — |
| mobil | text | YES | — |
| fax | text | YES | — |
| signatur_storage_path | text | YES | — |
| stempel_storage_path | text | YES | — |
| locale | text | NO | 'de-DE'::text |
| timezone | text | NO | 'Europe/Berlin'::text |
| notification_settings | jsonb | NO | '{"push_aktiv": true, "email_neuer_auftrag": true, "email_rechnung_bezahlt": true, "email_termin_erinnerung": true}'::jsonb |
| onboarding_completed_at | timestamp with time zone (timestamptz) | YES | — |
| last_login_at | timestamp with time zone (timestamptz) | YES | — |
| last_active_at | timestamp with time zone (timestamptz) | YES | — |
| totp_secret | text | YES | — |
| totp_enabled | boolean (bool) | NO | false |
| is_founder | boolean (bool) | NO | false |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |
| deleted_at | timestamp with time zone (timestamptz) | YES | — |
| letterhead_config | jsonb | NO | '{}'::jsonb |

## workspace_memberships (14 Spalten)

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| workspace_id | uuid | NO | — |
| user_id | uuid | NO | — |
| rolle | USER-DEFINED (member_rolle) | NO | 'sv'::member_rolle |
| can_invite_members | boolean (bool) | NO | false |
| can_manage_billing | boolean (bool) | NO | false |
| can_export_data | boolean (bool) | NO | false |
| can_delete_records | boolean (bool) | NO | false |
| invited_by_user_id | uuid | YES | — |
| invited_at | timestamp with time zone (timestamptz) | YES | — |
| accepted_at | timestamp with time zone (timestamptz) | YES | — |
| is_active | boolean (bool) | NO | true |
| created_at | timestamp with time zone (timestamptz) | NO | now() |
| updated_at | timestamp with time zone (timestamptz) | NO | now() |

