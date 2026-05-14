/**
 * PROVA Asset-Trigger (MEGA⁶⁶ Items 4.1+4.2+4.3)
 *
 * Zentraler Trigger fuer asset-to-fragments-v1 Pipeline (MEGA⁶³).
 * Wird von Audio/Foto/Skizze/Notiz-Upload-Endpoints aufgerufen.
 *
 * Public API:
 *   ProvaAssetTrigger.processAudio(audioId, auftragId, opts?)
 *   ProvaAssetTrigger.processFoto(fotoId, auftragId, opts?)
 *   ProvaAssetTrigger.processSkizze(skizzeId, auftragId, opts?)
 *   ProvaAssetTrigger.processNotiz(notizId, auftragId, opts?)
 *
 * opts:
 *   - skipIfFragmentsExist (boolean, default true) — Deduplizierung
 *   - silent (boolean) — keine Toast
 *   - onComplete (function) — Callback nach Pipeline
 *
 * Return: Promise<{ success, fragments_count, dauer_ms, error?, fragments? }>
 *
 * Events:
 *   - 'prova:asset-trigger-start' (asset_typ, asset_id)
 *   - 'prova:asset-trigger-done'  (asset_typ, asset_id, fragments_count)
 *   - 'prova:asset-trigger-error' (asset_typ, asset_id, error)
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-asset-trigger-style')) return;
    const link = document.createElement('link');
    link.id = 'prova-asset-trigger-style';
    link.rel = 'stylesheet';
    link.href = '/lib/prova-asset-trigger.css';
    document.head.appendChild(link);
  }

  async function _getSupabase() {
    if (_getSupabase._cache) return _getSupabase._cache;
    const url = window.PROVA_CONFIG?.SUPABASE_URL;
    const key = window.PROVA_CONFIG?.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('PROVA_CONFIG fehlt');
    const mod = await import('/lib/supabase-client.js');  // MEGA75-E Singleton
    _getSupabase._cache = mod.supabase || (mod.getSupabase && mod.getSupabase());
    return _getSupabase._cache;
  }

  async function _fragmentsExistFor(assetId) {
    try {
      const sb = await _getSupabase();
      const { count } = await sb.from('befund_fragmente')
        .select('id', { count: 'exact', head: true })
        .eq('quelle_asset_id', assetId)
        .is('deleted_at', null);
      return (count ?? 0) > 0;
    } catch (e) {
      return false;
    }
  }

  function _toast(text, kind = 'info') {
    if (!document.body) return;
    _injectStyle();
    const t = document.createElement('div');
    t.className = `prova-toast prova-toast--${kind}`;
    t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-visible'));
    setTimeout(() => {
      t.classList.remove('is-visible');
      setTimeout(() => t.parentNode?.removeChild(t), 300);
    }, 4500);
  }

  function _emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  async function _processAsset(assetTyp, assetId, auftragId, opts = {}) {
    if (!assetId || !auftragId) {
      throw new Error('asset_id + auftrag_id Pflicht');
    }
    const skipIfExist = opts.skipIfFragmentsExist !== false;
    const silent = !!opts.silent;

    if (skipIfExist && await _fragmentsExistFor(assetId)) {
      const skipMsg = `Fragmente fuer ${assetTyp} bestehen bereits — Skip`;
      if (!silent) _toast(skipMsg, 'info');
      return { success: true, skipped: true, fragments_count: 0 };
    }

    _emit('prova:asset-trigger-start', { asset_typ: assetTyp, asset_id: assetId });
    if (!silent) _toast(`KI extrahiert ${assetTyp}…`, 'loading');

    const t0 = Date.now();
    try {
      const sb = await _getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      const tok = session?.access_token;
      if (!tok) throw new Error('Nicht angemeldet');

      const url = window.PROVA_CONFIG.SUPABASE_URL;
      const anon = window.PROVA_CONFIG.SUPABASE_ANON_KEY;

      const resp = await fetch(`${url}/functions/v1/asset-to-fragments-v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`,
          'apikey': anon
        },
        body: JSON.stringify({ asset_typ: assetTyp, asset_id: assetId, auftrag_id: auftragId })
      });
      const json = await resp.json();

      if (!resp.ok || !json.success) {
        const err = json?.error || json?.detail || `HTTP ${resp.status}`;
        throw new Error(err);
      }

      const count = json.fragments_count || 0;
      const dauer = Date.now() - t0;
      if (!silent) _toast(`${count} Fragment${count !== 1 ? 'e' : ''} aus ${assetTyp} erstellt (${Math.round(dauer / 100) / 10}s)`, 'success');
      _emit('prova:asset-trigger-done', { asset_typ: assetTyp, asset_id: assetId, fragments_count: count, dauer_ms: dauer });
      if (typeof opts.onComplete === 'function') {
        try { opts.onComplete({ fragments_count: count, fragments: json.fragments, dauer_ms: dauer }); } catch (_) {}
      }
      // Sidebar-Reload Hook (falls Sidebar registriert)
      _emit('prova:fragments-changed', { auftrag_id: auftragId, source: assetTyp });
      return { success: true, fragments_count: count, fragments: json.fragments, dauer_ms: dauer };
    } catch (e) {
      const errMsg = e?.message || String(e);
      if (!silent) _toast(`Pipeline-Fehler (${assetTyp}): ${errMsg}`, 'error');
      _emit('prova:asset-trigger-error', { asset_typ: assetTyp, asset_id: assetId, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  const ProvaAssetTrigger = {
    processAudio:  (audioId,  auftragId, opts) => _processAsset('diktat', audioId,  auftragId, opts),
    processFoto:   (fotoId,   auftragId, opts) => _processAsset('foto',   fotoId,   auftragId, opts),
    processSkizze: (skizzeId, auftragId, opts) => _processAsset('skizze', skizzeId, auftragId, opts),
    processNotiz:  (notizId,  auftragId, opts) => _processAsset('notiz',  notizId,  auftragId, opts),
    _hasFragments: _fragmentsExistFor
  };

  global.ProvaAssetTrigger = ProvaAssetTrigger;
})(typeof window !== 'undefined' ? window : globalThis);
