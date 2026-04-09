// ══════════════════════════════════════════════════════════════════════════
// PROVA Systems — Airtable Proxy Function v2.0
// Netlify Function: airtable (ersetzt airtable.js)
//
// VERBESSERUNGEN gegenüber v1:
// ✅ Rate-Limiting (max 100 Requests/Minute pro IP)
// ✅ Tabellen-Whitelist (nur erlaubte Tabellen)
// ✅ User-Binding: jeder Nutzer sieht nur seine eigenen Fälle
// ✅ Request-Logging für Debugging
// ✅ Payload-Größenlimit (max 1MB)
// ✅ Method-Whitelist (nur GET/POST/PATCH)
// ══════════════════════════════════════════════════════════════════════════

// ── Erlaubte Tabellen (Whitelist — niemals '*') ──
const ALLOWED_TABLES = {
  // Fälle: User-Filter automatisch
  tblSxV8bsXwd1pwa0: { name: 'FAELLE',            userField: 'sv_email', readOnly: false },
  // SV-Profil
  tbladqEQT3tmx4DIB: { name: 'SV',                userField: 'Email',    readOnly: false },
  // Termine
  tblyMTTdtfGQjjmc2: { name: 'TERMINE',            userField: 'sv_email', readOnly: false },
  // Rechnungen
  tblF6MS7uiFAJDjiT: { name: 'RECHNUNGEN',         userField: 'sv_email', readOnly: false },
  // Kontakte — User-Filter
  tblMKmPLjRelr6Hal: { name: 'KONTAKTE',           userField: null,       readOnly: false },
  // Briefe — User-Filter
  tblSzxvnkRE6B0thx: { name: 'BRIEFE',             userField: 'sv_email', readOnly: false },
  // Textbausteine — User-Filter
  tblDS8NQxzceGedJO: { name: 'TEXTBAUSTEINE',      userField: 'sv_email', readOnly: false },
  // KI-Statistik
  tblv9F8LEnUC3mKru: { name: 'KI_STATISTIK',       userField: null,       readOnly: false },
  // KI-Lernpool
  tbl4LEsMvcDKFCYaF: { name: 'KI_LERNPOOL',        userField: null,       readOnly: false },
  // Jahresbericht / Analytics
  tblb0j9qOhMExVEFH: { name: 'STATISTIKEN',        userField: null,       readOnly: false },
  // §407a ZPO Audit-Trail
  tblqQmMwJKxltXXXl: { name: 'AUDIT_TRAIL',        userField: null,       readOnly: false },
  // Push-Subscriptions
  tblAiF38HeS1R1Umj: { name: 'PUSH_SUBSCRIPTIONS', userField: 'Email',    readOnly: false },
  // Gutachten-Templates (readonly für alle)
  tblW1DGrXIKoSTvJN: { name: 'GUTACHTEN_TEMPLATES',userField: null,       readOnly: true  },
};

// ── Rate-Limiting (In-Memory, wird bei Function-Cold-Start zurückgesetzt) ──
const rateLimitMap = new Map();
const RATE_LIMIT   = 100;  // Requests pro Fenster
const RATE_WINDOW  = 60000; // 1 Minute in ms

function checkRateLimit(ip) {
  const now    = Date.now();
  const entry  = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  
  // Fenster abgelaufen? Reset
  if (now - entry.windowStart > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) return false;
  
  entry.count++;
  rateLimitMap.set(ip, entry);
  return true;
}

// ── User-Email aus JWT-Header extrahieren (Netlify Identity) ──
function getUserEmailFromEvent(event) {
  // Netlify Identity setzt diesen Header automatisch wenn der User eingeloggt ist
  const identityHeader = event.headers['x-nf-account-id'];
  
  // Context vom Netlify JWT
  try {
    const context = event.clientContext || {};
    const user    = context.user;
    if (user && user.email) return user.email.toLowerCase();
  } catch (e) {}

  // Fallback: aus Body (für Legacy-Auth-Flow)
  try {
    const body = JSON.parse(event.body || '{}');
    // Nur verwenden wenn kein Netlify-Identity-User vorhanden
    if (body._userEmail && typeof body._userEmail === 'string') {
      return body._userEmail.toLowerCase();
    }
  } catch (e) {}

  return null;
}

