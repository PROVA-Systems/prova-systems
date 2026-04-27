/* ============================================================
   PROVA Systems — Data-Store (ESM)
   Sprint K-1.0 Block 4

   Zentrale Schnittstelle für alle DB-Operationen. Ersetzt direkten
   airtable.js-Aufruf in K-1.4. Multi-Tenancy via workspace_id wird
   automatisch gesetzt — RLS schützt unten zusätzlich.

   Pattern alt:  airtableProxy({ table: 'SCHADENSFAELLE', payload: {...} })
   Pattern neu:  dataStore.auftraege.create({...})

   Spalten-Source: /supabase-migrations/01-06_*.sql
   ============================================================ */

import {
    supabase,
    getActiveWorkspaceId,
    getCurrentUser
} from './supabase-client.js';

// ─── INTERNAL HELPERS ─────────────────────────────────────────

async function _requireWorkspace() {
    const wsId = await getActiveWorkspaceId();
    if (!wsId) {
        throw new Error('PROVA: Kein aktiver Workspace — User nicht eingeloggt oder ohne Membership.');
    }
    return wsId;
}

async function _requireUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('PROVA: Kein User — bitte einloggen.');
    }
    return user;
}

// ═════════════════════════════════════════════════════════════
// AUFTRÄGE — universal für 10 Typen via ENUM auftrag_typ
// ═════════════════════════════════════════════════════════════

export const auftraege = {
    /**
     * @param {Object} opts
     * @param {string} [opts.typ]       — auftrag_typ ENUM (schaden|beweis|...)
     * @param {string} [opts.status]    — auftrag_status ENUM (entwurf|aktiv|abgeschlossen|archiv|storniert)
     * @param {string} [opts.assignedTo] — user_id für Filter
     * @param {number} [opts.limit=50]
     * @param {number} [opts.offset=0]
     */
    async list({ typ = null, status = null, assignedTo = null, limit = 50, offset = 0 } = {}) {
        const wsId = await _requireWorkspace();

        let q = supabase
            .from('auftraege')
            .select('id, typ, az, status, zweck, phase_aktuell, phase_max, titel, schadensart_label, schadensstichtag, auftragsdatum, gutachtendatum, abgeschlossen_am, objekt, kosten_geschaetzt_brutto, parent_auftrag_id, tags, created_at, updated_at, assigned_to_user_id', { count: 'exact' })
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (typ) q = q.eq('typ', typ);
        if (status) q = q.eq('status', status);
        if (assignedTo) q = q.eq('assigned_to_user_id', assignedTo);

        return await q;
    },

    async getById(id) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('auftraege')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .single();
    },

    async getByAz(az) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('auftraege')
            .select('*')
            .eq('az', az)
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .single();
    },

    /**
     * @param {Object} data — alle Spalten ausser id, workspace_id, az, created_*, updated_*
     *                       AZ wird via DB-Trigger generate_az() generiert wenn leer.
     */
    async create(data) {
        const wsId = await _requireWorkspace();
        const user = await _requireUser();
        return await supabase
            .from('auftraege')
            .insert({
                ...data,
                workspace_id: wsId,
                created_by_user_id: user.id
            })
            .select()
            .single();
    },

    async update(id, data) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('auftraege')
            .update(data)
            .eq('id', id)
            .eq('workspace_id', wsId)
            .select()
            .single();
    },

    async softDelete(id) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('auftraege')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('workspace_id', wsId);
    },

    async search(query, { typ = null, limit = 20 } = {}) {
        const wsId = await _requireWorkspace();
        let q = supabase
            .from('auftraege')
            .select('id, typ, az, titel, status, phase_aktuell, created_at')
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .textSearch('search_vector', query, { type: 'websearch', config: 'german' })
            .limit(limit);
        if (typ) q = q.eq('typ', typ);
        return await q;
    },

    /**
     * Real-Time-Subscription auf Aufträge-Changes (für Cross-Device-Sync).
     * @returns Unsubscribe-Function
     */
    subscribeToChanges(callback, { workspaceId = null } = {}) {
        const wsId = workspaceId; // optional: für Multi-Workspace-Setups
        const channel = supabase
            .channel(`auftraege-changes-${wsId || 'all'}`)
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'auftraege',
                    ...(wsId ? { filter: `workspace_id=eq.${wsId}` } : {})
                },
                callback)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }
};

// ═════════════════════════════════════════════════════════════
// KONTAKTE — Personen + Firmen + Justiz/Behörden
// ═════════════════════════════════════════════════════════════

