/**
 * PROVA Asset-Autowire (MEGA⁶⁹-FINAL-1 Item D.1)
 *
 * Wrappt window.fetch und dispatched `prova:asset-created` automatisch nach
 * erfolgreichem Upload/Insert von Audio/Foto/Skizze/Notiz. Subscriber:
 * lib/prova-asset-event-bus.js → lib/prova-asset-trigger.js (Pipeline).
 *
 * Vorteil ggü. 4 separaten Edits in whisper-chunker/foto-upload-v2-ui/
 * skizzen-canvas/eintraege-create: Single-Point-of-Maintenance, deckt auch
 * zukünftige Caller (z.B. CMS-Bulk-Import) automatisch ab.
 *
 * Auto-installed beim Script-Load. Kein Activation-Gate — sicher weil
 * Event-Subscriber (Bus) selbst entscheidet ob er aktiv ist (dataset-Marker
 * im Editor-Context).
 *
 * Routes (Endpoint-Patterns → asset_typ + ID-Key in Response):
 *   whisper-diktat        → diktat (audio_id)
 *   foto-upload           → foto   (foto_id | id)
 *   skizze-save/skizzen-save → skizze (skizze_id | id)
 *   eintraege-create      → notiz  (id)
 *
 * auftrag_id-Resolution:
 *   1. response.auftrag_id (Edge Function liefert)
 *   2. request-body.auftrag_id (Caller hat es im JSON-Body)
 *   3. ProvaAssetEventBus._defaultAuftragId (Fallback)
 */
'use strict';

(function (global) {
  if (typeof global === 'undefined' || !global.fetch) return;
  if (global.__provaAssetAutowireInstalled) return;
  global.__provaAssetAutowireInstalled = true;

  // Endpoint-Pattern → Asset-Typ + Response-ID-Key
  const ROUTE_MAP = [
    { match: /whisper[-/]diktat/i,           asset_typ: 'diktat', idKeys: ['audio_id', 'id'] },
    { match: /skizze[n]?[-/]save/i,          asset_typ: 'skizze', idKeys: ['skizze_id', 'id'] },
    { match: /foto[-/]upload(?!-v2-ui)/i,    asset_typ: 'foto',   idKeys: ['foto_id', 'id'] },
    { match: /eintraege[-/]create/i,         asset_typ: 'notiz',  idKeys: ['id', 'eintrag_id'] }
  ];

  const origFetch = global.fetch.bind(global);

  global.fetch = async function provaAssetAutowireFetch(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';

    // Extract auftrag_id from request body (JSON only)
    let bodyAuftragId = null;
    if (init && init.body && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        bodyAuftragId = parsed && (parsed.auftrag_id || parsed.auftragId) || null;
      } catch (_) { /* not JSON */ }
    }

    const route = ROUTE_MAP.find(r => r.match.test(url));
    const resp = await origFetch(input, init);

    if (route && resp.ok) {
      try {
        const clone = resp.clone();
        const data = await clone.json();
        let assetId = null;
        for (const k of route.idKeys) {
          if (data && data[k]) { assetId = data[k]; break; }
        }
        const auftragId = (data && (data.auftrag_id || data.auftragId))
          || bodyAuftragId
          || (global.ProvaAssetEventBus && global.ProvaAssetEventBus._defaultAuftragId)
          || null;
        if (assetId) {
          document.dispatchEvent(new CustomEvent('prova:asset-created', {
            detail: { asset_typ: route.asset_typ, asset_id: assetId, auftrag_id: auftragId }
          }));
        }
      } catch (_) { /* response body not JSON or already consumed */ }
    }
    return resp;
  };
})(typeof window !== 'undefined' ? window : globalThis);
