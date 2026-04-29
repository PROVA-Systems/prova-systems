/* ============================================================
   PROVA Edge Functions — PDFMonkey Template-Map (Server-Side)
   Sprint K-1.2.B4 + K-2.0/Block3 (Korrespondenz-Layer)

   Mirror von lib/template-registry.js (Frontend).
   K-1.5 TODO: aus DB-Tabelle dokument_templates lesen statt hardcoded
              (würde Single-Source-of-Truth ermöglichen).

   Marcel-TODO (K-2.0): Templates K-01..K-09 aus
     /docs/templates-goldstandard/07-korrespondenz/
     manuell in PDFMonkey anlegen, UUIDs unter KORRESPONDENZ_TEMPLATES
     eintragen (ersetzt <TODO_PDFMONKEY_UUID_*>).
   ============================================================ */

export const PDFMONKEY_TEMPLATES: Record<string, string> = {
    // Rechnungen
    'rechnung-jveg':           'S32BEA1F',
    'rechnung-standard':       'B1C3E69D',
    'rechnung-stunden':        'B1C3E69D',
    'mahnung-1':               'EA5CAC85',
    'mahnung-2':               'C4BB257B',

    // Bestätigungen
    'auftragsbestaetigung':    '64BFD7F0',
    'termin-bestaetigung':     '8ECAC2E4',
    'anschreiben':             'A4E57F73',

    // Gutachten
    'schadensgutachten':       '6ADE8D9A',
    'beweissicherung':         'BA076019',
    'ergaenzungsgutachten':    '6FF656D3',
    'gegengutachten':          '6B85ECFF',
    'stellungnahme-intern':    '4233F240',
    'kurzstellungnahme':       '4233F240',

    // Beratung + Baubegleitung
    'beratung-protokoll':      '8868A0E2',
    'baubegleitung-bericht':   '3174576E',
    'baubegleitung-eintrag':   '36E140DC',

    // Justiz
    'schiedsgutachten':        'A8D05FAB',
    'gerichtsgutachten':       '6ADE8D9A',

    // Briefe
    'brief-generisch':         '37CF6A57',
    'brief-din5008':           'BAD1170B',
    'bescheinigung-generisch': '4D81616B',

    // Wertgutachten
    'wertgutachten':           '29064D98-FD12-4135-9D44-F49CCF9819C6',

    // Foto-Doku
    'foto-doku':               '0383BD85',

    // Welcome-Mails
    'welcome-solo':            'EC64C790-3E04',
    'welcome-team':            'E865E0CD-535A'
};

export function getTemplateId(key: string): string {
    const id = PDFMONKEY_TEMPLATES[key];
    if (!id) {
        const known = Object.keys(PDFMONKEY_TEMPLATES).sort().join(', ');
        throw new Error(`Unknown PDFMonkey-Template-Key "${key}". Known: ${known}`);
    }
    return id;
}

/* ============================================================
   K-2.0 Block 3 — Korrespondenz-Templates (9 Briefe)

   Whitelist für brief-generate Edge Function.
   Goldstandard-Files: /docs/templates-goldstandard/07-korrespondenz/

   Marcel-TODO: pro Template manuell in PDFMonkey anlegen
   (HTML hochladen, Test-Render mit .payload.json), UUID
   in TODO-Slot ersetzen. Solange UUID = '<TODO_*>': brief-generate
   returns 503 mit Hinweis "Template noch nicht in PDFMonkey angelegt".
   ============================================================ */

export const KORRESPONDENZ_TEMPLATES: Record<string, string> = {
    'auftragsbestaetigung':   '5255119d-583f-4a3f-938e-dee4fcdce895',  // K-01
    'termin-ag':              '7b2ebb1d-55c0-4f02-833d-2abc087d9851',  // K-02
    'termin-mehrparteien':    '972685a4-70ed-46de-927d-810e3bb1c26e',  // K-03
    'anforderung-unterlagen': 'c6fe446e-4694-47e0-aadd-b3a276ec9469',  // K-04 (Goldstandard pending K-2.x)
    'uebergabe-gutachten':    '5c4ee8dc-3f27-4fbc-b016-c606cc8b7d9c',  // K-05 (pending)
    'mahnung-1':              'db80bdb9-f3f2-46cd-b258-7e4742cd9de6', // K-06A (pending)
    'mahnung-2':              '13ec8528-666e-4f0a-aeba-bc9d2fc3d960', // K-06B (pending)
    'mahnung-3':              '34c89070-c1ac-41c7-b670-1f4c33111e47', // K-06C (pending)
    'akteneinsicht':          '06d23ad9-35ef-478b-9501-8c16c23bca08',  // K-07 (pending)
    'befangenheit':           '4faf6204-d3bf-481a-9f5b-43920eab430e',  // K-08 (pending)
    'auftragsablehnung':      '1a58e6fd-47f5-4206-aa0b-7dfd13766f63',  // K-09 (pending)
};

const TODO_UUID_RE = /^<TODO_PDFMONKEY_UUID_/;

/**
 * Whitelist-Check für Korrespondenz-Templates.
 * Returns { ok, templateId, isPending } — isPending=true wenn UUID-Slot noch TODO.
 */
export function getKorrespondenzTemplateId(key: string):
    { ok: true; templateId: string; isPending: boolean } | { ok: false; error: string } {
    if (!Object.prototype.hasOwnProperty.call(KORRESPONDENZ_TEMPLATES, key)) {
        const known = Object.keys(KORRESPONDENZ_TEMPLATES).sort().join(', ');
        return { ok: false, error: `Unknown Korrespondenz-Template-Key "${key}". Known: ${known}` };
    }
    const id = KORRESPONDENZ_TEMPLATES[key];
    return { ok: true, templateId: id, isPending: TODO_UUID_RE.test(id) };
}
