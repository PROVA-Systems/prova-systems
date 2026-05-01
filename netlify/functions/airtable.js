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
  // Fälle: User-Filter wird automatisch angehängt
  tblSxV8bsXwd1pwa0: { name: 'FAELLE',      userField: 'sv_email', readOnly: false },
  // SV-Profil: nur eigenes Profil
  tbladqEQT3tmx4DIB: { name: 'SV',          userField: 'Email',    readOnly: false },
  // Termine: User-Filter
  tblyMTTdtfGQjjmc2: { name: 'TERMINE',     userField: 'sv_email', readOnly: false },
  // Rechnungen: User-Filter
  tblF6MS7uiFAJDjiT: { name: 'RECHNUNGEN',  userField: 'sv_email', readOnly: false },
  // Kontakte: Adressbuch Auftraggeber/Geschädigte — DSGVO-Multi-Tenant
  tblMKmPLjRelr6Hal: { name: 'KONTAKTE',    userField: 'sv_email', readOnly: false },
  // KI-Statistik: schreiben OK, lesen eingeschränkt
  tblv9F8LEnUC3mKru: { name: 'KI_STATISTIK', userField: null,      readOnly: false },
  // KI-Lernpool: nur schreiben
  tbl4LEsMvcDKFCYaF: { name: 'KI_LERNPOOL', userField: null,       readOnly: false },

  // ── Sprint IMPORT-FIX: Whitelist um 12 Tabellen erweitert (23.04.2026) ──
  // Briefe: Archiv aller versendeten Briefe (inkl. PDF-URL, Inhalt)
  tblSzxvnkRE6B0thx: { name: 'BRIEFE',             userField: 'sv_email', readOnly: false },
  // Textbausteine-Custom: SV-eigene Bausteine inkl. Floskeln (kategorie="Floskel")
  tblDS8NQxzceGedJO: { name: 'TEXTBAUSTEINE_CUSTOM', userField: 'sv_email', readOnly: false },
  // Textbausteine: Standard-Bausteine mit sv_email-Feld (für gefilterte Auswahl)
  tbljPQrdMDsqUzieD: { name: 'TEXTBAUSTEINE',      userField: 'sv_email', readOnly: false },
  // Diktate: Sprint S6 — Original-Diktat + Korrekturen pro Fall
  tblTcapjDGDI2f58h: { name: 'DIKTATE',            userField: 'sv_email', readOnly: false },
  // Normen: globaler DIN/WTA/VOB-Katalog, Read-only für alle Nutzer
  tblnceVJIW7BjHsPF: { name: 'NORMEN',             userField: null,       readOnly: true  },
  // Audit-Trail: KI-Nutzung, §6-Validierungen, Haftungs-Nachweise
  tblqQmMwJKxltXXXl: { name: 'AUDIT_TRAIL',        userField: 'sv_email', readOnly: false },
  // Statistiken: aggregierte KPIs ohne Personenbezug
  tblb0j9qOhMExVEFH: { name: 'STATISTIKEN',        userField: null,       readOnly: false },
  // Push-Subscriptions: Web-Push-Endpoints pro User (userField 'Email' wie SV-Tabelle)
  tblAiF38HeS1R1Umj: { name: 'PUSH_SUBSCRIPTIONS', userField: 'Email',    readOnly: false },
  // Einwilligungen: DSGVO-Audit-Log (AVV-Signatur, Onboarding-Checkboxen)
  tblwgUQgtBWckPMHp: { name: 'EINWILLIGUNGEN',     userField: 'sv_email', readOnly: false },
  // Rechtsdokumente: Versionen AGB/Datenschutz/AVV, Read-only
  tbljJkS3HOvtmpAGT: { name: 'RECHTSDOKUMENTE',    userField: null,       readOnly: true  },
  // Workflow-Errors: zentrales Error-Log für Netlify-Functions (Admin-Dashboard)
  tblgECx0eyrpQTN8e: { name: 'WORKFLOW_ERRORS',    userField: null,       readOnly: false },

  // HINWEIS: PASSWORD_RESET_TOKENS (tblaboaRkJjrX3Z4J) und LOGIN_ATTEMPTS
  // (tbli4t2WDLeBfuBB2) gehören NICHT in diese Whitelist — sie sind
  // Backend-exklusiv und werden nur von dedizierten Functions (login.js,
  // password-reset-request.js) direkt mit process.env.AIRTABLE_PAT angesprochen.
  // Siehe AKTUELLE-ABWEICHUNGEN.md § 2 "Security-Prinzip".
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

