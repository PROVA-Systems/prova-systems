const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-prova-secret'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function sendResend(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = Deno.env.get('PROVA_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, reason: 'no_resend_key' };
  const from = Deno.env.get('PROVA_RESEND_FROM_TERMINE') ?? Deno.env.get('RESEND_FROM') ?? 'PROVA Terminkalender <termine@prova-systems.de>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text })
    });
    if (!res.ok) return { ok: false, reason: 'http_' + res.status };
    return { ok: true };
  } catch (e) { return { ok: false, reason: e instanceof Error ? e.message : String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);

  const secret = req.headers.get('x-prova-secret') ?? '';
  const expected = Deno.env.get('PROVA_TERMIN_REMINDER_SECRET') ?? Deno.env.get('TERMIN_REMINDER_SECRET') ?? '';
  if (expected && secret !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { sv_email, termin_datum, termin_typ, objekt_adresse, aktenzeichen, tage_bis, auftragstyp } = body;
  if (!sv_email || !termin_datum) return jsonResponse({ error: 'sv_email + termin_datum erforderlich' }, 400);

  const datum = new Date(termin_datum).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const farbe = tage_bis <= 1 ? '#ef4444' : tage_bis <= 3 ? '#f59e0b' : '#4f8ef7';
  const emoji = tage_bis <= 1 ? '🚨' : tage_bis <= 3 ? '⚠️' : '📅';
  const zeitStr = tage_bis <= 0 ? 'HEUTE' : tage_bis === 1 ? 'MORGEN' : 'in ' + tage_bis + ' Tagen';
  const subject = emoji + ' Termin ' + zeitStr + ': ' + (termin_typ || 'Ortstermin') + (aktenzeichen ? ' · Az.: ' + aktenzeichen : '');

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0b1120;border-radius:14px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,${farbe}22,${farbe}11);border-bottom:2px solid ${farbe};padding:20px 24px;">
      <div style="font-size:13px;font-weight:700;color:${farbe};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">
        ${emoji} Termin-Erinnerung · PROVA
      </div>
      <div style="font-size:20px;font-weight:800;color:#f1f5f9;">
        ${termin_typ || 'Ortstermin'} ${zeitStr}
      </div>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#64748b;font-size:12px;width:120px;">Datum & Uhrzeit</td>
            <td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#e8eaf0;font-weight:600;font-size:13px;">${datum}</td></tr>
        ${objekt_adresse ? `<tr><td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#64748b;font-size:12px;">Objekt</td>
            <td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#e8eaf0;font-size:13px;">${objekt_adresse}</td></tr>` : ''}
        ${aktenzeichen ? `<tr><td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#64748b;font-size:12px;">Aktenzeichen</td>
            <td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#4f8ef7;font-weight:700;font-size:13px;">${aktenzeichen}</td></tr>` : ''}
        ${auftragstyp ? `<tr><td style="padding:8px 0;color:#64748b;font-size:12px;">Auftragstyp</td>
            <td style="padding:8px 0;color:#e8eaf0;font-size:13px;">${auftragstyp}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;text-align:center;">
        <a href="https://prova-systems.de/termine.html" style="display:inline-block;background:${farbe};color:#fff;padding:12px 24px;border-radius:9px;text-decoration:none;font-weight:700;font-size:13px;">
          Alle Termine ansehen →
        </a>
      </div>
    </div>
    <div style="padding:12px 24px;border-top:1px solid #1e3a5f;font-size:10px;color:#374151;text-align:center;">
      PROVA Systems · Automatische Termin-Erinnerung · <a href="https://prova-systems.de" style="color:#4f8ef7;">prova-systems.de</a>
    </div>
  </div>`;

  const text = subject + '\n\n' + datum + '\n' + (objekt_adresse || '') + '\nAz.: ' + (aktenzeichen || '');
  const result = await sendResend(sv_email, subject, html, text);
  if (!result.ok) return jsonResponse({ error: result.reason }, 502);
  return jsonResponse({ success: true, to: sv_email });
});
