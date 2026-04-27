/* ============================================================
   PROVA Systems — Template-Registry (ESM)
   Sprint K-1.0 Block 5

   Single Source of Truth für PDFMonkey-Template-IDs.
   Bisher: 22+ IDs verstreut in 15+ Files.
   Neu:    zentrale Map hier, getTemplateId(key) als Lookup.

   In K-1.4 werden alle alten Hardcoded-IDs durch Registry-Lookups ersetzt.
   In K-1.2 nutzt Edge Function `pdf-generate` diese Registry serverseitig
   (per Re-Export oder ENV-Mirror).
   ============================================================ */

export const PDFMONKEY_TEMPLATES = Object.freeze({
    // ─── Rechnungen ──────────────────────────────────────────
    'rechnung-jveg':           'S32BEA1F',
    'rechnung-standard':       'B1C3E69D',
    'rechnung-stunden':        'B1C3E69D',  // identisch zu standard, anderer Inhalts-Block
    'mahnung-1':               'EA5CAC85',
    'mahnung-2':               'C4BB257B',

    // ─── Bestätigungen ───────────────────────────────────────
    'auftragsbestaetigung':    '64BFD7F0',
    'termin-bestaetigung':     '8ECAC2E4',
    'anschreiben':             'A4E57F73',

    // ─── Gutachten (Flow A: Schaden/Mangel) ──────────────────
    'schadensgutachten':       '6ADE8D9A',
    'beweissicherung':         'BA076019',
    'ergaenzungsgutachten':    '6FF656D3',
    'gegengutachten':          '6B85ECFF',
    'stellungnahme-intern':    '4233F240',
    'kurzstellungnahme':       '4233F240',  // F-04, identisch zu stellungnahme

    // ─── Beratung (Flow C) + Baubegleitung (Flow D) ─────────
    'beratung-protokoll':      '8868A0E2',
    'baubegleitung-bericht':   '3174576E',
    'baubegleitung-eintrag':   '36E140DC',

    // ─── Justiz/Schiedsgutachten ─────────────────────────────
    'schiedsgutachten':        'A8D05FAB',
    'gerichtsgutachten':       '6ADE8D9A',  // nutzt Schadensgutachten-Layout

    // ─── Generische Briefe ───────────────────────────────────
    'brief-generisch':         '37CF6A57',
    'brief-din5008':           'BAD1170B',
    'bescheinigung-generisch': '4D81616B',

    // ─── Wertgutachten (Flow B) ──────────────────────────────
    'wertgutachten':           '29064D98-FD12-4135-9D44-F49CCF9819C6',

    // ─── Foto-Doku ───────────────────────────────────────────
    'foto-doku':               '0383BD85',

    // ─── Welcome-Mails (von Edge Function user-lifecycle in K-1.2) ───
    'welcome-solo':            'EC64C790-3E04',
    'welcome-team':            'E865E0CD-535A'
});

/**
 * @param {string} key — z.B. 'rechnung-standard', 'schadensgutachten'
 * @returns {string} PDFMonkey-Template-ID
 * @throws Error wenn Key unbekannt
 */
export function getTemplateId(key) {
    const id = PDFMONKEY_TEMPLATES[key];
    if (!id) {
        const known = Object.keys(PDFMONKEY_TEMPLATES).sort().join(', ');
        throw new Error(
            `PROVA: Unbekannter PDFMonkey-Template-Key "${key}". `
            + `Bekannte Keys: ${known}`
        );
    }
    return id;
}

/**
 * Mapping von auftrag_typ ENUM auf den Standard-Template-Key für Gutachten.
 * Verwendet im Default-Generator-Flow (kann pro Auftrag überschrieben werden).
 *
 * @param {string} typ — auftrag_typ ENUM (schaden, beweis, ergaenzung, gegen,
 *                       kurzstellungnahme, wertgutachten, beratung, baubegleitung,
 *                       schied, gericht)
 * @returns {string} PDFMonkey-Template-ID
 */
export function getTemplateForAuftragstyp(typ) {
    const mapping = {
        'schaden':           'schadensgutachten',
        'beweis':            'beweissicherung',
        'ergaenzung':        'ergaenzungsgutachten',
        'gegen':             'gegengutachten',
        'kurzstellungnahme': 'kurzstellungnahme',
        'wertgutachten':     'wertgutachten',
        'beratung':          'beratung-protokoll',
        'baubegleitung':     'baubegleitung-bericht',
        'schied':            'schiedsgutachten',
        'gericht':           'gerichtsgutachten'
    };
    const key = mapping[typ];
    if (!key) {
        throw new Error(
            `PROVA: Kein Standard-Template fuer Auftragstyp "${typ}". `
            + `Erlaubt: ${Object.keys(mapping).join(', ')}`
        );
    }
    return getTemplateId(key);
}

/**
 * Mapping von dokument_typ ENUM auf den Standard-Template-Key.
 * Wird in Edge Function pdf-generate (K-1.2) verwendet.
 */
export function getTemplateForDokumentTyp(typ) {
    const mapping = {
        'gutachten_pdf':           'schadensgutachten',
        'kurzstellungnahme_pdf':   'kurzstellungnahme',
        'wertgutachten_pdf':       'wertgutachten',
        'beweissicherung_pdf':     'beweissicherung',
        'gerichtsgutachten_pdf':   'gerichtsgutachten',
        'schiedsgutachten_pdf':    'schiedsgutachten',
        'beratung_protokoll':      'beratung-protokoll',
        'baubegleitung_bericht':   'baubegleitung-bericht',
        'rechnung':                'rechnung-standard',
        'rechnung_jveg':           'rechnung-jveg',
        'rechnung_stunden':        'rechnung-stunden',
        'mahnung_1':               'mahnung-1',
        'mahnung_2':               'mahnung-2',
        'brief':                   'brief-din5008',
        'auftragsbestaetigung':    'auftragsbestaetigung',
        'termin_bestaetigung':     'termin-bestaetigung',
        'bescheinigung':           'bescheinigung-generisch',
        'foto_doku':               'foto-doku'
    };
    const key = mapping[typ];
    if (!key) return null;  // nicht alle dokument_typ haben Templates (z.B. raw uploads)
    return getTemplateId(key);
}

// Browser-Console-Debug
if (typeof window !== 'undefined') {
    window.PROVA_DEBUG = window.PROVA_DEBUG || {};
    window.PROVA_DEBUG.templates = PDFMONKEY_TEMPLATES;
}
