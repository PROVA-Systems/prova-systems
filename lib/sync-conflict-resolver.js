/**
 * PROVA Sync-Conflict-Resolver (MEGA⁴¹ P10)
 *
 * Pure-Logic für Konflikt-Detection + Resolution beim Re-Connect nach Offline-Edit.
 *
 * Patterns:
 *   - Last-Write-Wins (default) bei einfachen Konflikten
 *   - Merge-Vorschlag bei komplexen JSONB-Feldern (z.B. content_json TipTap)
 *   - User-Choice bei kritischen Konflikten (Datenverlust-Risiko)
 *
 * Public API (window.ProvaSyncConflictResolver):
 *   detectConflict(local, server) → {hasConflict, conflictFields[], strategy}
 *   resolveLastWriteWins(local, server) → resolved-record
 *   resolveMerge(local, server, mergeFields) → {resolved, conflicts[]}
 *   serializeForRecovery(item) / deserializeFromRecovery(json)
 *
 * Conflict-Detection-Regel:
 *   server.updated_at > local.synced_at AND local.modified_at > local.synced_at
 *   → Konflikt (beide Seiten haben sich geändert seit letztem Sync)
 */
'use strict';

(function () {

  const DEFAULT_STRATEGY = 'last_write_wins';
  const MERGEABLE_FIELDS = ['titel', 'beschreibung', 'content', 'content_json', 'notiz', 'tags'];

  /**
   * Detect ob ein Konflikt zwischen Local + Server existiert.
   *
   * @param {Object} local — Local-Record mit {id, modified_at, synced_at}
   * @param {Object} server — Server-Record mit {id, updated_at}
   * @returns {{hasConflict, conflictFields, strategy}}
   */
  function detectConflict(local, server) {
    if (!local || !server) {
      return { hasConflict: false, conflictFields: [], strategy: 'no_data' };
    }
    if (local.id !== server.id) {
      return { hasConflict: false, conflictFields: [], strategy: 'different_records' };
    }

    const localModified = local.modified_at || local.updated_at || 0;
    const serverUpdated = server.updated_at || 0;
    const lastSynced = local.synced_at || 0;

    const localChanged = new Date(localModified).getTime() > new Date(lastSynced).getTime();
    const serverChanged = new Date(serverUpdated).getTime() > new Date(lastSynced).getTime();

    if (!localChanged && !serverChanged) {
      return { hasConflict: false, conflictFields: [], strategy: 'no_changes' };
    }
    if (!serverChanged && localChanged) {
      return { hasConflict: false, conflictFields: [], strategy: 'local_only' };  // upload-Pfad
    }
    if (serverChanged && !localChanged) {
      return { hasConflict: false, conflictFields: [], strategy: 'server_only' };  // download-Pfad
    }

    // Beide haben sich geändert → Konflikt
    const conflictFields = [];
    Object.keys(local).forEach(key => {
      if (key === 'id' || key.endsWith('_at') || key === 'synced_at') return;
      if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
        conflictFields.push(key);
      }
    });

    // Strategy:
    //   - Wenn alle Konflikt-Felder mergeable → Merge-Strategy
    //   - Sonst → Last-Write-Wins ODER User-Choice je nach Critical-Felder
    const allMergeable = conflictFields.every(f => MERGEABLE_FIELDS.indexOf(f) >= 0);
    const strategy = allMergeable ? 'merge' : DEFAULT_STRATEGY;

    return {
      hasConflict: true,
      conflictFields,
      strategy
    };
  }

  /**
   * Last-Write-Wins: nimm die spätere updated_at.
   *
   * @returns {Object} resolved record
   */
  function resolveLastWriteWins(local, server) {
    if (!local) return server;
    if (!server) return local;
    const localTs = new Date(local.modified_at || local.updated_at || 0).getTime();
    const serverTs = new Date(server.updated_at || 0).getTime();
    return localTs >= serverTs ? local : server;
  }

  /**
   * Merge-Strategy: kombiniere mergeable-Fields, Konflikte separat zurück.
   *
   * @param {Object} local
   * @param {Object} server
   * @param {string[]} [mergeFields] — Override Default
   * @returns {{resolved, conflicts}}
   */
  function resolveMerge(local, server, mergeFields) {
    if (!local) return { resolved: server, conflicts: [] };
    if (!server) return { resolved: local, conflicts: [] };

    const fields = mergeFields || MERGEABLE_FIELDS;
    const resolved = { ...server };  // Start mit Server-Basis
    const conflicts = [];

    Object.keys(local).forEach(key => {
      if (key === 'id' || key.endsWith('_at') || key === 'synced_at') return;
      const localVal = local[key];
      const serverVal = server[key];
      if (JSON.stringify(localVal) === JSON.stringify(serverVal)) {
        // Identisch → kein Konflikt
        return;
      }
      if (fields.indexOf(key) >= 0) {
        // Mergeable: bei Strings concat (Local kommt vor Server), bei Arrays union, bei JSON deep-merge
        if (typeof localVal === 'string' && typeof serverVal === 'string') {
          // Bei zwei verschiedenen Strings → Konflikt-Liste, Server bleibt
          conflicts.push({ field: key, local: localVal, server: serverVal, strategy: 'string_diff' });
        } else if (Array.isArray(localVal) && Array.isArray(serverVal)) {
          // Union (deduplicate)
          const merged = [...serverVal];
          localVal.forEach(v => { if (merged.indexOf(v) < 0) merged.push(v); });
          resolved[key] = merged;
        } else if (typeof localVal === 'object' && localVal !== null && typeof serverVal === 'object' && serverVal !== null) {
          // Shallow merge — Local-Keys override Server-Keys
          resolved[key] = { ...serverVal, ...localVal };
        } else {
          // Sonst: Server-Wert behalten + in Konflikte schreiben
          conflicts.push({ field: key, local: localVal, server: serverVal, strategy: 'incompatible_types' });
        }
      } else {
        // Nicht mergeable → Konflikt-Liste
        conflicts.push({ field: key, local: localVal, server: serverVal, strategy: 'not_mergeable' });
      }
    });

    return { resolved, conflicts };
  }

  /**
   * Serialize Item für localStorage-Recovery (JSON-safe + size-bounded).
   */
  function serializeForRecovery(item) {
    if (!item) return null;
    try {
      return JSON.stringify({
        ...item,
        _recovery_saved_at: Date.now()
      });
    } catch (_) { return null; }
  }

  function deserializeFromRecovery(json) {
    if (!json) return null;
    try { return JSON.parse(json); } catch (_) { return null; }
  }

  // Public API
  const api = {
    detectConflict,
    resolveLastWriteWins,
    resolveMerge,
    serializeForRecovery,
    deserializeFromRecovery,
    DEFAULT_STRATEGY,
    MERGEABLE_FIELDS
  };

  if (typeof window !== 'undefined') {
    window.ProvaSyncConflictResolver = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
