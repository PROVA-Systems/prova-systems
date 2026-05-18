-- =====================================================================
-- MEGA⁸⁹ Block A.2 — RLS Read-Only-Lock auf 21 User-Content-Tabellen
-- File: supabase-migrations/68_mega89_rls_writable_lock.sql
-- =====================================================================
-- Status: VORBEREITET — Marcel applied via MCP.
-- Apply: mcp Supabase apply_migration project_id=cngteblrbpwsyypexjrv
--         name=mega89_rls_writable_lock query=<dieser Inhalt>
--
-- Pattern: jede INSERT/UPDATE/DELETE/ALL-Policy bekommt zusätzliche
-- Bedingung `AND public.workspace_is_writable(workspace_id)`.
-- Read-Policies (SELECT) bleiben UNVERÄNDERT (DSGVO + pausierte User).
-- Service-Role-Policies bleiben UNVERÄNDERT (Backend-Inserts).
--
-- VORAUSSETZUNG: Migration 67 (workspace_is_writable) bereits applied.
-- Idempotent via DROP POLICY IF EXISTS + CREATE.
-- =====================================================================

-- ── 1. AUFTRAEGE (3 Policies: INSERT, UPDATE, DELETE) ──────────────
DROP POLICY IF EXISTS "auftraege_insert" ON public.auftraege;
CREATE POLICY "auftraege_insert" ON public.auftraege FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "auftraege_update" ON public.auftraege;
CREATE POLICY "auftraege_update" ON public.auftraege FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "auftraege_delete" ON public.auftraege;
CREATE POLICY "auftraege_delete" ON public.auftraege FOR DELETE TO authenticated
USING ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
       AND has_role(workspace_id, 'admin'::member_rolle)
       AND public.workspace_is_writable(workspace_id));

-- ── 2. KONTAKTE (3 Policies) ───────────────────────────────────────
DROP POLICY IF EXISTS "kontakte_insert" ON public.kontakte;
CREATE POLICY "kontakte_insert" ON public.kontakte FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "kontakte_update" ON public.kontakte;
CREATE POLICY "kontakte_update" ON public.kontakte FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "kontakte_delete" ON public.kontakte;
CREATE POLICY "kontakte_delete" ON public.kontakte FOR DELETE TO authenticated
USING ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
       AND has_role(workspace_id, 'admin'::member_rolle)
       AND public.workspace_is_writable(workspace_id));

-- ── 3. DOKUMENTE (ALL) ─────────────────────────────────────────────
DROP POLICY IF EXISTS "dokumente_modify" ON public.dokumente;
CREATE POLICY "dokumente_modify" ON public.dokumente FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 4. FOTOS (ALL) ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "fotos_modify" ON public.fotos;
CREATE POLICY "fotos_modify" ON public.fotos FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 5. AUDIO_DATEIEN (ALL) ─────────────────────────────────────────
DROP POLICY IF EXISTS "audio_modify" ON public.audio_dateien;
CREATE POLICY "audio_modify" ON public.audio_dateien FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 6. EINTRAEGE (ALL mit is_founder OR) ───────────────────────────
DROP POLICY IF EXISTS "eintraege_all" ON public.eintraege;
CREATE POLICY "eintraege_all" ON public.eintraege FOR ALL TO authenticated
USING (((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)) OR is_founder())
       AND (public.workspace_is_writable(workspace_id) OR is_founder()))
WITH CHECK ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
            AND public.workspace_is_writable(workspace_id));

-- ── 7. FRISTEN (INSERT, UPDATE) ────────────────────────────────────
DROP POLICY IF EXISTS "fristen_workspace_insert" ON public.fristen;
CREATE POLICY "fristen_workspace_insert" ON public.fristen FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                              WHERE wm.user_id = auth.uid() AND wm.is_active = true)
            AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "fristen_workspace_update" ON public.fristen;