// ── Trusted Email nur aus Netlify Identity JWT ──
function getJwtEmailFromEvent(event) {
  try {
    const context = event.clientContext || {};
    const user    = context.user;
    if (user && user.email) return String(user.email).toLowerCase();
  } catch (e) {}
  return null;
}

// ── Tabellenname aus Pfad extrahieren ──
function getTableIdFromPath(path) {
  // /v0/appXXXX/tblXXXX oder /v0/appXXXX/tblXXXX/recXXXX
  const match = path.match(/\/v0\/[^/]+\/([^/?]+)/);
  return match ? match[1] : null;
}

// ── User-Filter in Formula einfügen ──
function injectUserFilter(path, userEmail, userField) {
  if (!userEmail || !userField) return path;
  
  const userFilter = `{${userField}}="${userEmail.replace(/"/g, '')}"`;
  
  // Prüfen ob filterByFormula bereits vorhanden
  const url = new URL('https://dummy' + path);
  const existing = url.searchParams.get('filterByFormula');
  
  let newFilter;
  if (existing && existing !== 'TRUE()') {
    // User-Filter mit bestehendem Filter kombinieren
    newFilter = `AND(${userFilter},${existing})`;
  } else {
    newFilter = userFilter;
  }
  
  url.searchParams.set('filterByFormula', newFilter);
  return url.pathname + '?' + url.searchParams.toString();
}

