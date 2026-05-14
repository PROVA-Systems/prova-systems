/**
 * PROVA Wikilink-Source (MEGA⁶⁶ Item 4.6)
 *
 * Sammelt Wikilink-Targets aus 5 Quellen:
 *   1. Headings — aus aktuellem Editor-State (lokal)
 *   2. Anhänge   — direkter Supabase-Query auf anhaenge (anhaenge-list Edge Fn fehlt)
 *   3. Bausteine — Edge Fn list-dokument-templates ODER direkt
 *   4. Fragmente — direkter Query auf befund_fragmente
 *   5. Aufträge  — list-auftraege Edge Fn
 *
 * Cache: 60 Sek im Memory pro auftragId.
 *
 * API:
 *   const source = ProvaWikilinkSource.create({ editor, auftragId });
 *   source(query) → Promise<Array<{ id, label, targetType }>>
 *
 *   ProvaWikilinkSource.invalidate(auftragId?)
 */
'use strict';

(function (global) {

  const CACHE_TTL_MS = 60 * 1000;
  const _cache = new Map();   // key=auftragId, value={ ts, items }

  async function _getSb() {
    if (_getSb._c) return _getSb._c;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('PROVA_CONFIG fehlt');
    const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
    _getSb._c = mod.supabase || (mod.getSupabase && mod.getSupabase());
    return _getSb._c;
  }

  function _headings(editor) {
    if (!editor) return [];
    const out = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        const t = (node.textContent || '').trim();
        if (t) out.push({ id: 'heading:' + t, label: t, targetType: 'heading' });
      }
    });
    return out;
  }

  async function _anhaenge(sb, auftragId) {
    const { data } = await sb.from('anhaenge')
      .select('id, original_filename, beschreibung, typ')
      .eq('auftrag_id', auftragId)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })
      .limit(40);
    return (data || []).map(a => ({
      id: 'anhang:' + a.id,
      label: a.beschreibung || a.original_filename || `Anhang ${String(a.id).slice(0, 8)}`,
      targetType: 'anhang'
    }));
  }

  async function _bausteine(sb) {
    // textbausteine vs document_templates: nutze textbausteine (existing aus MEGA⁶²)
    const { data } = await sb.from('textbausteine')
      .select('id, titel, kategorie')
      .or('is_global.eq.true,workspace_id.not.is.null')
      .limit(50);
    return (data || []).map(b => ({
      id: 'baustein:' + b.id,
      label: b.titel || 'Baustein',
      targetType: 'baustein'
    }));
  }

  async function _fragmente(sb, auftragId) {
    const { data } = await sb.from('befund_fragmente')
      .select('id, text, quelle_typ, status')
      .eq('auftrag_id', auftragId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(60);
    return (data || []).map(f => ({
      id: 'fragment:' + f.id,
      label: `${f.quelle_typ}: ${(f.text || '').slice(0, 60)}…`,
      targetType: 'fragment'
    }));
  }

  async function _auftraege(sb) {
    const { data } = await sb.from('auftraege')
      .select('id, az, titel, schadenart')
      .order('updated_at', { ascending: false })
      .limit(20);
    return (data || []).map(a => ({
      id: 'auftrag:' + a.id,
      label: `${a.az || a.id.slice(0, 8)} — ${a.titel || a.schadenart || ''}`.trim(),
      targetType: 'auftrag'
    }));
  }

  async function _loadAll(auftragId) {
    const sb = await _getSb();
    const tasks = [
      _anhaenge(sb, auftragId).catch(() => []),
      _bausteine(sb).catch(() => []),
      _fragmente(sb, auftragId).catch(() => []),
      _auftraege(sb).catch(() => [])
    ];
    const [anhaenge, bausteine, fragmente, auftraege] = await Promise.all(tasks);
    return [...anhaenge, ...bausteine, ...fragmente, ...auftraege];
  }

  function create({ editor, auftragId }) {
    return async function searchSource(query) {
      const headings = _headings(editor);
      let backend = [];
      if (auftragId) {
        const cached = _cache.get(auftragId);
        if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) {
          backend = cached.items;
        } else {
          backend = await _loadAll(auftragId).catch(() => []);
          _cache.set(auftragId, { ts: Date.now(), items: backend });
        }
      }
      const all = [...headings, ...backend];
      const q = (query || '').toLowerCase().trim();
      if (!q) return all.slice(0, 20);
      return all.filter(it => (it.label || '').toLowerCase().includes(q) || (it.id || '').toLowerCase().includes(q)).slice(0, 20);
    };
  }

  function invalidate(auftragId) {
    if (auftragId) _cache.delete(auftragId);
    else _cache.clear();
  }

  global.ProvaWikilinkSource = { create, invalidate };
})(typeof window !== 'undefined' ? window : globalThis);
