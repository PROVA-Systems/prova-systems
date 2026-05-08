/**
 * PROVA — audit-source-helper.js (MEGA⁴¹ P2)
 *
 * Server-Side Helper für audit_trail-Inserts mit KI-vs-SV-Trennung.
 *
 * Public API:
 *   logKiCall(sb, opts) — Insert mit source='ki' + ki_model + confidence + eu_ai_act_disclosed=true
 *   logSvEigen(sb, opts) — Insert mit source='sv_eigen'
 *   logSvUebernommen(sb, opts) — Insert mit source='sv_uebernommen' + original_ki_ref
 *   computeIntegrityHash(payload) — SHA256 für TR-ESOR Beweissicherheit
 */
'use strict';

const crypto = require('crypto');

function computeIntegrityHash(action, entityId, payload, createdAt, prevHash) {
  const input = JSON.stringify({
    action: action || '',
    entity_id: entityId || '',
    payload: payload || {},
    created_at: createdAt || '',
    prev_hash: prevHash || ''
  });
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function _getLastHash(sb, workspaceId) {
  if (!sb || !workspaceId) return null;
  try {
    const { data } = await sb.from('audit_trail')
      .select('integrity_hash')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? data.integrity_hash : null;
  } catch (_) { return null; }
}

/**
 * Log a KI-Call.
 *
 * @param {Object} sb — Supabase-Client (Service-Role)
 * @param {Object} opts - { workspaceId, userId, action, entityTyp, entityId, payload, kiModel, kiConfidence }
 * @returns {Promise<{id, integrity_hash}|null>}
 */
async function logKiCall(sb, opts) {
  if (!sb || !opts || !opts.workspaceId) return null;
  const prevHash = await _getLastHash(sb, opts.workspaceId);
  const createdAt = new Date().toISOString();
  const integrityHash = computeIntegrityHash(opts.action, opts.entityId, opts.payload, createdAt, prevHash);
  try {
    const { data } = await sb.from('audit_trail').insert({
      workspace_id: opts.workspaceId,
      user_id: opts.userId,
      action: opts.action || 'ki_assist_used',
      entity_typ: opts.entityTyp || null,
      entity_id: opts.entityId || null,
      payload: opts.payload || {},
      source: 'ki',
      ki_model: opts.kiModel || null,
      ki_confidence: typeof opts.kiConfidence === 'number' ? opts.kiConfidence : null,
      eu_ai_act_disclosed: true,
      prev_hash: prevHash,
      integrity_hash: integrityHash,
      created_at: createdAt,
      ip_address: opts.ipAddress || null,
      user_agent: opts.userAgent || null
    }).select('id, integrity_hash').maybeSingle();
    return data;
  } catch (e) {
    console.warn('[audit-source-helper] logKiCall failed:', e.message);
    return null;
  }
}

async function logSvEigen(sb, opts) {
  if (!sb || !opts || !opts.workspaceId) return null;
  const prevHash = await _getLastHash(sb, opts.workspaceId);
  const createdAt = new Date().toISOString();
  const integrityHash = computeIntegrityHash(opts.action, opts.entityId, opts.payload, createdAt, prevHash);
  try {
    const { data } = await sb.from('audit_trail').insert({
      workspace_id: opts.workspaceId,
      user_id: opts.userId,
      action: opts.action || 'sv_input',
      entity_typ: opts.entityTyp || null,
      entity_id: opts.entityId || null,
      payload: opts.payload || {},
      source: 'sv_eigen',
      eu_ai_act_disclosed: false,
      prev_hash: prevHash,
      integrity_hash: integrityHash,
      created_at: createdAt,
      ip_address: opts.ipAddress || null,
      user_agent: opts.userAgent || null
    }).select('id, integrity_hash').maybeSingle();
    return data;
  } catch (e) {
    console.warn('[audit-source-helper] logSvEigen failed:', e.message);
    return null;
  }
}

/**
 * SV hat KI-Vorschlag akzeptiert (Toll-Wichtig fuer Beweisrecht).
 *
 * @param {Object} opts - inkludiert originalKiRef (UUID des KI-Eintrags)
 */
async function logSvUebernommen(sb, opts) {
  if (!sb || !opts || !opts.workspaceId) return null;
  if (!opts.originalKiRef) {
    console.warn('[audit-source-helper] logSvUebernommen: originalKiRef pflicht');
    return null;
  }
  const prevHash = await _getLastHash(sb, opts.workspaceId);
  const createdAt = new Date().toISOString();
  const integrityHash = computeIntegrityHash(opts.action, opts.entityId, opts.payload, createdAt, prevHash);
  try {
    const { data } = await sb.from('audit_trail').insert({
      workspace_id: opts.workspaceId,
      user_id: opts.userId,
      action: opts.action || 'ki_suggestion_accepted',
      entity_typ: opts.entityTyp || null,
      entity_id: opts.entityId || null,
      payload: opts.payload || {},
      source: 'sv_uebernommen',
      original_ki_ref: opts.originalKiRef,
      eu_ai_act_disclosed: true,  // weil ursprünglich KI
      prev_hash: prevHash,
      integrity_hash: integrityHash,
      created_at: createdAt,
      ip_address: opts.ipAddress || null,
      user_agent: opts.userAgent || null
    }).select('id, integrity_hash').maybeSingle();
    return data;
  } catch (e) {
    console.warn('[audit-source-helper] logSvUebernommen failed:', e.message);
    return null;
  }
}

module.exports = {
  computeIntegrityHash,
  logKiCall,
  logSvEigen,
  logSvUebernommen,
  _getLastHash
};
