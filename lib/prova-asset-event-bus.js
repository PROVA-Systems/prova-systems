/**
 * PROVA Asset-Event-Bus (MEGA⁶⁸ Item 6.1)
 *
 * CustomEvent-basiertes Wiring zwischen Asset-Upload und ProvaAssetTrigger.
 *
 * Upload-Pfade dispatchen 'prova:asset-created' wenn neuer Asset erzeugt wurde:
 *   document.dispatchEvent(new CustomEvent('prova:asset-created', {
 *     detail: { asset_typ: 'diktat'|'foto'|'skizze'|'notiz', asset_id, auftrag_id }
 *   }));
 *
 * Dieser Bus subscribed und triggert ProvaAssetTrigger.processX automatisch.
 *
 * Aktivierung:
 *   ProvaAssetEventBus.activate({ auftragId? })   // auftragId optional als Fallback
 */
'use strict';

(function (global) {

  const ProvaAssetEventBus = {
    _registered: false,
    _defaultAuftragId: null,

    activate(opts = {}) {
      this._defaultAuftragId = opts.auftragId || null;
      if (this._registered) return;
      this._registered = true;
      document.addEventListener('prova:asset-created', this._onAssetCreated.bind(this));
    },

    setDefaultAuftrag(auftragId) {
      this._defaultAuftragId = auftragId || null;
    },

    async _onAssetCreated(e) {
      const { asset_typ, asset_id, auftrag_id } = e.detail || {};
      if (!asset_typ || !asset_id) {
        console.warn('[prova-asset-event-bus] missing asset_typ/asset_id', e.detail);
        return;
      }
      const aid = auftrag_id || this._defaultAuftragId;
      if (!aid) {
        console.warn('[prova-asset-event-bus] no auftrag_id available — skip trigger');
        return;
      }
      if (!window.ProvaAssetTrigger) {
        console.warn('[prova-asset-event-bus] ProvaAssetTrigger not loaded');
        return;
      }
      const fn = ({
        diktat: 'processAudio',
        foto: 'processFoto',
        skizze: 'processSkizze',
        notiz: 'processNotiz'
      })[asset_typ];
      if (!fn) {
        console.warn('[prova-asset-event-bus] unknown asset_typ:', asset_typ);
        return;
      }
      try {
        await window.ProvaAssetTrigger[fn](asset_id, aid, { silent: false });
      } catch (err) {
        console.error('[prova-asset-event-bus] trigger failed:', err);
      }
    },

    /**
     * Helper für Upload-Pfade: dispatch des Events.
     * Beispiel: ProvaAssetEventBus.emit('foto', fotoId, auftragId)
     */
    emit(asset_typ, asset_id, auftrag_id) {
      document.dispatchEvent(new CustomEvent('prova:asset-created', {
        detail: { asset_typ, asset_id, auftrag_id }
      }));
    }
  };

  global.ProvaAssetEventBus = ProvaAssetEventBus;

  // Auto-activate falls auf einer Page mit Editor-Context
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body?.dataset.provaEditorMega65 === '1') {
      ProvaAssetEventBus.activate();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