// S-SICHER P4B.7: STRICT-Modus — User-Resolution ueber lib/auth-resolve.
// Kein body._userEmail-Pfad mehr, kein Identity-clientContext-Pfad mehr.
// HMAC-Token ist PFLICHT. Cross-Check + Logging in der Lib.
const { resolveUser, logAuthFailure } = require('./lib/auth-resolve');

// Legacy-Wrapper — bleibt fuer Code-Stellen die nur die E-Mail brauchen.
// Phase 2 Cutover Block 3: resolveUser ist jetzt async (Supabase-JWT-Verify).
async function getUserEmailFromEvent(event) {
  const u = await resolveUser(event);
  return u.email;
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
    // ── Sprint IMPORT-FIX: neue Tabellen-Aliase (23.04.2026) ──
    BRIEFE:              'tblSzxvnkRE6B0thx',
    TEXTBAUSTEINE_CUSTOM:'tblDS8NQxzceGedJO',
    TEXTBAUSTEINE:       'tbljPQrdMDsqUzieD',
    DIKTATE:             'tblTcapjDGDI2f58h',
    NORMEN:              'tblnceVJIW7BjHsPF',
    AUDIT_TRAIL:         'tblqQmMwJKxltXXXl',
    STATISTIKEN:         'tblb0j9qOhMExVEFH',
    PUSH_SUBSCRIPTIONS:  'tblAiF38HeS1R1Umj',
    EINWILLIGUNGEN:      'tblwgUQgtBWckPMHp',
    RECHTSDOKUMENTE:     'tbljJkS3HOvtmpAGT',
    WORKFLOW_ERRORS:     'tblgECx0eyrpQTN8e',
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

  const { method = 'GET', path, payload } = resolvedBody;

  // ── Pfad-Validierung ──
  if (!path || !path.startsWith('/v0/')) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Ungültiger API-Pfad' }) };
  }

  // ── Method-Whitelist ──
  const allowedMethods = ['GET', 'POST', 'PATCH', 'DELETE'];
  if (!allowedMethods.includes(method.toUpperCase())) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'HTTP-Methode nicht erlaubt' }) };
  }

  // ── User-Resolution STRICT-Modus (P4B.7) ──
  // HMAC-Token ODER Supabase-JWT akzeptiert (Cutover Block 3 Phase 2,
  // 01.05.2026). Mismatch -> 403, fehlend/invalid -> 401.
  // Audit-Logging passiert in der Lib (logAuthFailure mit pseudonymisierten
  // Email-Feldern, P4B.1d).
  const userInfo = await resolveUser(event);
  if (userInfo.mismatch) {
    logAuthFailure('Auth-Mismatch', event, userInfo.mismatch);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Auth-Mismatch: Token-Subject und Request-Identität stimmen nicht überein' })
    };
  }
  if (!userInfo.email) {
    logAuthFailure('Auth-Required', event, { function: 'airtable' });
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentifizierung erforderlich' })
    };
  }
  const userEmail = userInfo.email;
  const adminUser = isAdmin(userEmail);

  // ── Tabellen-Whitelist ──
  const tableId = getTableIdFromPath(path);
  const tableConfig = tableId ? ALLOWED_TABLES[tableId] : null;

  if (tableId && !tableConfig && !adminUser) {
    console.warn(`[Airtable] Tabelle nicht in Whitelist: ${tableId}`);
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Tabellenzugriff nicht erlaubt' }) };
  }

  // ── User-Filter für GET-Anfragen (Datentrennung!) ──
  let finalPath = path;
  if (method.toUpperCase() === 'GET' && tableConfig && tableConfig.userField && !adminUser) {
    finalPath = injectUserFilter(path, userEmail, tableConfig.userField);
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

    return {
      statusCode: response.status,
      headers: { ...headers },
      body: JSON.stringify(data)
    };

  } catch (e) {
    // S-SICHER P2.2 (Finding 8.1): e.message nicht mehr in Client-Response.
    // Server-Logging bleibt fuer Netlify-Dashboard, Client bekommt nur
    // generische Meldung.
    console.error('[Airtable] API nicht erreichbar:', e.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Airtable API nicht erreichbar' })
    };
  }
};