export const kontakte = {
    async list({ search = null, typ = null, limit = 100, offset = 0 } = {}) {
        const wsId = await _requireWorkspace();

        let q = supabase
            .from('kontakte')
            .select('id, typ, anrede, titel, vorname, nachname, firma, name, email, telefon, mobil, plz, ort, tags, created_at', { count: 'exact' })
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .order('name', { ascending: true })
            .range(offset, offset + limit - 1);

        if (typ) q = q.eq('typ', typ);
        if (search) {
            q = q.textSearch('search_vector', search, { type: 'websearch', config: 'german' });
        }

        return await q;
    },

    async getById(id) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('kontakte')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .single();
    },

    async create(data) {
        const wsId = await _requireWorkspace();
        const user = await _requireUser();
        return await supabase
            .from('kontakte')
            .insert({
                ...data,
                workspace_id: wsId,
                created_by_user_id: user.id
            })
            .select()
            .single();
    },

    async update(id, data) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('kontakte')
            .update(data)
            .eq('id', id)
            .eq('workspace_id', wsId)
            .select()
            .single();
    },

    async softDelete(id) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('kontakte')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('workspace_id', wsId);
    }
};

// ═════════════════════════════════════════════════════════════
// DOKUMENTE — universal: Gutachten, Rechnungen, Briefe, Mahnungen
// ═════════════════════════════════════════════════════════════

export const dokumente = {
    async listForAuftrag(auftragId) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('dokumente')
            .select('id, typ, doc_nummer, betreff, status, generated_at, sent_at, sent_via, pdf_url, parent_dokument_id, betrag_brutto, faelligkeit, created_at')
            .eq('auftrag_id', auftragId)
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });
    },

    /**
     * @param {Object} opts
     * @param {string} [opts.status] — dokument_status ENUM
     * @param {boolean} [opts.unpaidOnly]
     */
    async listInvoices({ status = null, unpaidOnly = false, limit = 100, offset = 0 } = {}) {
        const wsId = await _requireWorkspace();
        let q = supabase
            .from('dokumente')
            .select('id, doc_nummer, betreff, status, kontakt_id, auftrag_id, betrag_brutto, faelligkeit, bezahlt_at, mahn_stufe, sent_at, created_at', { count: 'exact' })
            .eq('workspace_id', wsId)
            .in('typ', ['rechnung', 'rechnung_jveg', 'rechnung_stunden'])
            .is('deleted_at', null)
            .order('faelligkeit', { ascending: true, nullsFirst: false })
            .range(offset, offset + limit - 1);

        if (status) q = q.eq('status', status);
        if (unpaidOnly) q = q.is('bezahlt_at', null).not('status', 'in', '(storniert,bezahlt)');

        return await q;
    },

    async getById(id) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('dokumente')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .single();
    },

    async create(data) {
        const wsId = await _requireWorkspace();
        const user = await _requireUser();
        return await supabase
            .from('dokumente')
            .insert({
                ...data,
                workspace_id: wsId,
                created_by_user_id: user.id
            })
            .select()
            .single();
    },

    async update(id, data) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('dokumente')
            .update(data)
            .eq('id', id)
            .eq('workspace_id', wsId)
            .select()
            .single();
    },

    async markPaid(id, { bezahlt_at = null, bezahlt_betrag = null } = {}) {
        return await this.update(id, {
            status: 'bezahlt',
            bezahlt_at: bezahlt_at || new Date().toISOString(),
            bezahlt_betrag
        });
    },

    /**
     * Mahnungs-Kette: liefert Mahnung-1, Mahnung-2 für eine Rechnung.
     */
    async getMahnungen(rechnungId) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('dokumente')
            .select('*')
            .eq('parent_dokument_id', rechnungId)
            .eq('workspace_id', wsId)
            .order('mahn_stufe', { ascending: true });
    }
};

// ═════════════════════════════════════════════════════════════
// SKELETON für weitere Module — werden in K-1.3+ befüllt
// ═════════════════════════════════════════════════════════════

export const fotos = {
    async listForAuftrag(auftragId) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('fotos')
            .select('*')
            .eq('auftrag_id', auftragId)
            .eq('workspace_id', wsId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });
    }
    // TODO K-1.3: upload(), bulkUpload(), exifStrip(), generateThumbnail()
};

export const termine = {
    async listUpcoming({ days = 30, limit = 50 } = {}) {
        const wsId = await _requireWorkspace();
        const now = new Date().toISOString();
        const future = new Date(Date.now() + days * 86400000).toISOString();
        return await supabase
            .from('termine')
            .select('*')
            .eq('workspace_id', wsId)
            .gte('start_at', now)
            .lte('start_at', future)
            .order('start_at', { ascending: true })
            .limit(limit);
    }
    // TODO K-1.3: create(), update(), softDelete(), reminder-Logik
};

export const notizen = { /* TODO K-1.3 */ };
export const eintraege = { /* TODO K-1.3 — auftrag-spezifische Diktat/Befund-Eintraege */ };
export const normen = { /* TODO K-1.3 — pgvector-Suche in normen_bibliothek */ };
export const textbausteine = { /* TODO K-1.3 — Floskeln, Vorlagen */ };

