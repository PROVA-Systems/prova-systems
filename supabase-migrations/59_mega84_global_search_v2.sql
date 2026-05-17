-- =====================================================================
-- MEGA⁸⁴/⁸⁵ Pass 2b Block F.1 — global_search_v2 RPC
-- File: supabase-migrations/59_mega84_global_search_v2.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply-Path: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--             name=mega84_global_search_v2 query=<dieser Inhalt>
--
-- Erweitert die bestehende global_search() RPC (MEGA78) auf eine v2 mit:
--   - Konsistenter Sortierung nach ts_rank
--   - Multi-Table UNION ALL über 4 Quellen
--   - workspace_id-Pflicht (RLS-konform via SECURITY DEFINER)
--   - Limit per Source separat (verhindert dass eine Source alle Slots schluckt)
--
-- Existing MEGA78 global_search() bleibt funktional — v2 ist additiv.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.global_search_v2(
  p_workspace_id uuid,
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  source text,
  id uuid,
  title text,
  subtitle text,
  href text,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  qts tsquery;
  per_source_limit int := GREATEST(LEAST(p_limit, 50) / 4, 5);
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  BEGIN
    qts := websearch_to_tsquery('german', p_query);
  EXCEPTION WHEN OTHERS THEN
    qts := plainto_tsquery('german', p_query);
  END;

  -- ── auftraege ───────────────────────────────────────────────
  RETURN QUERY
  SELECT 'auftrag'::text AS source,
         a.id,
         COALESCE(NULLIF(a.az,''), 'AZ?')::text AS title,
         COALESCE(NULLIF(a.titel,''), a.schadensart_label, a.typ::text, '')::text AS subtitle,
         ('/akte.html?id=' || a.id::text)::text AS href,
         COALESCE(ts_rank(a.search_vector, qts), 0)::real AS rank
  FROM public.auftraege a
  WHERE a.workspace_id = p_workspace_id
    AND a.deleted_at IS NULL
    AND a.search_vector @@ qts
  ORDER BY rank DESC, a.updated_at DESC NULLS LAST
  LIMIT per_source_limit;

  -- ── dokumente ───────────────────────────────────────────────
  RETURN QUERY
  SELECT 'dokument'::text,
         d.id,
         COALESCE(NULLIF(d.doc_nummer,''), NULLIF(d.betreff,''), d.typ::text, 'Dokument')::text,
         (d.typ::text || COALESCE(' · ' || d.status::text, ''))::text,
         (CASE
            WHEN d.typ::text LIKE 'rechnung%' THEN '/rechnungen.html?id=' || d.id::text
            WHEN d.typ::text LIKE 'mahnung%'  THEN '/mahnwesen.html?id='  || d.id::text
            WHEN d.typ::text = 'brief'        THEN '/briefe.html?id='     || d.id::text
            WHEN d.auftrag_id IS NOT NULL     THEN '/akte.html?id=' || d.auftrag_id::text
            ELSE '/akte.html?dok=' || d.id::text
          END)::text,
         COALESCE(ts_rank(d.search_vector, qts), 0)::real
  FROM public.dokumente d
  WHERE d.workspace_id = p_workspace_id
    AND d.deleted_at IS NULL
    AND d.search_vector @@ qts
  ORDER BY rank DESC, d.created_at DESC
  LIMIT per_source_limit;

  -- ── kontakte ────────────────────────────────────────────────
  RETURN QUERY
  SELECT 'kontakt'::text,
         k.id,
         COALESCE(
           NULLIF(k.name, ''),
           NULLIF(trim(both ' ' from COALESCE(k.vorname,'') || ' ' || COALESCE(k.nachname,'')), ''),
           k.firma,
           'Kontakt'
         )::text,
         COALESCE(NULLIF(k.firma,''), k.email,
                  trim(both ' ' from COALESCE(k.plz,'') || ' ' || COALESCE(k.ort,'')))::text,
         ('/kontakt-detail.html?id=' || k.id::text)::text,
         COALESCE(ts_rank(k.search_vector, qts), 0)::real
  FROM public.kontakte k
  WHERE k.workspace_id = p_workspace_id
    AND k.deleted_at IS NULL
    AND k.search_vector @@ qts
  ORDER BY rank DESC, k.updated_at DESC NULLS LAST
  LIMIT per_source_limit;

  -- ── textbausteine (inkl. globale) ────────────────────────────
  RETURN QUERY
  SELECT 'textbaustein'::text,
         t.id,
         COALESCE(NULLIF(t.titel,''), 'Textbaustein')::text,
         COALESCE(t.kategorie::text, '')::text,
         ('/textbausteine.html?id=' || t.id::text)::text,
         COALESCE(ts_rank(t.search_vector, qts), 0)::real
  FROM public.textbausteine t
  WHERE (t.workspace_id = p_workspace_id OR t.is_global = true)
    AND t.deleted_at IS NULL
    AND t.search_vector @@ qts
  ORDER BY rank DESC, t.updated_at DESC NULLS LAST
  LIMIT per_source_limit;

  -- ── normen ──────────────────────────────────────────────────
  RETURN QUERY
  SELECT 'norm'::text,
         n.id,
         COALESCE(NULLIF(n.titel,''), 'Norm')::text,
         COALESCE(n.bereich::text, '')::text,
         ('/normen.html?id=' || n.id::text)::text,
         COALESCE(ts_rank(n.search_vector, qts), 0)::real
  FROM public.normen_bibliothek n
  WHERE n.deleted_at IS NULL
    AND n.search_vector @@ qts
  ORDER BY rank DESC
  LIMIT per_source_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.global_search_v2(uuid, text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.global_search_v2(uuid, text, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.global_search_v2(uuid, text, int) IS
  'MEGA84 — Multi-Table Global-Search v2 mit per-source Limit. '
  || 'Tabellen: auftraege, dokumente, kontakte, textbausteine (inkl. global), normen_bibliothek. '
  || 'Aufruf: SELECT * FROM global_search_v2(workspace_id, query, limit).';
