import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function rtfEscape(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[\\{}]/g, '\\$&').slice(0, 5000);
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  const { az, sv_email, fall, gutachten, briefe, sv_name } = body;
  if (!az) return J({ error: 'az pflicht' }, 400);
  if (!sv_email) return J({ error: 'sv_email pflicht' }, 400);

  const f = fall || {};
  const datum = new Date().toLocaleDateString('de-DE');
  const svName = rtfEscape(sv_name || sv_email);
  const safeAz = rtfEscape(az);

  let rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\colortbl ;\\red11\\green34\\blue40;}
\\f0\\fs24

{\\pard\\qc\\cf1\\fs32\\b PROVA Systems — Aktenauszug\\par}
{\\pard\\qc\\fs20 Aktenzeichen: ${safeAz} | Stand: ${datum}\\par}
\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par

{\\pard\\sb120\\b\\fs26 Stammdaten\\par}
{\\pard Auftraggeber: ${rtfEscape(f.Auftraggeber_Name) || '—'}\\par}
{\\pard Schadenart: ${rtfEscape(f.Schadenart) || '—'}\\par}
{\\pard Objekt: ${f.Schaden_Strasse ? rtfEscape(f.Schaden_Strasse) + ', ' + rtfEscape(f.PLZ || '') + ' ' + rtfEscape(f.Ort || '') : '—'}\\par}
{\\pard Schadensdatum: ${rtfEscape(f.Schadensdatum) || '—'}\\par}
{\\pard Status: ${rtfEscape(f.Status) || '—'}\\par}
\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par

{\\pard\\sb120\\b\\fs26 Gutachten\\par}`;

  if (gutachten && gutachten.length) {
    for (const g of gutachten) {
      const gf = g.fields || g;
      rtf += `{\\pard Version ${rtfEscape(gf.Version) || '—'} | Status: ${rtfEscape(gf.Status) || '—'} | ${rtfEscape(gf.Erstellt_Am) || ''}\\par}`;
    }
  } else {
    rtf += `{\\pard Keine Gutachten vorhanden.\\par}`;
  }

  rtf += `\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par
{\\pard\\sb120\\b\\fs26 Korrespondenz\\par}`;

  if (briefe && briefe.length) {
    for (const b of briefe) {
      const bf = b.fields || b;
      rtf += `{\\pard ${rtfEscape(bf.brief_typ) || '—'} | ${bf.gesendet_am ? new Date(bf.gesendet_am).toLocaleDateString('de-DE') : '—'} | ${rtfEscape(bf.versand_status) || '—'}\\par}`;
    }
  } else {
    rtf += `{\\pard Keine Briefe vorhanden.\\par}`;
  }

  rtf += `\\pard\\sb240\\sa120\\brdrb\\brdrs\\brdrw10\\brsp20\\par
{\\pard\\b Erstellt von PROVA Systems | ${svName} | ${datum}\\par}
}`;

  return J({
    success: true,
    filename: `PROVA-Akte-${az}-${datum.replace(/\./g, '-')}.rtf`,
    content_base64: toBase64(rtf),
    content_type: 'application/rtf'
  });
});