// ═════════════════════════════════════════════════════════════
// AUDIT-LOGGING (audit_trail ist INSERT-only — RLS verhindert UPDATE/DELETE)
// ═════════════════════════════════════════════════════════════

/**
 * @param {string} action  — audit_action ENUM (create, read, update, delete,
 *                           login, logout, login_failed, export, import,
 *                           pdf_generate, pdf_view, pdf_send, ki_request,
 *                           ki_response, workspace_invite, workspace_remove_member,
 *                           data_export_dsgvo, data_delete_dsgvo)
 * @param {string} entityTyp — frei: "auftrag" / "rechnung" / "kontakt" / ...
 * @param {string|null} entityId — UUID der Entity
 * @param {Object} payload — Vorher/Nachher-Diff oder beliebig
 */
export async function auditLog(action, entityTyp, entityId, payload = {}) {
    const wsId = await getActiveWorkspaceId();
    const user = await getCurrentUser();
    return await supabase
        .from('audit_trail')
        .insert({
            workspace_id: wsId,
            user_id: user?.id || null,
            action,
            entity_typ: entityTyp,
            entity_id: entityId,
            payload,
            user_agent: (typeof navigator !== 'undefined') ? navigator.userAgent : null
        });
}

// ═════════════════════════════════════════════════════════════
// FEATURE-EVENT-TRACKING (für Cockpit-Heatmap + Drop-off-Funnel)
// RPC-Wrapper auf log_feature_event() (SECURITY DEFINER, schreibt feature_events)
// ═════════════════════════════════════════════════════════════

/**
 * @param {string} typ — feature_event_typ ENUM (page_view, click, form_submit,
 *                       feature_used, document_generated, pdf_downloaded,
 *                       email_sent, audio_recorded, photo_uploaded,
 *                       search_query, ki_request, export_data, login, logout, sonstiges)
 * @param {string} featureKey — frei wählbarer Identifier (z.B. "akte.fachurteil.save")
 * @param {Object} [value] — JSONB-Payload
 */
export async function trackFeatureEvent(typ, featureKey, value = null) {
    const wsId = await getActiveWorkspaceId();
    if (!wsId) return { data: null, error: { message: 'Kein Workspace' } };
    return await supabase.rpc('log_feature_event', {
        p_workspace_id: wsId,
        p_typ: typ,
        p_feature_key: featureKey,
        p_page_url: (typeof window !== 'undefined') ? window.location.pathname : null,
        p_value: value
    });
}

// ═════════════════════════════════════════════════════════════
// COCKPIT-VIEWS — Read-Only Aggregate-Daten
// ═════════════════════════════════════════════════════════════

export const cockpit = {
    async masterUebersicht() {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('v_cockpit_master_uebersicht')
            .select('*')
            .eq('workspace_id', wsId)
            .single();
    },

    async kundenListe({ limit = 100 } = {}) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('v_cockpit_kunden_liste')
            .select('*')
            .eq('workspace_id', wsId)
            .limit(limit);
    },

    async monatsVerlauf({ months = 12 } = {}) {
        const wsId = await _requireWorkspace();
        return await supabase
            .from('v_cockpit_monats_verlauf')
            .select('*')
            .eq('workspace_id', wsId)
            .order('monat', { ascending: false })
            .limit(months);
    }
};

// ═════════════════════════════════════════════════════════════
// COMPLIANCE — Pflicht-Einwilligungen + Forced Re-Consent
// ═════════════════════════════════════════════════════════════

export const compliance = {
    /**
     * @returns Liste der noch nicht zugestimmten Pflicht-Dokumente in aktueller Version
     *          (RPC liefert leeres Array wenn alles aktuell)
     */
    async getPendingEinwilligungen() {
        return await supabase.rpc('get_pending_einwilligungen');
    },

    /**
     * @param {string} typ — einwilligung_typ ENUM
     * @param {string} rechtsdokumentId — UUID des Dokuments in rechtsdokumente
     */
    async recordEinwilligung(typ, rechtsdokumentId) {
        return await supabase.rpc('record_einwilligung', {
            p_typ: typ,
            p_rechtsdokument_id: rechtsdokumentId
        });
    }
};

// ═════════════════════════════════════════════════════════════
// CONVENIENCE-EXPORT für `import { dataStore } from './data-store.js'`
// ═════════════════════════════════════════════════════════════

export const dataStore = {
    auftraege,
    kontakte,
    dokumente,
    fotos,
    termine,
    notizen,
    eintraege,
    normen,
    textbausteine,
    cockpit,
    compliance,
    auditLog,
    trackFeatureEvent
};

// Browser-Console-Debug
if (typeof window !== 'undefined') {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.dataStore = dataStore;
}
