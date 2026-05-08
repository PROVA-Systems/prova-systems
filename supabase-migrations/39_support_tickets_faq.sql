-- ═══════════════════════════════════════════════════════════════════
-- MEGA⁴¹ P5 — support_tickets + faq_entries (Self-Service-Support)
-- Datum: 2026-05-08
-- Status: PLANNED — Marcel apply via Supabase MCP
-- ═══════════════════════════════════════════════════════════════════

-- FAQ-Tabelle mit tsvector-Volltextsuche
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategorie TEXT NOT NULL,                     -- 'gutachten' | 'rechnungen' | 'diktat' | 'skizzen' | 'bescheinigungen' | 'termine' | 'ki' | 'vorlagen' | 'import' | 'account' | 'datenschutz'
  frage TEXT NOT NULL,
  antwort TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  not_helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_kategorie ON public.faq_entries(kategorie);
CREATE INDEX IF NOT EXISTS idx_faq_search ON public.faq_entries USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_faq_view_count ON public.faq_entries(view_count DESC);

-- Trigger: Auto-Update search_vector
CREATE OR REPLACE FUNCTION public.faq_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('german', COALESCE(NEW.frage, '')), 'A') ||
    setweight(to_tsvector('german', COALESCE(NEW.antwort, '')), 'B') ||
    setweight(to_tsvector('german', array_to_string(COALESCE(NEW.tags, '{}'::text[]), ' ')), 'C');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faq_search_vector_update ON public.faq_entries;
CREATE TRIGGER faq_search_vector_update
  BEFORE INSERT OR UPDATE ON public.faq_entries
  FOR EACH ROW EXECUTE FUNCTION public.faq_search_vector_trigger();

-- FAQ ist global lesbar (keine workspace_id) — alle SVs sehen gleiche FAQ
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faq_global_select ON public.faq_entries;
CREATE POLICY faq_global_select ON public.faq_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS faq_no_user_insert ON public.faq_entries;
CREATE POLICY faq_no_user_insert ON public.faq_entries FOR INSERT WITH CHECK (false);  -- nur Service-Role
DROP POLICY IF EXISTS faq_no_user_update ON public.faq_entries;
CREATE POLICY faq_no_user_update ON public.faq_entries FOR UPDATE USING (false);
DROP POLICY IF EXISTS faq_no_user_delete ON public.faq_entries;
CREATE POLICY faq_no_user_delete ON public.faq_entries FOR DELETE USING (false);


