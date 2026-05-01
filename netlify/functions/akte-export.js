// PROVA — akte-export.js
// Generiert Word-Dokument (.docx) der Akte via docx-npm Bibliothek

const https = require('https');
const { requireAuth } = require('./lib/jwt-middleware');
const { getCorsHeaders } = require('./lib/cors-helper');

// S6 Phase 1.9: dynamische CORS-Headers per Request (vorher hardcoded
// auf prova-systems.de — App-Subdomain wurde geblockt). Audit-8 M-03.
function corsHeaders(event) {
  return { 'Content-Type': 'application/json', ...getCorsHeaders(event) };
}

exports.handler = requireAuth(async function(event, context) {
  const CORS = corsHeaders(event);
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({error:'Method not allowed'}) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { az, sv_email, fall, gutachten, briefe } = body;

    if (!az || !sv_email) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({error: 'az und sv_email erforderlich'}) };
    }

    // Einfaches RTF-Dokument (Word-kompatibel, keine npm-Abhängigkeit nötig)
    const f = fall || {};
    const datum = new Date().toLocaleDateString('de-DE');
    const svName = body.sv_name || sv_email;

    let rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\colortbl ;\\red11\\green34\\blue40;}
\\f0\\fs24

{\\pard\\qc\\cf1\\fs32\\b PROVA Systems — Aktenauszug\\par}
{\\pard\\qc\\fs20 Aktenzeichen: ${az} | Stand: ${datum}\\par}
\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par

{\\pard\\sb120\\b\\fs26 Stammdaten\\par}
{\\pard Auftraggeber: ${f.Auftraggeber_Name || '—'}\\par}
{\\pard Schadenart: ${f.Schadenart || '—'}\\par}
{\\pard Objekt: ${f.Schaden_Strasse ? f.Schaden_Strasse + ', ' + (f.PLZ||'') + ' ' + (f.Ort||'') : '—'}\\par}
{\\pard Schadensdatum: ${f.Schadensdatum || '—'}\\par}
{\\pard Ortstermin: ${f.Besichtigung_Datum || '—'}\\par}
{\\pard Status: ${f.Status || '—'}\\par}
\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par

{\\pard\\sb120\\b\\fs26 Gutachten\\par}`;

    if (gutachten && gutachten.length) {
      gutachten.forEach(function(g) {
        const gf = g.fields || g;
        rtf += `{\\pard Version ${gf.Version || '—'} | Status: ${gf.Status || '—'} | ${gf.Erstellt_Am || ''}\\par}`;
      });
    } else {
      rtf += `{\\pard Keine Gutachten vorhanden.\\par}`;
    }

    rtf += `\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par
{\\pard\\sb120\\b\\fs26 Korrespondenz\\par}`;

    if (briefe && briefe.length) {
      briefe.forEach(function(b) {
        const bf = b.fields || b;
        rtf += `{\\pard ${bf.brief_typ || '—'} | ${bf.gesendet_am ? new Date(bf.gesendet_am).toLocaleDateString('de-DE') : '—'} | ${bf.versand_status || '—'}\\par}`;
      });
    } else {
      rtf += `{\\pard Keine Briefe vorhanden.\\par}`;
    }

    rtf += `\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par
{\\pard\\b Erstellt von PROVA Systems | ${svName} | ${datum}\\par}
}`;

    // RTF als Base64 zurückgeben
    const base64 = Buffer.from(rtf).toString('base64');

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        filename: `PROVA-Akte-${az}-${datum.replace(/\./g,'-')}.rtf`,
        content_base64: base64,
        content_type: 'application/rtf'
      })
    };

  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({error: e.message}) };
  }
});
