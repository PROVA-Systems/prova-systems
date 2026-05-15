-- MEGA⁷⁸ C.1 — globale Suche 360 als RPC
-- Datum: 2026-05-15
-- Applied via Supabase MCP. Spalten-Namen verifiziert gegen Live-Schema:
--   - fotos verwendet uploaded_at (kein created_at)
--   - normen_bibliothek hat titel + bereich (kein bezeichnung/nummer)
--   - textbausteine hat kategorie (kein inhalt-Spalte)
--   - fristen hat keine titel-Spalte
-- RLS: SECURITY INVOKER + Tabellen-RLS-Policies → User sieht nur eigenen Workspace.

CREATE OR REPLACE FUNCTION public.global_search(
  q_text text,
  q_limit int DEFAULT 5,
  q_source_filter text DEFAULT NULL
)
RETURNS TABLE(
  source text,
  id uuid,
  title text,
  subtitle text,
  url text,
  rank real,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  qts tsquery;
  ilike_pat text;
BEGIN
  IF q_text IS NULL OR length(trim(q_text)) < 2 THEN
    RETURN;
  END IF;
  BEGIN
    qts := websearch_to_tsquery('german', q_text);
  EXCEPTION WHEN OTHERS THEN
    qts := plainto_tsquery('german', q_text);
  END;
  ilike_pat := '%' || replace(replace(replace(q_text, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  SELECT 'auftraege'::text, a.id,
         COALESCE(a.az || COALESCE(' · ' || NULLIF(a.titel,''),''), a.titel, 'Auftrag')::text,
         COALESCE(NULLIF(a.schadensart_label,'') || COALESCE(' · ' || (a.details->'auftraggeber'->>'name'), ''),
                  (a.details->'auftraggeber'->>'name'),
                  a.status::text)::text,
         ('/akte.html?az=' || a.az)::text,
         COALESCE(ts_rank(a.search_vector, qts), 0)::real,
         a.created_at
  FROM public.auftraege a
  WHERE (q_source_filter IS NULL OR q_source_filter = 'auftraege')
    AND a.search_vector @@ qts AND a.deleted_at IS NULL
  ORDER BY 6 DESC, a.created_at DESC LIMIT q_limit;

  RETURN QUERY
  SELECT 'kontakte'::text, k.id,
         COALESCE(NULLIF(k.name,''),
                  NULLIF(trim(both ' ' from COALESCE(k.vorname,'') || ' ' || COALESCE(k.nachname,'')),''),
                  k.firma, 'Kontakt')::text,
         COALESCE(NULLIF(k.firma,''), k.email, trim(both ' ' from COALESCE(k.plz,'') || ' ' || COALESCE(k.ort,'')))::text,
         ('/kontakt-detail.html?id=' || k.id)::text,
         COALESCE(ts_rank(k.search_vector, qts), 0)::real,
         k.created_at
  FROM public.kontakte k
  WHERE (q_source_filter IS NULL OR q_source_filter = 'kontakte')
    AND k.search_vector @@ qts AND k.deleted_at IS NULL
  ORDER BY 6 DESC, k.created_at DESC LIMIT q_limit;

  RETURN QUERY
  SELECT 'dokumente'::text, d.id,
         COALESCE(NULLIF(d.doc_nummer,''), NULLIF(d.betreff,''), d.typ::text, 'Dokument')::text,
         (d.typ::text || COALESCE(' · ' || d.status::text, ''))::text,
         (CASE
            WHEN d.typ::text LIKE 'rechnung%' THEN '/rechnungen.html?id=' || d.id
            WHEN d.typ::text = 'brief'        THEN '/briefe.html?id=' || d.id
            WHEN d.auftrag_id IS NOT NULL     THEN '/akte.html?id=' || d.auftrag_id || '&dok=' || d.id
            ELSE '/akte.html?dok=' || d.id
          END)::text,
         COALESCE(ts_rank(d.search_vector, qts), 0)::real,
         d.created_at
  FROM public.dokumente d
  WHERE (q_source_filter IS NULL OR q_source_filter = 'dokumente')
    AND d.search_vector @@ qts AND d.deleted_at IS NULL
  ORDER BY 6 DESC, d.created_at DESC LIMIT q_limit;

  RETURN QUERY
  SELECT 'textbausteine'::text, t.id,
         COALESCE(NULLIF(t.titel,''), 'Textbaustein')::text,
         COALESCE(t.kategorie::text, '')::text,
         ('/textbausteine.html?id=' || t.id)::text,
         COALESCE(ts_rank(t.search_vector, qts), 0)::real,
         t.created_at
  FROM public.textbausteine t
  WHERE (q_source_filter IS NULL OR q_source_filter = 'textbausteine')
    AND t.search_vector @@ qts AND t.deleted_at IS NULL
  ORDER BY 6 DESC, t.created_at DESC LIMIT q_limit;

  RETURN QUERY
  SELECT 'normen'::text, n.id,
         COALESCE(NULLIF(n.titel,''), 'Norm')::text,
         COALESCE(n.bereich::text, '')::text,
         ('/normen.html?id=' || n.id)::text,
         COALESCE(ts_rank(n.search_vector, qts), 0)::real,
         n.created_at
  FROM public.normen_bibliothek n
  WHERE (q_source_filter IS NULL OR q_source_filter = 'normen')
    AND n.search_vector @@ qts AND n.deleted_at IS NULL
  ORDER BY 6 DESC, n.created_at DESC LIMIT q_limit;

  RETURN QUERY
  SELECT 'eintraege'::text, e.id,
         COALESCE(NULLIF(e.titel,''), e.typ::text, 'Eintrag')::text,
         (e.typ::text)::text,
         (CASE WHEN e.auftrag_id IS NOT NULL THEN '/akte.html?id=' || e.auftrag_id ELSE '#' END)::text,
         COALESCE(ts_rank(e.search_vector, qts), 0)::real,
         e.created_at
  FROM public.eintraege e
  WHERE (q_source_filter IS NULL OR q_source_filter = 'eintraege')
    AND e.search_vector @@ qts
  ORDER BY 6 DESC, e.created_at DESC LIMIT q_limit;

  RETURN QUERY
  SELECT 'fotos'::text, f.id,
         COALESCE(NULLIF(f.beschreibung,''), 'Foto')::text,
         (CASE WHEN f.tags IS NOT NULL AND array_length(f.tags, 1) > 0
               THEN array_to_string(f.tags[1:3], ' · ') ELSE '' END)::text,
         (CASE WHEN f.auftrag_id IS NOT NULL THEN '/akte.html?id=' || f.auftrag_id || '&tab=fotos' ELSE '#' END)::text,
         COALESCE(ts_rank(f.search_vector, qts), 0)::real,
         f.uploaded_at AS created_at
  FROM public.fotos f
  WHERE (q_source_filter IS NULL OR q_source_filter = 'fotos')
    AND f.search_vector @@ qts AND f.deleted_at IS NULL
  ORDER BY 6 DESC, f.uploaded_at DESC LIMIT q_limit;

  RETURN QUERY
  SELECT 'termine'::text, te.id,
         COALESCE(NULLIF(te.titel,''), 'Termin')::text,
         (COALESCE(te.datum::text, '') || COALESCE(' · ' || te.ort_name, ''))::text,
         ('/termine.html?id=' || te.id)::text,
         0.3::real,
         te.created_at
  FROM public.termine te
  WHERE (q_source_filter IS NULL OR q_source_filter = 'termine')
    AND (te.titel ILIKE ilike_pat OR te.beschreibung ILIKE ilike_pat OR te.ort_name ILIKE ilike_pat)
    AND te.deleted_at IS NULL
  ORDER BY te.datum DESC NULLS LAST LIMIT q_limit;

  RETURN QUERY
  SELECT 'fristen'::text, fr.id,
         (COALESCE(fr.frist_typ::text, 'Frist') || COALESCE(' · ' || fr.datum_soll::text, ''))::text,
         COALESCE(NULLIF(fr.notiz,''), fr.rechtsgrundlage, '')::text,
         ('/fristen.html#' || fr.id)::text,
         0.3::real,
         fr.created_at
  FROM public.fristen fr
  WHERE (q_source_filter IS NULL OR q_source_filter = 'fristen')
    AND (fr.notiz ILIKE ilike_pat OR fr.rechtsgrundlage ILIKE ilike_pat)
    AND fr.deleted_at IS NULL
  ORDER BY fr.datum_soll DESC NULLS LAST LIMIT q_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.global_search(text, int, text) TO authenticated;

COMMENT ON FUNCTION public.global_search IS 'MEGA78 C.1 — Globale 360°-Suche über 9 Quellen mit search_vector + ilike-Fallback. RLS scope''d via SECURITY INVOKER.';
