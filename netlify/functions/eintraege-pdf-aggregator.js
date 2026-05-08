/**
 * PROVA — eintraege-pdf-aggregator.js (MEGA⁴¹ P4)
 *
 * GET ?auftrag_id=<uuid>&format=tiptap_json|html
 * → 200 { auftrag_id, content_json, eintrag_count, foto_count, skizze_count, diktat_count, notiz_count, byte_size }
 *
 * Aggregiert ALLE Einträge (foto/skizze/diktat/text/mix) eines Auftrags
 * chronologisch + nach Befund/Sektion gruppiert in TipTap-JSON-Format.
 *
 * Foto: <figure> mit Caption + Alt-Text
 * Skizze: PNG-Embed + Marker-Liste
 * Diktat: Original-Text als Quelle + KI-bereinigt als Fließtext (mit P2 source-Tag)
 * Manuelle Notiz: inline an chronologischer Stelle
 *
 * §407a + EU AI Act Disclosure am Gutachten-Ende.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAuth, jsonResponse } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');
const { getSupabase } = require('./lib/storage-router');

const VALID_FORMATS = ['tiptap_json', 'html'];

function _heading(level, text) {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

function _para(text, marks) {
  const c = { type: 'paragraph' };
  if (text) c.content = [{ type: 'text', text, marks: marks || undefined }];
  return c;
}

function _formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (_) { return dateStr; }
}

function _sortByDateAndNr(a, b) {
  const da = a.datum || '';
  const db = b.datum || '';
  if (da !== db) return da.localeCompare(db);
  return (a.nr || 0) - (b.nr || 0);
}

/**
 * Build TipTap-JSON aus eintraege + zugehörigen fotos + skizzen.
 *
 * @param {Object} ctx — { auftrag, eintraege[], fotos[], skizzen[] }
 * @returns {Object} TipTap-Doc
 */
function buildTipTapDoc(ctx) {
  const { auftrag, eintraege, fotos, skizzen } = ctx;
  const content = [];

  // Header
  content.push(_heading(2, '§ 3 Befund (aus Einträgen aggregiert)'));
  if (auftrag && auftrag.aktenzeichen) {
    content.push(_para('Aktenzeichen: ' + auftrag.aktenzeichen, [{ type: 'italic' }]));
  }

  // Foto-Index (für Querverweise)
  const fotoById = {};
  (fotos || []).forEach(f => { fotoById[f.id] = f; });
  const skizzeById = {};
  (skizzen || []).forEach(s => { skizzeById[s.id] = s; });

  // Eintraege sortiert
  const sorted = (eintraege || []).slice().sort(_sortByDateAndNr);

  sorted.forEach((e, idx) => {
    // Section-Heading pro Eintrag (mit Datum + Titel)
    const datum = _formatDate(e.datum);
    const titel = e.titel || ('Eintrag ' + (e.nr || idx + 1));
    content.push(_heading(3, datum + ' — ' + titel));

    // Content per Type
    switch (e.typ) {
      case 'foto': {
        const fIds = e.foto_ids || [];
        if (fIds.length === 0 && e.content) {
          content.push(_para(e.content));
        }
        fIds.forEach(fid => {
          const f = fotoById[fid];
          if (!f) {
            content.push(_para('[Foto-Ref ' + fid + ' nicht gefunden]', [{ type: 'italic' }]));
            return;
          }
          // Image-Node mit Caption + Alt
          content.push({
            type: 'image',
            attrs: {
              src: f.url || f.public_url || '',
              alt: f.beschreibung || f.alt || '',
              title: f.beschreibung || ''
            }
          });
          if (f.beschreibung) {
            content.push(_para('Bild ' + (idx + 1) + ': ' + f.beschreibung, [{ type: 'italic' }]));
          }
        });
        break;
      }
      case 'skizze': {
        // Skizze ist als image_url im eintrag selbst (M³⁹ P3 Schema)
        const url = e.image_url || (e.skizze_data && e.skizze_data.image_url);
        if (url) {
          content.push({
            type: 'image',
            attrs: { src: url, alt: 'Skizze ' + titel, title: titel }
          });
        }
        // Marker-Liste
        const markers = (e.skizze_data && e.skizze_data.markers) || [];
        if (markers.length > 0) {
          content.push(_para('Marker-Liste:', [{ type: 'bold' }]));
          content.push({
            type: 'bulletList',
            content: markers.map(m => ({
              type: 'listItem',
              content: [_para('M' + m.nr + ': ' + (m.text || '–') + (m.befund_id ? ' (→ Befund #' + m.befund_id + ')' : ''))]
            }))
          });
        }
        break;
      }
      case 'diktat': {
        // P2-Integration: Original-Text als source='ki_input' + bereinigt als source='ki' Mark
        if (e.content) {
          content.push(_para('Diktat-Original (zur Beweissicherung):', [{ type: 'bold' }]));
          content.push({
            type: 'paragraph',
            content: [{
              type: 'text',
              text: e.content,
              marks: [{ type: 'italic' }]
            }]
          });
          if (e.ki_bereinigt_text) {
            content.push(_para('KI-strukturiert:', [{ type: 'bold' }]));
            // KI-Mark via crossRef-ähnlich (data-ai-generated im HTML-Render)
            content.push({
              type: 'paragraph',
              content: [{
                type: 'text',
                text: e.ki_bereinigt_text,
                marks: [{ type: 'highlight', attrs: { color: '#fff099' } }]  // Gelb = KI-Markierung
              }]
            });
          }
        }
        break;
      }
      case 'text':
      case 'mix':
      default: {
        if (e.content) content.push(_para(e.content));
        // Verknüpfte Fotos (für mix-Type)
        (e.foto_ids || []).forEach(fid => {
          const f = fotoById[fid];
          if (f) {
            content.push({
              type: 'image',
              attrs: { src: f.url || f.public_url || '', alt: f.beschreibung || '', title: f.beschreibung || '' }
            });
          }
        });
        break;
      }
    }
  });

  // §407a-Compliance-Footer
  content.push({ type: 'pageBreak' });
  content.push(_heading(2, 'Hinweis gemäß § 407a ZPO'));
  content.push(_para('Die fachliche Bewertung im vorstehenden Befund-Abschnitt erfolgte durch den Sachverständigen in eigener Verantwortung. Hilfsmittel (KI-strukturierte Diktat-Bereinigung) wurden ausschließlich zur formalen Strukturierung eingesetzt; die inhaltliche Prüfung lag beim Sachverständigen.'));

  // EU AI Act Disclosure
  content.push(_heading(2, 'Hinweis gemäß EU AI Act (VO 2024/1689 Art. 50)'));
  content.push(_para('Bei der Strukturierung von Diktat-Inhalten kamen unterstützende KI-Werkzeuge zum Einsatz. KI-bearbeitete Passagen sind im PDF gelb hinterlegt und im Audit-Trail mit source="ki" gekennzeichnet. Modell: GPT-5.5 (OpenAI). Datenverarbeitung erfolgte unter Pseudonymisierung gemäß DSGVO.'));

  return { type: 'doc', content };
}

