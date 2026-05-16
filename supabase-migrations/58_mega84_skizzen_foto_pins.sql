-- =====================================================================
-- MEGA⁸⁴ Block A.1 — skizzen.foto_pins JSONB
-- File: supabase-migrations/58_mega84_skizzen_foto_pins.sql
-- =====================================================================
-- Status: VORBEREITET, NICHT applied — Marcel applied via MCP nach Review.
-- Apply-Path: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--             name=mega84_skizzen_foto_pins query=<dieser Inhalt>
--
-- Erweitert die skizzen-Tabelle um foto_pins JSONB für Multi-Foto-Pin-Workflow
-- (MEGA84 Vor-Ort-Power). Bestehendes foto_referenz_id (single uuid) reicht
-- nicht für mehrere Pins pro Skizze.
--
-- Pin-Format:
--   { id: string,          // Frontend-generierte UUID
--     x_pct: number,       // 0-100, Position X (% von SVG-Viewbox)
--     y_pct: number,       // 0-100, Position Y
--     foto_id: uuid,       // FK zu dokumente.id (typ=foto*) oder fotos.id
--     label: string,       // Pin-Beschriftung
--     kategorie: string,   // optional: 'befund' | 'schaden' | 'messung'
--     ki_caption: string,  // optional: MEGA84 A.3 KI-Vision-Output
--     created_at: ISO-String
--   }
-- =====================================================================

ALTER TABLE public.skizzen
ADD COLUMN IF NOT EXISTS foto_pins jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.skizzen.foto_pins IS
  'MEGA84: Array von Pin-Objekten fuer Multi-Foto-Skizzen-Workflow.
   Format: [{id, x_pct, y_pct, foto_id, label, kategorie?, ki_caption?, created_at}].
   x_pct/y_pct sind 0-100 (Position relativ zur SVG-Viewbox).
   foto_id verweist auf dokumente.id (typ LIKE foto%) oder fotos.id.';

-- GIN-Index fuer schnelle Pin-Queries (z.B. "alle Pins mit foto_id=X")
CREATE INDEX IF NOT EXISTS idx_skizzen_foto_pins
  ON public.skizzen USING gin(foto_pins);

-- Verify nach Apply:
--   SELECT count(*) FROM public.skizzen WHERE foto_pins IS NOT NULL;  -- alle Rows
--   SELECT count(*) FROM public.skizzen WHERE jsonb_array_length(foto_pins) > 0;  -- mit Pins
