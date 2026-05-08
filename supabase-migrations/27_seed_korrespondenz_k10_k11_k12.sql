-- ═══════════════════════════════════════════════════════════════════
-- MEGA³⁷ B3 — Korrespondenz-Briefe K-10 + K-11 + K-12 (NEU)
-- Datum: 2026-05-08
-- Status: APPLIED via Supabase MCP (m37_b3_seed_additional_korrespondenz)
-- Idempotent: ON CONFLICT (name) DO NOTHING.
--
-- Quelle: docs/research/BESCHEINIGUNGEN-RECHERCHE-2026-05-07.md
-- W4.1-Recherche identifizierte 3 echte Korrespondenz-Lücken in der
-- bestehenden 11-Briefe-Liste. Diese Migration schliesst sie.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.dokument_templates (
    name, typ, sprache, version, pdfmonkey_template_id, pdfmonkey_template_name,
    rechtlicher_hinweis, aktiv, importiert_aus_airtable, notizen
) VALUES
  -- K-10: Honorar-Vorschuss (JVEG §4 Abs. 1)
  ('K-10 Honorar-Vorschuss-Anforderung',
   'brief'::dokument_typ, 'de-DE', '1.0',
   'K-10', 'PROVA-BRIEF',
   '§4 Abs. 1 JVEG',
   TRUE, FALSE,
   'Antrag an Gericht/Auftraggeber bei >2.000€-Anteil oder Reisekosten. M37 W4.1-Recherche.'),

  -- K-11: Frist-Verlängerung (§407a Abs. 1 ZPO)
  ('K-11 Frist-Verlängerung-Antrag',
   'brief'::dokument_typ, 'de-DE', '1.0',
   'K-11', 'PROVA-BRIEF',
   '§407a Abs. 1 ZPO',
   TRUE, FALSE,
   'Pflicht-Brief bei drohender Frist-Überschreitung (Ordnungsgeld-Risiko §411 Abs. 2).'),

  -- K-12: Privatgutachten-Werkvertrag (BGB §§ 631 ff.)
  ('K-12 Privatgutachten-Werkvertrag',
   'auftragsbestaetigung'::dokument_typ, 'de-DE', '1.0',
   'K-12', 'PROVA-BRIEF',
   'BGB §§ 631 ff.',
   TRUE, FALSE,
   'Schriftliche Bestätigung Privatauftrag mit AGB-Verweis + Widerrufsbelehrung (Verbraucher).')
ON CONFLICT (name) DO NOTHING;

-- Sanity-Check
DO $$
DECLARE v_total INT;
BEGIN
  SELECT count(*) INTO v_total FROM public.dokument_templates;
  RAISE NOTICE 'M³⁷ B3 SEED — dokument_templates total nach Apply: % (erwartet ≥ 17)', v_total;
END $$;