CREATE POLICY "fristen_workspace_update" ON public.fristen FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                         WHERE wm.user_id = auth.uid() AND wm.is_active = true)
       AND public.workspace_is_writable(workspace_id));

-- ── 8. TERMINE (ALL) ───────────────────────────────────────────────
DROP POLICY IF EXISTS "termine_modify" ON public.termine;
CREATE POLICY "termine_modify" ON public.termine FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 9. ORTSTERMINE (ALL) ───────────────────────────────────────────
DROP POLICY IF EXISTS "ortstermine_modify" ON public.ortstermine;
CREATE POLICY "ortstermine_modify" ON public.ortstermine FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 10. SKIZZEN (INSERT, UPDATE) ───────────────────────────────────
DROP POLICY IF EXISTS "skizzen_workspace_insert" ON public.skizzen;
CREATE POLICY "skizzen_workspace_insert" ON public.skizzen FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                              WHERE wm.user_id = auth.uid() AND wm.is_active = true)
            AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "skizzen_workspace_update" ON public.skizzen;
CREATE POLICY "skizzen_workspace_update" ON public.skizzen FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                         WHERE wm.user_id = auth.uid() AND wm.is_active = true)
       AND public.workspace_is_writable(workspace_id));

-- ── 11. NOTIZEN (ALL) ──────────────────────────────────────────────
DROP POLICY IF EXISTS "notizen_modify" ON public.notizen;
CREATE POLICY "notizen_modify" ON public.notizen FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 12. BEFUND_FRAGMENTE (ALL) ─────────────────────────────────────
DROP POLICY IF EXISTS "befund_fragmente_modify" ON public.befund_fragmente;
CREATE POLICY "befund_fragmente_modify" ON public.befund_fragmente FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 13. ANHAENGE (ALL) ─────────────────────────────────────────────
DROP POLICY IF EXISTS "anhaenge_modify" ON public.anhaenge;
CREATE POLICY "anhaenge_modify" ON public.anhaenge FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 14. DOCUMENTS (ALL workspace) — service-Policy bleibt unverändert
DROP POLICY IF EXISTS "documents_workspace" ON public.documents;
CREATE POLICY "documents_workspace" ON public.documents FOR ALL TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                         WHERE wm.user_id = auth.uid())
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                              WHERE wm.user_id = auth.uid())
            AND public.workspace_is_writable(workspace_id));

-- ── 15. DOCUMENTS_VERSIONS (ALL workspace) ─────────────────────────
DROP POLICY IF EXISTS "documents_versions_workspace" ON public.documents_versions;
CREATE POLICY "documents_versions_workspace" ON public.documents_versions FOR ALL TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                         WHERE wm.user_id = auth.uid())
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                              WHERE wm.user_id = auth.uid())
            AND public.workspace_is_writable(workspace_id));

-- ── 16. DOCUMENT_IMAGES (3 Policies) ───────────────────────────────
DROP POLICY IF EXISTS "document_images_workspace_insert" ON public.document_images;
CREATE POLICY "document_images_workspace_insert" ON public.document_images FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                              WHERE wm.user_id = auth.uid())
            AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "document_images_workspace_update" ON public.document_images;
CREATE POLICY "document_images_workspace_update" ON public.document_images FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                         WHERE wm.user_id = auth.uid())
       AND public.workspace_is_writable(workspace_id));

DROP POLICY IF EXISTS "document_images_workspace_delete" ON public.document_images;
CREATE POLICY "document_images_workspace_delete" ON public.document_images FOR DELETE TO authenticated
USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_memberships wm
                         WHERE wm.user_id = auth.uid())
       AND public.workspace_is_writable(workspace_id));

-- ── 17. KI_FEEDBACK (INSERT) ───────────────────────────────────────
DROP POLICY IF EXISTS "ki_feedback_insert" ON public.ki_feedback;
CREATE POLICY "ki_feedback_insert" ON public.ki_feedback FOR INSERT TO authenticated
WITH CHECK ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
            AND (user_id = auth.uid())
            AND public.workspace_is_writable(workspace_id));