-- Support-Tickets-Tabelle
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',         -- 'open' | 'in_progress' | 'answered' | 'closed'
  priority TEXT DEFAULT 'normal',              -- 'low' | 'normal' | 'high' | 'urgent'
  kategorie TEXT,
  ai_response_attempted BOOLEAN DEFAULT FALSE,
  ai_response_text TEXT,
  faq_match_id UUID REFERENCES public.faq_entries(id) ON DELETE SET NULL,
  faq_match_score NUMERIC(3,2),
  admin_response TEXT,
  admin_responded_at TIMESTAMPTZ,
  admin_responded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_workspace ON public.support_tickets(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.support_tickets(priority, created_at DESC);

-- Bestehende support_tickets-Tabelle (M²⁸-Legacy mit deutschem Schema) erweitern
-- (Im Live-Repo via separate ADD COLUMN-Migration applied — hier dokumentiert)
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ai_response_attempted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_response_text TEXT,
  ADD COLUMN IF NOT EXISTS faq_match_id UUID REFERENCES public.faq_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS faq_match_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS kategorie TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_faq_match ON public.support_tickets(faq_match_id) WHERE faq_match_id IS NOT NULL;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_workspace_select ON public.support_tickets;
CREATE POLICY tickets_workspace_select ON public.support_tickets
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS tickets_workspace_insert ON public.support_tickets;
CREATE POLICY tickets_workspace_insert ON public.support_tickets
  FOR INSERT WITH CHECK (false);  -- nur Service-Role-Lambda

DROP POLICY IF EXISTS tickets_workspace_update ON public.support_tickets;
CREATE POLICY tickets_workspace_update ON public.support_tickets
  FOR UPDATE USING (false);  -- nur Service-Role

DROP POLICY IF EXISTS tickets_workspace_delete ON public.support_tickets;
CREATE POLICY tickets_workspace_delete ON public.support_tickets
  FOR DELETE USING (false);

-- ═══════════════════════════════════════════════════════════════════
-- 34 FAQ-Seeds (aus BVS/IfS/IHK-Foren-Recherche)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.faq_entries (kategorie, frage, antwort, tags) VALUES
('gutachten', 'Wie speichere ich ein Gutachten als Vorlage?',
 'Editor öffnen → "⊞ Vorlage"-Button in der erweiterten Toolbar → Titel/Beschreibung/Kategorie eingeben.',
 ARRAY['vorlage', 'editor', 'speichern']),
('gutachten', 'Welcher der 3 Wege ist für mich richtig?',
 'A=Wizard für Einsteiger (geführt), B=eigene Word-Vorlage (für etablierte SVs), C=Hybrid (PROVA setzt rechtliche Compliance, du den Hauptteil).',
 ARRAY['weg_a', 'weg_b', 'weg_c', 'modus']),
('gutachten', 'Wie kann ich den §6 Fachurteil-Editor nutzen?',
 'Im Auftrag → §6-Sektion → mind. 500 Zeichen Eigenleistung pflicht (§ 407a ZPO).',
 ARRAY['§6', 'fachurteil', 'eigenleistung']),
('gutachten', 'Wie funktioniert die KI-Konjunktiv-II-Prüfung?',
 'Editor → "⌜II⌝"-Button. Nutzt GPT-5.5. Hinweise NICHT-kopierbar (du musst selbst umformulieren).',
 ARRAY['konjunktiv', 'ki', '§407a']),
('gutachten', 'Was ist der Unterschied zwischen Schadens- und Wertgutachten?',
 'Flow A=Schaden/Mangel, Flow B=Verkehrswert nach ImmoWertV §§22-39.',
 ARRAY['flow_a', 'flow_b', 'schaden', 'wert']),
('rechnungen', 'Wie erstelle ich eine JVEG-Rechnung?',
 'Auftrag → Rechnung → JVEG-Tab → Stunden + Spesen eingeben → automatische Berechnung nach JVEG § 9.',
 ARRAY['jveg', 'rechnung']),
('rechnungen', 'Wann wird eine Mahnung automatisch versendet?',
 '3-Stufen: Tag 14 (kostenlos) / Tag 21 (5€ Mahngebühr) / Tag 35 (10€ + Inkasso-Hinweis).',
 ARRAY['mahnung', 'fristen']),
('rechnungen', 'Wie ändere ich meine IBAN für ZUGFeRD-Rechnungen?',
 'Einstellungen → Profil → IBAN-Feld.',
 ARRAY['iban', 'zugferd', 'rechnung']),
('rechnungen', 'Kann ich Rechnungen rückdatieren?',
 'Nein, aus DSGVO + steuerlichen Gründen nur das Erstellungs-Datum.',
 ARRAY['rückdatieren', 'dsgvo']),
('diktat', 'Wie nehme ich ein Diktat unterwegs auf?',
 'diktat-mobile.html auf dem Handy → roter Button → spricht → automatische Whisper-Transkription.',
 ARRAY['diktat', 'mobile', 'whisper']),
('diktat', 'Was passiert wenn ich offline diktiere?',
 'IndexedDB-Queue speichert lokal. Sync passiert beim nächsten Online-Check (max 30s).',
 ARRAY['offline', 'sync', 'indexeddb']),
('diktat', 'Werden meine Diktate an OpenAI übertragen?',
 'Nur die Audio-Datei für Whisper-Transkription. Personenbezogene Daten werden VORHER pseudonymisiert.',
 ARRAY['datenschutz', 'whisper', 'pseudonymisierung']),
('skizzen', 'Welche Apple Pencil-Modelle werden unterstützt?',
 'Apple Pencil 1+2 mit Pressure-Sensitivity. S Pen (Samsung) auch.',
 ARRAY['apple-pencil', 's-pen', 'skizze']),
('skizzen', 'Wie verbinde ich eine Skizze mit einem Befund?',
 'Skizze → Marker setzen → "Befund verknüpfen"-Dropdown.',
 ARRAY['marker', 'befund', 'skizze']),
('skizzen', 'Kann ich Skizzen exportieren?',
 'Ja, als PNG aus dem Auftrag → Skizze → ⊟ Export.',
 ARRAY['export', 'png', 'skizze']),
('bescheinigungen', 'Welche 12 Bescheinigungs-Typen gibt es?',
 'Top-12 in bescheinigungen.html: BES-01 (Beweissicherung), BES-02 (Schaden), … BES-12 (Energie).',
 ARRAY['bescheinigung', 'top-12']),
('bescheinigungen', 'Wie passe ich eine Bescheinigung an meinen Briefkopf an?',
 'Einstellungen → Profil → Logo/IHK-Bestellungs-Nr → wird automatisch ins PDFMonkey-Template eingesetzt.',
 ARRAY['briefkopf', 'logo', 'ihk']),
('termine', 'Wie synchronisiere ich Termine mit meinem Google Calendar?',
 'Einstellungen → Integrationen → Google Calendar OAuth.',
 ARRAY['google-calendar', 'oauth', 'termin']),
('termine', 'Was sind die Fristen-Pipelines?',
 '5 Pipelines: Schadensgutachten (28d), Wertgutachten (42d), Bauabnahme (7d), Schiedsgutachten (60d), Beweissicherung (14d).',
 ARRAY['fristen', 'pipeline']),
('ki', 'Welche KI-Modelle nutzt PROVA?',
 'GPT-5.5 (frontier, für §6 Fachurteil) + GPT-5.5-instant (light, für Rechtschreibung). KEIN gpt-4o (deprecated Februar 2026).',
 ARRAY['ki-modell', 'gpt-5.5']),
('ki', 'Kostet mich jeder KI-Aufruf Geld?',
 'Nein — KI-Kosten sind im Solo-Tier (179€/mo) bzw. Team-Tier (379€/mo) inkludiert. Token-Limit pro Monat sichtbar in Einstellungen.',
 ARRAY['ki-kosten', 'pricing']),
('ki', 'Was bedeutet die SV-Eigenleistungs-Quote?',
 '§ 407a-Compliance-Metrik: Prozent SV-eigene/übernommene Inhalte vs KI-Inhalte. Schwelle 50% (konfigurierbar).',
 ARRAY['eigenleistung', '§407a', 'audit']),
('vorlagen', 'Wie importiere ich meine alte Word-Vorlage?',
 'Editor → 3-Wege-Modal → B (Eigene Vorlage) → DOCX hochladen. mammoth.js konvertiert + Platzhalter-Detection.',
 ARRAY['docx', 'word', 'vorlage']),
('vorlagen', 'Welche 5 PROVA-Default-Vorlagen gibt es?',
 'F-04 (Beweisbeschluss), F-09 (Stellungnahme), F-10 (Schadens-Kurzgutachten), F-15 (Wertgutachten), F-19 (Beratung).',
 ARRAY['prova-default', 'vorlage']),
('import', 'Wie migriere ich vom Gutachten Manager?',
 'import-assistent.html → CSV/JSON hochladen → Format-Detector erkennt automatisch → Mapping → Atomic-Import (alles oder nichts).',
 ARRAY['migration', 'csv', 'gutachten-manager']),
('import', 'Was passiert bei einem fehlerhaften Import?',
 'Alle bisherigen Records werden zurückgerollt (Atomic Transaction). Liste der Fehler mit Zeilennummern wird angezeigt.',
 ARRAY['rollback', 'atomic']),
('import', 'Kann ich einen Import rückgängig machen?',
 'Ja, innerhalb 24h via Rollback-Token. Nach 24h läuft der Token ab.',
 ARRAY['rollback', '24h']),
('account', 'Wie ändere ich mein Paket?',
 'Einstellungen → Paket → Upgrade/Downgrade. Bei Downgrade gilt das alte Paket bis Monatsende.',
 ARRAY['paket', 'upgrade', 'downgrade']),
('account', 'Wann wird abgerechnet?',
 'Monatlich am Tag der ursprünglichen Bestellung via Stripe.',
 ARRAY['billing', 'stripe']),
('account', 'Wie kündige ich?',
 'Einstellungen → Paket → "Kündigen". Cancellation-Survey pflicht (für PROVA-Verbesserung). Abo läuft bis Monatsende.',
 ARRAY['kuendigung', 'cancel']),
('account', 'Was sind Founding Members?',
 'Erste 10 Pilotkunden bekommen 99€ lifetime statt 179€. Stripe-Coupon FOUNDING-99.',
 ARRAY['founding', 'pilot', 'pricing']),
('datenschutz', 'Wo sind meine Daten gespeichert?',
 'Supabase Frankfurt (DSGVO-konform). Bilder in Supabase Storage. Keine Übertragung außerhalb EU.',
 ARRAY['dsgvo', 'supabase', 'eu']),
('datenschutz', 'Wie exportiere ich meine Daten (DSGVO Art. 20)?',
 'Einstellungen → Datenschutz → "Daten-Export" → komplettes JSON binnen 24h via E-Mail.',
 ARRAY['dsgvo', 'export', 'art20']),
('datenschutz', 'Wie lösche ich meinen Account?',
 'Einstellungen → Datenschutz → "Account löschen". Soft-Delete + nach 30 Tagen Hard-Delete (DSGVO Art. 17).',
 ARRAY['dsgvo', 'art17', 'loeschung'])
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.faq_entries IS 'MEGA⁴¹ P5: FAQ mit tsvector-Volltextsuche (deutsch). Global lesbar.';
COMMENT ON TABLE public.support_tickets IS 'MEGA⁴¹ P5: Support-Tickets mit KI-FAQ-Match. Workspace-isoliert.';
