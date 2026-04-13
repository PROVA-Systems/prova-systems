const { getCorsHeaders, corsOptionsResponse } = require('./lib/cors-helper');
// PROVA setup-tabellen.js — Einmalig BRIEFE + TEXTBAUSTEINE_CUSTOM anlegen
// Aufruf: POST /.netlify/functions/setup-tabellen mit Admin-Token
// NUR EINMALIG verwenden, danach deaktivieren

exports.handler = async function(event) {
  const cors = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://prova-systems.de',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Nur Admin + zusätzliches Secret (Einmal-Setup)
  const jwtEmail = event.clientContext && event.clientContext.user && event.clientContext.user.email
    ? String(event.clientContext.user.email).toLowerCase()
    : '';
  const isAdmin = jwtEmail.endsWith('@prova-systems.de') || jwtEmail === 'admin@prova-systems.de';
  if (!isAdmin) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };
  const secret = event.headers['x-prova-setup-secret'] || event.headers['X-PROVA-SETUP-SECRET'];
  if (!process.env.PROVA_SETUP_SECRET || String(secret || '') !== String(process.env.PROVA_SETUP_SECRET)) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'FORBIDDEN' }) };
  }

  const AT_TOKEN = process.env.AIRTABLE_PAT || process.env.AIRTABLE_TOKEN;
  const AT_BASE  = 'appJ7bLlAHZoxENWE';
  const results  = [];

  async function createTable(name, fields) {
    const r = await fetch(`https://api.airtable.com/v0/meta/bases/${AT_BASE}/tables`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + AT_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, fields })
    });
    const data = await r.json();
    return { name, ok: r.ok, id: data.id, error: data.error };
  }

  // BRIEFE Tabelle
  results.push(await createTable('BRIEFE', [
    { name: 'sv_email',          type: 'singleLineText' },
    { name: 'empfaenger_name',   type: 'singleLineText' },
    { name: 'empfaenger_email',  type: 'email'          },
    { name: 'betreff',           type: 'singleLineText' },
    { name: 'inhalt',            type: 'multilineText'  },
    { name: 'aktenzeichen',      type: 'singleLineText' },
    { name: 'brief_typ',         type: 'singleSelect',
      options: { choices: [
        {name:'Gericht'},{name:'Versicherung'},{name:'Privat'},{name:'Mahnung'},{name:'Allgemein'}
      ]}},
    { name: 'status',            type: 'singleSelect',
      options: { choices: [
        {name:'Gesendet',color:'greenBright'},{name:'Fehler',color:'redBright'},{name:'Entwurf',color:'yellowBright'}
      ]}},
    { name: 'gesendet_am',       type: 'dateTime',
      options: { dateFormat:{name:'iso'}, timeFormat:{name:'24hour'}, timeZone:'Europe/Berlin' }}
  ]));

  // TEXTBAUSTEINE_CUSTOM Tabelle
  results.push(await createTable('TEXTBAUSTEINE_CUSTOM', [
    { name: 'sv_email',    type: 'singleLineText' },
    { name: 'titel',       type: 'singleLineText' },
    { name: 'text',        type: 'multilineText'  },
    { name: 'kategorie',   type: 'singleSelect',
      options: { choices: [
        {name:'Allgemein'},{name:'Vorbemerkung'},{name:'Befund'},
        {name:'Ursache'},{name:'Sanierung'},{name:'§407a ZPO'}
      ]}},
    { name: 'schadenart',  type: 'singleSelect',
      options: { choices: [
        {name:'Alle'},{name:'Wasserschaden'},{name:'Schimmel/Feuchte'},
        {name:'Brandschaden'},{name:'Sturmschaden'},{name:'Elementarschaden'},{name:'Baumängel'}
      ]}},
    { name: 'notiz',       type: 'singleLineText' },
    { name: 'erstellt_am', type: 'dateTime',
      options: { dateFormat:{name:'iso'}, timeFormat:{name:'24hour'}, timeZone:'Europe/Berlin' }}
  ]));

  return { statusCode: 200, headers: cors, body: JSON.stringify({ results }) };
};
