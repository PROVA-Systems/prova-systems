-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁶³ Item 1.8 — prompt_purpose-Enum erweitern (8 neue Werte)
-- Datum: 2026-05-12
-- Applied via Supabase MCP as: mega63_prompt_purpose_extend
-- ═══════════════════════════════════════════════════════════════════
-- Marcel-OK: granulare Trennung pro Pipeline-Step + Asset-Typ.
-- Bestehende Werte unveraendert: diktat_strukturierung, plausibilitaets_check,
-- norm_vorschlag, konjunktiv_korrektur, befund_generierung, ursachen_hypothesen,
-- kurzbeantwortung, kurzstellungnahme, sanierungsvorschlag, foto_beschreibung,
-- pseudonymisierung, sonstiges.
-- ═══════════════════════════════════════════════════════════════════

ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'asset_zu_fragment_audio';
ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'asset_zu_fragment_foto';
ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'asset_zu_fragment_skizze';
ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'asset_zu_fragment_notiz';
ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'fragmente_zu_befund';
ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'embedding';
ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'auto_tagging';
ALTER TYPE prompt_purpose ADD VALUE IF NOT EXISTS 'raumbezug_extract';
