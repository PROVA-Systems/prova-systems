// PROVA — Airtable Proxy v2
// Fixes: Ownership-Check PATCH/DELETE, kein Body._userEmail-Fallback,
//        KI_STATISTIK/KI_LERNPOOL SV_Email-Filter, Table-Whitelist
const AIRTABLE_BASE_URL = 'https://api.airtable.com';
const { hasProvaAccess, TABLE_SV, BASE_ID } = require('./lib/prova-subscription.js');

// ── Erlaubte Tabellen + welches Feld als User-Filter gilt ──────────────────
const ALLOWED_TABLES = {
  tblSxV8bsXwd1pwa0: { name: 'SCHADENSFAELLE',   userField: 'sv_email' },
  tbladqEQT3tmx4DIB: { name: 'SACHVERSTAENDIGE',  userField: 'Email' }, // Ownership via Email-Feld
  tblqQmMwJKxltXXXl: { name: 'AUDIT_TRAIL',       userField: 'Email' },
  tblv9F8LEnUC3mKru: { name: 'KI_STATISTIK',      userField: 'SV_Email' },
  tbl4LEsMvcDKFCYaF: { name: 'KI_LERNPOOL',       userField: 'SV_Email' },
  tblMKmPLjRelr6Hal: { name: 'KONTAKTE',           userField: 'sv_email' }, // Multi-Tenant
  tblF6MS7uiFAJDjiT: { name: 'RECHNUNGEN',         userField: 'sv_email' },
  tblyMTTdtfGQjjmc2: { name: 'TERMINE',            userField: 'sv_email' },
  tblDS8NQxzceGedJO: { name: 'TEXTBAUSTEINE',      userField: 'sv_email' },
  tblSzxvnkRE6B0thx: { name: 'BRIEFE',             userField: 'sv_email' },
};

function isSvTablePath(path) {
  return typeof path === 'string' && TABLE_SV && path.indexOf(TABLE_SV) >= 0;
}

function getAllowedTable(path) {
  for (const [tableId, info] of Object.entries(ALLOWED_TABLES)) {
    if (path.indexOf(tableId) >= 0) return { tableId, ...info };
  }
  return null;
}

// ── Ownership prüfen: Gehört der Record dem anfragenden User? ────────────────
async function checkOwnership(pat, path, userEmail) {
  try {
    // Record-ID aus Pfad extrahieren (z.B. /v0/appXXX/tblXXX/recXXXXXXXXXXXXXXX)
    const recMatch = path.match(/\/(rec[A-Za-z0-9]{14})/);
    if (!recMatch) return true; // Kein Record-ID = kein Check nötig (z.B. POST auf Tabelle)
    const recordId = recMatch[1];

    const tableInfo = getAllowedTable(path);
    if (!tableInfo || !tableInfo.userField) return true; // Kein userField = kein Ownership-Check

    // Record aus Airtable lesen
    const url = AIRTABLE_BASE_URL + '/v0/' + BASE_ID + '/' + tableInfo.tableId + '/' + recordId;
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + pat }
    });
    if (!res.ok) return false;
    const data = await res.json();
    const recordEmail = ((data.fields || {})[tableInfo.userField] || '').toString().trim().toLowerCase();
    return recordEmail === userEmail.trim().toLowerCase();
  } catch(e) {
    return false;
  }
}

exports.handler = async function(event, context) {
  // CORS
  const origin = event.headers['origin'] || '';
  const allowedOrigin = process.env.URL || 'https://prova-systems.de';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin.includes('prova-systems.de') ? origin : allowedOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht konfiguriert' }) };
  }

  let clientPayload;
  try {
    clientPayload = JSON.parse(event.body || '{}');
  } catch(e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Ungültiger Request-Body' }) };
  }

  const method = (clientPayload.method || 'GET').toUpperCase();
  const path   = clientPayload.path || '';
  const bodyForAirtable = Object.prototype.hasOwnProperty.call(clientPayload, 'body')
    ? clientPayload.body : clientPayload.payload;

  if (!path.startsWith('/v0/')) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Ungültiger Pfad' }) };
  }

  // ── Internes Secret (Make.com → Netlify) ────────────────────────────────
  const internal = (event.headers['x-prova-internal'] || '').trim();
  const internalOk = process.env.PROVA_INTERNAL_WRITE_SECRET &&
                     internal === process.env.PROVA_INTERNAL_WRITE_SECRET;

  // ── JWT-Pflicht: KEIN _userEmail Body-Fallback ──────────────────────────
  const user = context.clientContext && context.clientContext.user;
  const userEmail = user && user.email ? String(user.email).trim().toLowerCase() : null;

  if (!internalOk) {
    if (!userEmail) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Anmeldung erforderlich — gültiger JWT notwendig' })
      };
    }

    // Abo/Trial-Check nur für SV-eigene Tabellen
    if (isSvTablePath(path)) {
      const accessResult = await hasProvaAccess(userEmail, pat);
      const accessOk = typeof accessResult === 'boolean' ? accessResult : (accessResult && accessResult.ok);
      if (!accessOk) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Kein Zugriff — Trial abgelaufen oder kein aktives Abo' })
        };
      }
    }

    // ── OWNERSHIP-CHECK bei PATCH/DELETE ─────────────────────────────────
    if (method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
      const ownerOk = await checkOwnership(pat, path, userEmail);
      if (!ownerOk) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Kein Zugriff — Record gehört einem anderen Nutzer' })
        };
      }
    }
  }

  // ── Airtable-Request ausführen ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  // BUG #001 FIX: SERVER-SEITIGER SV_EMAIL FILTER INJECTION (GET-Requests)
  // Verhindert Multi-Tenant Datenleck — NIEMALS entfernen!
  // Jeder eingeloggte User sieht NUR seine eigenen Records.
  // ══════════════════════════════════════════════════════════════════════════
  function injectUserEmailFilter(urlString, email, tableConf) {
    if (!email || !tableConf || !tableConf.userField) return urlString;
    try {
      const u = new URL(urlString);
      const field        = tableConf.userField;
      const escapedEmail = email.replace(/"/g, '\\"');
      const emailFilter  = `{${field}}="${escapedEmail}"`;
      const existing     = u.searchParams.get('filterByFormula');
      const isTrivial    = !existing || existing === 'TRUE()' || existing === '';
      const newFilter    = isTrivial ? emailFilter : `AND(${emailFilter},${existing})`;
      u.searchParams.set('filterByFormula', newFilter);
      return u.toString();
    } catch (e) {
      throw new Error('GET-Filter-Injektion fehlgeschlagen: ' + e.message);
    }
  }

  // Bei GET-Requests: SV_Email-Filter server-seitig injizieren
  let finalPath = path;
  if (method === 'GET' && !internalOk && userEmail) {
    const tableConf = getAllowedTable(path);
    if (tableConf && tableConf.userField) {
      try {
        const withBase = AIRTABLE_BASE_URL + path;
        finalPath = injectUserEmailFilter(withBase, userEmail, tableConf)
          .replace(AIRTABLE_BASE_URL, '');
      } catch (filterErr) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Zugriff verweigert — Filter-Fehler: ' + filterErr.message })
        };
      }
    }
  }

  const url = AIRTABLE_BASE_URL + finalPath;
  const fetchOptions = {
    method,
    headers: { Authorization: 'Bearer ' + pat, 'Content-Type': 'application/json' }
  };
  if (bodyForAirtable != null && method !== 'GET') {
    fetchOptions.body = JSON.stringify(bodyForAirtable);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: text
    };
  } catch(err) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Airtable nicht erreichbar: ' + err.message })
    };
  }
};