-- ── 18. SHARES (ALL) ───────────────────────────────────────────────
DROP POLICY IF EXISTS "shares_modify" ON public.shares;
CREATE POLICY "shares_modify" ON public.shares FOR ALL TO authenticated
USING (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
       AND public.workspace_is_writable(workspace_id))
WITH CHECK (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces)
            AND public.workspace_is_writable(workspace_id));

-- ── 19. TEXTBAUSTEINE (3 Policies, is_global-aware) ────────────────
-- is_global=true bleibt freigegeben für is_founder; user-textbausteine brauchen Lock.
DROP POLICY IF EXISTS "textb_insert" ON public.textbausteine;
CREATE POLICY "textb_insert" ON public.textbausteine FOR INSERT TO authenticated
WITH CHECK (((is_global = true) AND is_founder())
            OR ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
                AND public.workspace_is_writable(workspace_id)));

DROP POLICY IF EXISTS "textb_modify" ON public.textbausteine;
CREATE POLICY "textb_modify" ON public.textbausteine FOR UPDATE TO authenticated
USING (((is_global = true) AND is_founder())
       OR ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
           AND public.workspace_is_writable(workspace_id)));

DROP POLICY IF EXISTS "textb_delete" ON public.textbausteine;
CREATE POLICY "textb_delete" ON public.textbausteine FOR DELETE TO authenticated
USING (((is_global = true) AND is_founder())
       OR ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
           AND public.workspace_is_writable(workspace_id)));

-- ── 20. NORMEN_BIBLIOTHEK (3 Policies, is_master-aware) ────────────
DROP POLICY IF EXISTS "normen_insert" ON public.normen_bibliothek;
CREATE POLICY "normen_insert" ON public.normen_bibliothek FOR INSERT TO authenticated
WITH CHECK (((is_master = true) AND is_founder())
            OR ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
                AND public.workspace_is_writable(workspace_id)));

DROP POLICY IF EXISTS "normen_update" ON public.normen_bibliothek;
CREATE POLICY "normen_update" ON public.normen_bibliothek FOR UPDATE TO authenticated
USING (((is_master = true) AND is_founder())
       OR ((is_master = false) AND (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
           AND public.workspace_is_writable(workspace_id)));

DROP POLICY IF EXISTS "normen_delete" ON public.normen_bibliothek;
CREATE POLICY "normen_delete" ON public.normen_bibliothek FOR DELETE TO authenticated
USING (((is_master = true) AND is_founder())
       OR ((is_master = false) AND (workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
           AND has_role(workspace_id, 'admin'::member_rolle)
           AND public.workspace_is_writable(workspace_id)));

-- ── 21. POSITIONEN_BIBLIOTHEK (ALL, is_global-aware) ───────────────
DROP POLICY IF EXISTS "pos_modify" ON public.positionen_bibliothek;
CREATE POLICY "pos_modify" ON public.positionen_bibliothek FOR ALL TO authenticated
USING (((is_global = true) AND is_founder())
       OR ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
           AND public.workspace_is_writable(workspace_id)))
WITH CHECK (((is_global = true) AND is_founder())
            OR ((workspace_id IN (SELECT get_user_workspaces() AS get_user_workspaces))
                AND public.workspace_is_writable(workspace_id)));

-- NOTE: bookmarks, user_favoriten, onboarding_progress, einwilligungen sind user-spezifisch (kein workspace_id-Lock)
-- NOTE: audit_trail, stripe_events, email_log, feature_events, notifications, push_subscriptions, support_tickets — System-Tables die auch für pausierte User funktionieren müssen
-- NOTE: workspace_memberships, workspace_invitations, api_keys, churn_reasons — meta-tables, kein Lock (User muss aus pausiertem Workspace austreten/Workspace löschen können)