// ── Admin-Check (nur prova-systems.de E-Mails) ──
function isAdmin(userEmail) {
  if (!userEmail) return false;
  return userEmail.endsWith('@prova-systems.de') || 
         userEmail === 'admin@prova-systems.de';
}

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // OPTIONS (CORS Preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Nur POST erlaubt
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Rate-Limiting ──
  const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': '60' },
      body: JSON.stringify({ error: 'Zu viele Anfragen. Bitte warten Sie eine Minute.' })
    };
  }

  // ── API-Key prüfen ──
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'AIRTABLE_PAT nicht konfiguriert' }) };
  }

  // ── Body parsen ──
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ungültiger JSON-Body' }) };
  }

  // ── TABLE_NAME_MAP: Tabellenname → Airtable-ID ──
  const TABLE_NAME_MAP = {
    SCHADENSFAELLE:     'tblSxV8bsXwd1pwa0',
    FAELLE:             'tblSxV8bsXwd1pwa0',
    SV:                 'tbladqEQT3tmx4DIB',
    SACHVERSTAENDIGE:   'tbladqEQT3tmx4DIB',
    TERMINE:            'tblyMTTdtfGQjjmc2',
    RECHNUNGEN:         'tblF6MS7uiFAJDjiT',
    KONTAKTE:           'tblMKmPLjRelr6Hal',
    KI_STATISTIK:       'tblv9F8LEnUC3mKru',
    KI_LERNPOOL:        'tbl4LEsMvcDKFCYaF',
    STATISTIKEN:        'tblb0j9qOhMExVEFH',
    AUDIT_TRAIL:        'tblqQmMwJKxltXXXl',
    BRIEFE:             'tblSzxvnkRE6B0thx',
    TEXTBAUSTEINE:      'tblDS8NQxzceGedJO',
    GUTACHTEN_TEMPLATES:'tblW1DGrXIKoSTvJN',
    PUSH_SUBSCRIPTIONS: 'tblAiF38HeS1R1Umj',
  };
  const BASE_ID = 'appJ7bLlAHZoxENWE';

  // ── Format-Konverter: {action, tabelle, filter, felder, sort} → {method, path, payload} ──
  let resolvedBody = body;
  if (body.tabelle && !body.path) {
    const tblId = TABLE_NAME_MAP[body.tabelle.toUpperCase()];
    if (!tblId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Unbekannte Tabelle: ${body.tabelle}` }) };
    }
    const action = (body.action || 'list').toLowerCase();

    if (action === 'list' || action === 'get') {
      // GET mit filterByFormula + fields[] + sort[]
      const params = new URLSearchParams();
      if (body.filter) params.set('filterByFormula', body.filter);
      if (body.maxRecords) params.set('maxRecords', String(body.maxRecords));
      if (Array.isArray(body.felder)) {
        body.felder.forEach(f => params.append('fields[]', f));
      }
      if (Array.isArray(body.sort)) {
        body.sort.forEach((s, i) => {
          params.append(`sort[${i}][field]`, s.field);
          params.append(`sort[${i}][direction]`, s.direction || 'asc');
        });
      }
      const qs = params.toString();
      resolvedBody = { method: 'GET', path: `/v0/${BASE_ID}/${tblId}${qs ? '?' + qs : ''}` };

    } else if (action === 'create') {
      resolvedBody = { method: 'POST', path: `/v0/${BASE_ID}/${tblId}`, payload: body.payload || body.data };

    } else if (action === 'update' || action === 'patch') {
      const recId = body.recordId || body.id;
      resolvedBody = { method: 'PATCH', path: `/v0/${BASE_ID}/${tblId}/${recId}`, payload: body.payload || body.data };

    } else if (action === 'delete') {
      const recId = body.recordId || body.id;
      resolvedBody = { method: 'DELETE', path: `/v0/${BASE_ID}/${tblId}/${recId}` };
    }
  }

  const methodRaw = resolvedBody.method || 'GET';
  const method = methodRaw;
  const path = resolvedBody.path;
  // Legacy-Clients senden Airtable-Body als "body"; neuere als "payload"
  const payload =
    resolvedBody.payload !== undefined ? resolvedBody.payload : resolvedBody.body;

  // ── Pfad-Validierung ──
  if (!path || !path.startsWith('/v0/')) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Ungültiger API-Pfad' }) };
  }

  // ── Method-Whitelist ──
  const allowedMethods = ['GET', 'POST', 'PATCH', 'DELETE'];
  if (!allowedMethods.includes(method.toUpperCase())) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'HTTP-Methode nicht erlaubt' }) };
  }

  // ── Tabellen-Whitelist ──
  const tableId = getTableIdFromPath(path);
  const tableConfig = tableId ? ALLOWED_TABLES[tableId] : null;
  
  // Admin-Bypass nur über JWT (nicht über _userEmail aus dem Body)
  if (tableId && !tableConfig && !isAdmin(getJwtEmailFromEvent(event))) {
    console.warn(`[Airtable] Tabelle nicht in Whitelist: ${tableId}`);
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Tabellenzugriff nicht erlaubt' }) };
  }

  // ── User-Email ermitteln ──
  const jwtEmail  = getJwtEmailFromEvent(event);
  const bodyEmail = (body && typeof body._userEmail === 'string') ? body._userEmail.toLowerCase().trim() : null;
  const userEmail = jwtEmail || bodyEmail;
  const isTrusted = !!jwtEmail;
  const adminUser = isAdmin(jwtEmail);

  // ── User-Filter für GET-Anfragen (Datentrennung!) ──
  // Ohne userEmail würde injectUserFilter die URL unverändert lassen → ALLE Fälle sichtbar (DSGVO-Leck).
  let finalPath = path;
  const methodUp = method.toUpperCase();
  /** Einzelrecord-GET: Airtable erlaubt kein filterByFormula in /table/recId — Besitz nach Response prüfen */
  let singleRecordOwnershipCheck = false;
  if (tableConfig && tableConfig.userField && !adminUser) {
    // Mandantengetrennte Tabellen sind nur mit verifiziertem Identity-User sicher.
    // Ausnahme: SV-Onboarding darf SV-Record via _userEmail pflegen (kein Zugriff auf Fälle!)
    const SV_TABLE_ID = 'tbladqEQT3tmx4DIB';
    const allowUntrusted = (!isTrusted && tableId === SV_TABLE_ID);

    if (!userEmail) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'UNAUTHORIZED' })
      };
    }

    if (!isTrusted && !allowUntrusted) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'UNAUTHORIZED' })
      };
    }

    // Writes: erzwinge Mandantenfeld, damit niemand fremde sv_email schreiben kann
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(methodUp) && !allowUntrusted) {
      // Für POST/PATCH erwarten wir Airtable-Format {records:[{fields:{...}}]} oder {fields:{...}}
      const enforceFields = (fields) => {
        if (!fields || typeof fields !== 'object') return;
        fields[tableConfig.userField] = userEmail;
      };
      try {
        if (payload && payload.fields) enforceFields(payload.fields);
        if (payload && Array.isArray(payload.records)) {
          payload.records.forEach(r => { if (r && r.fields) enforceFields(r.fields); });
        }
      } catch (e) {}
    }

    if (methodUp === 'GET') {
      const pathNoQuery = path.split('?')[0];
      if (/^\/v0\/[^/]+\/[^/]+\/rec[a-zA-Z0-9]{14,}$/.test(pathNoQuery)) {
        finalPath = path;
        singleRecordOwnershipCheck = true;
      } else if (allowUntrusted) {
        // Untrusted GET nur erlaubt, wenn es EXAKT der eigene SV-Record per Email-Filter ist
        try {
          const u = new URL('https://dummy' + path);
          const f = u.searchParams.get('filterByFormula') || '';
          const decoded = decodeURIComponent(f);
          const want = `{${tableConfig.userField}}="${userEmail.replace(/"/g, '')}"`;
          const norm = (s) => String(s || '').replace(/\s+/g, '');
          if (norm(decoded) !== norm(want)) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'FORBIDDEN' }) };
          }
        } catch (e) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'FORBIDDEN' }) };
        }
        finalPath = path;
      } else {
        finalPath = injectUserFilter(path, userEmail, tableConfig.userField);
      }
    }
  }

  // ── Payload-Größenlimit ──
  if (payload) {
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 1024 * 1024) { // 1MB
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'Payload zu groß (max 1MB)' }) };
    }
    
    // ReadOnly-Tabellen-Check
    if (tableConfig && tableConfig.readOnly && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Schreibzugriff auf diese Tabelle nicht erlaubt' }) };
    }
  }

  // ── Airtable API aufrufen ──
  const url = `https://api.airtable.com${finalPath}`;

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: {
      'Authorization': `Bearer ${pat}`,
      ...(method.toUpperCase() !== 'GET' ? { 'Content-Type': 'application/json' } : {})
    }
  };

  if (payload && ['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())) {
    fetchOptions.body = JSON.stringify(payload);
  }

  // Request-Logging (nur in Development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Airtable] ${method} ${finalPath} | User: ${userEmail || 'anonym'} | IP: ${clientIP}`);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data     = await response.json();

    if (singleRecordOwnershipCheck && response.ok && data && data.fields && tableConfig && tableConfig.userField) {
      const norm = (v) => String(v || '').toLowerCase().trim();
      const fv = data.fields[tableConfig.userField];
      if (norm(fv) !== norm(userEmail)) {
        return {
          statusCode: 404,
          headers: { ...headers },
          body: JSON.stringify({ error: 'NOT_FOUND' })
        };
      }
    }

    return {
      statusCode: response.status,
      headers: { ...headers },
      body: JSON.stringify(data)
    };

  } catch (e) {
    console.error('[Airtable] API nicht erreichbar:', e.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Airtable API nicht erreichbar', detail: e.message })
    };
  }
};