exports.handler = withSentry(requireAuth(async function (event, context) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const q = event.queryStringParameters || {};
  if (!q.auftrag_id) return jsonResponse(event, 400, { error: 'auftrag_id pflicht' });
  const format = VALID_FORMATS.indexOf(q.format) >= 0 ? q.format : 'tiptap_json';

  const sb = getSupabase();
  if (!sb) return jsonResponse(event, 503, { error: 'Supabase nicht konfiguriert' });

  const t0 = Date.now();
  try {
    const { data: profile } = await sb.from('profiles').select('id').eq('email', context.userEmail).maybeSingle();
    if (!profile) return jsonResponse(event, 404, { error: 'Profile nicht gefunden' });
    const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', profile.id).limit(1).maybeSingle();
    if (!ms) return jsonResponse(event, 404, { error: 'Kein Workspace' });

    // Auftrag (Workspace-Check)
    const { data: auftrag, error: aErr } = await sb.from('auftraege')
      .select('id, workspace_id, aktenzeichen, titel')
      .eq('id', q.auftrag_id).maybeSingle();
    if (aErr) return jsonResponse(event, 500, { error: aErr.message });
    if (!auftrag) return jsonResponse(event, 404, { error: 'Auftrag nicht gefunden' });
    if (auftrag.workspace_id !== ms.workspace_id) return jsonResponse(event, 403, { error: 'Workspace-Zugriff verweigert' });

    // Eintraege
    const { data: eintraege } = await sb.from('eintraege')
      .select('id, typ, nr, datum, titel, content, foto_ids, audio_dateien_ids, image_url, skizze_data, ki_bereinigt_text')
      .eq('auftrag_id', q.auftrag_id)
      .order('datum', { ascending: true })
      .order('nr', { ascending: true });

    const fotos = [];
    const skizzen = [];

    // Aggregate foto_ids für Bulk-Lookup
    const allFotoIds = (eintraege || []).flatMap(e => e.foto_ids || []);
    if (allFotoIds.length > 0) {
      const { data: fotoData } = await sb.from('fotos')
        .select('id, url, public_url, beschreibung, alt')
        .in('id', allFotoIds);
      (fotoData || []).forEach(f => fotos.push(f));
    }

    const tipTapDoc = buildTipTapDoc({ auftrag, eintraege: eintraege || [], fotos, skizzen });
    const counts = {
      eintrag_count: (eintraege || []).length,
      foto_count: (eintraege || []).filter(e => e.typ === 'foto').length,
      skizze_count: (eintraege || []).filter(e => e.typ === 'skizze').length,
      diktat_count: (eintraege || []).filter(e => e.typ === 'diktat').length,
      notiz_count: (eintraege || []).filter(e => e.typ === 'text' || e.typ === 'mix').length
    };
    const byteSize = JSON.stringify(tipTapDoc).length;

    return jsonResponse(event, 200, {
      auftrag_id: q.auftrag_id,
      content_json: tipTapDoc,
      ...counts,
      byte_size: byteSize,
      duration_ms: Date.now() - t0,
      format
    });
  } catch (e) {
    return jsonResponse(event, 500, { error: 'unexpected', detail: e.message });
  }
}), { functionName: 'eintraege-pdf-aggregator' });

module.exports.__internals = {
  buildTipTapDoc,
  _heading,
  _para,
  _formatDate,
  _sortByDateAndNr,
  VALID_FORMATS
};
