/* ============================================================
   PROVA Edge Functions — PDFMonkey Template-Map (Server-Side)
   Sprint K-1.2.B4

   Mirror von lib/template-registry.js (Frontend).
   K-1.5 TODO: aus DB-Tabelle dokument_templates lesen statt hardcoded
              (würde Single-Source-of-Truth ermöglichen).
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
