/* ════════════════════════════════════════════════════════════════════
   PROVA — auftrags-schema.js (ESM)
   Sprint 06b Foundation — Conditional-Definition fuer Auftrags-Wizard

   ARCHITEKTUR-PRINZIP (Marcel-Direktive nach K-UI/X2-Korr):
     Stammdaten ≠ Vorgangsdaten.
     - Stammdaten leben im Adressbuch (kontakte-Tabelle).
       Beispiel: "Allianz Versicherung AG" ist EIN kontakte-Eintrag.
     - Vorgangsdaten leben am Auftrag (auftraege-Tabelle).
       Beispiel: jeder Auftrag der Allianz hat eine ANDERE
       Schadennummer + Versicherungsschein-Nr.

   Phase 1 ist deshalb in 1A/1B getrennt:
     1A — Auftraggeber waehlen (Kontakte-Picker oder neuer Kontakt
          mit reinen Stammdaten).
     1B — Vorgangsdaten erfassen (Schadennummer, Az, etc. — typ-
          spezifisch).

   USAGE:
     import {
         AUFTRAGGEBER_TYPEN,
         SCHADENSARTEN,
         getRequiredFields,
         getOptionalFields,
         validateAuftragsPayload
     } from '/lib/auftrags-schema.js';

   Pure JS — keine UI-Abhaengigkeiten, keine Supabase-Calls. Testbar
   ohne Browser, koennte in Edge Functions oder Tests wiederverwendet
   werden.

   QUELLE Felder:
     docs/workflow-research/PHASEN-FELDER.json (von Marcel + Claude
     erforscht). Diese JS-Datei ist die *normalisierte* Variante mit
     der Stammdaten/Vorgangsdaten-Trennung aus Marcels Korrektur.
═══════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════
// AUFTRAGGEBER-TYPEN
// ═══════════════════════════════════════════════════════════════════

/**
 * @typedef {('privatperson'|'versicherung'|'anwalt'|'gericht'|'behoerde'|'firma')} AuftraggeberTyp
 */

/**
 * Pro Auftraggeber-Typ:
 *   label              — UI-Label fuer Picker
 *   stammdaten_pflicht — Felder die im Adressbuch (kontakte) Pflicht sind
 *   stammdaten_opt     — optionale Felder im Adressbuch
 *   vorgangs_pflicht   — Felder die am AUFTRAG Pflicht sind (Phase 1B)
 *   vorgangs_opt       — optionale Vorgangsfelder
 *   beteiligte_pflicht — kontakt_picker-Felder fuer Phase 2
 *
 * @type {Record<AuftraggeberTyp, {
 *   label: string,
 *   stammdaten_pflicht: string[],
 *   stammdaten_opt: string[],
 *   vorgangs_pflicht: string[],
 *   vorgangs_opt: string[],
 *   beteiligte_pflicht: string[]
 * }>}
 */
export const AUFTRAGGEBER_TYPEN = {
    privatperson: {
        label: 'Privatperson',
        stammdaten_pflicht: ['vorname', 'nachname', 'adresse_strasse', 'adresse_nr', 'plz', 'ort'],
        stammdaten_opt:     ['anrede', 'titel', 'email', 'telefon', 'mobil'],
        vorgangs_pflicht:   [],   // Privatperson hat keine vorgangsspezifischen Pflichtfelder
        vorgangs_opt:       ['privat_az'],  // optionales eigenes Aktenzeichen
        beteiligte_pflicht: []
    },

    versicherung: {
        label: 'Versicherung',
        stammdaten_pflicht: ['firma', 'ansprechpartner', 'adresse_strasse', 'adresse_nr', 'plz', 'ort', 'email'],
        stammdaten_opt:     ['abteilung', 'telefon'],
        // VORGANGSDATEN: pro Auftrag andere Werte (nicht im Kontakt!)
        vorgangs_pflicht:   ['schadennummer', 'versicherungsnummer'],
        vorgangs_opt:       ['versicherungsart', 'selbstbeteiligung_eur'],
        // Versicherungsnehmer ist meist abweichend vom Versicherer
        beteiligte_pflicht: ['versicherungsnehmer']
    },

    anwalt: {
        label: 'Anwalt / Kanzlei',
        // Marcel-Korrektur: kanzlei ≡ firma fuer Anwaelte (Label-Switch im UI)
        // Daten gehen in kontakte.firma-Spalte
        stammdaten_pflicht: ['firma', 'ansprechpartner', 'adresse_strasse', 'adresse_nr', 'plz', 'ort', 'email'],
        stammdaten_opt:     ['anrede', 'titel', 'telefon'],
        vorgangs_pflicht:   ['anwalt_az'],
        vorgangs_opt:       ['mandant_seite'],   // 'klaeger' | 'beklagter' | 'sonstiges'
        beteiligte_pflicht: ['mandant']
    },

    gericht: {
        label: 'Gericht',
        stammdaten_pflicht: ['firma', 'spruchkoerper', 'adresse_strasse', 'adresse_nr', 'plz', 'ort'],
        stammdaten_opt:     ['ansprechpartner', 'telefon', 'email'],
        // §407a ZPO Pflicht — alle drei sind kritisch
        vorgangs_pflicht:   ['gericht_az', 'beweisbeschluss_datum', 'beweisfragen', 'frist_gutachten'],
        vorgangs_opt:       ['kostenvorschuss_eur'],
        beteiligte_pflicht: ['klaeger', 'beklagter']
    },

    behoerde: {
        label: 'Behörde',
        stammdaten_pflicht: ['firma', 'ansprechpartner', 'adresse_strasse', 'adresse_nr', 'plz', 'ort'],
        stammdaten_opt:     ['abteilung', 'telefon', 'email'],
        vorgangs_pflicht:   ['behoerden_az'],
        vorgangs_opt:       ['rechtsgrundlage'],
        beteiligte_pflicht: []
    },

    firma: {
        label: 'Firma / Bauunternehmen',
        stammdaten_pflicht: ['firma', 'ansprechpartner', 'adresse_strasse', 'adresse_nr', 'plz', 'ort', 'email'],
        stammdaten_opt:     ['abteilung', 'telefon', 'ust_id'],
        vorgangs_pflicht:   [],
        vorgangs_opt:       ['firma_az', 'projekt_nr'],
        beteiligte_pflicht: []
    }
};

// ═══════════════════════════════════════════════════════════════════
// SCHADENSARTEN
// ═══════════════════════════════════════════════════════════════════

/**
 * @typedef {('wasser'|'brand'|'baumangel'|'schimmel'|'elementar'|'setzung'|'kombiniert')} Schadensart
 */

/**
 * Pro Schadensart:
 *   label              — UI-Label
 *   zusatz_felder      — Phase 2 (Objekt) zusaetzliche Pflichtfelder
 *   ortstermin_pflicht — Phase 3 (Befund) zusaetzliche Pflicht
 *   relevante_normen   — Hinweis fuer SV (PROVA-Vorschlaege im UI)
 *
 * @type {Record<Schadensart, {
 *   label: string,
 *   zusatz_felder: string[],
 *   ortstermin_pflicht: string[],
 *   relevante_normen: string[]
 * }>}
 */
export const SCHADENSARTEN = {
    wasser: {
        label: 'Wasserschaden',
        zusatz_felder: ['wasser_eintrittspunkt', 'wasser_dauer'],
        ortstermin_pflicht: ['feuchte_messwerte', 'wetterbedingungen'],
        relevante_normen: ['DIN EN ISO 12572', 'WTA 6-1', 'DIN 4108-3']
    },

    brand: {
        label: 'Brandschaden',
        zusatz_felder: ['brand_ursprungspunkt', 'brand_loesch_methode'],
        ortstermin_pflicht: ['russprobe_entnahme'],
        relevante_normen: ['VdS 2357', 'DIN 18230', 'BAuA TRGS 524']
    },

    baumangel: {
        label: 'Baumängel',
        // §634 BGB / VOB/B — Vertragsart + Abnahme entscheidet Verjaehrung
        zusatz_felder: ['vertragsart', 'abnahme_datum'],
        ortstermin_pflicht: [],
        relevante_normen: ['DIN 18202', 'VOB/C ATV', 'BGB §§634-639']
    },

    schimmel: {
        label: 'Schimmelschaden',
        zusatz_felder: ['schimmel_befallene_flaeche_qm', 'schimmel_lokalisation'],
        ortstermin_pflicht: ['feuchte_messwerte', 'probennahme'],
        relevante_normen: ['UBA-Schimmelleitfaden 2017', 'WTA 6-3', 'DIN 4108-2']
    },

    elementar: {
        label: 'Elementar-/Sturmschaden',
        zusatz_felder: ['elementar_ereignis_typ', 'elementar_ereignis_datum'],
        ortstermin_pflicht: ['wetterbedingungen'],
        relevante_normen: ['DIN EN 1991-1-4', 'DWD-Wetterstation-Bezug']
    },

    setzung: {
        label: 'Setzungs-/Rissschaden',
        zusatz_felder: ['setzung_riss_typ'],
        ortstermin_pflicht: ['riss_messungen'],
        relevante_normen: ['DIN 4123', 'DIN EN 1997-1', 'WTA 4-5']
    },

    kombiniert: {
        label: 'Kombiniert (mehrere)',
        // Bei kombinierten Schaeden alle relevanten Sub-Schadensarten erfassen
        zusatz_felder: ['kombiniert_arten'],
        ortstermin_pflicht: [],
        relevante_normen: []
    }
};

// ═══════════════════════════════════════════════════════════════════
// FELDER-METADATA (Labels, Types, Validation, Help)
// ═══════════════════════════════════════════════════════════════════

/**
 * Zentrale Field-Definitions. UI rendert basierend hierauf, Validation
 * nutzt 'validate' (RegExp oder Funktion).
 *
 * @type {Record<string, {
 *   label: string,
 *   type: ('text'|'tel'|'email'|'date'|'time'|'number'|'select'|'textarea'|'kontakt_picker'|'multi'),
 *   placeholder?: string,
 *   help?: string,
 *   options?: ({value: string, label: string}|string)[],
 *   validate?: RegExp | ((v: string) => string | null)
 * }>}
 */
export const FELDER = {
    // ─── Stammdaten (Phase 1A) ──────────────────────────────
    anrede:           { label: 'Anrede', type: 'select', options: ['Herr','Frau','Familie','Divers'] },
    titel:            { label: 'Titel', type: 'text', placeholder: 'Dr.' },
    vorname:          { label: 'Vorname', type: 'text' },
    nachname:         { label: 'Nachname', type: 'text' },
    firma:            { label: 'Firma / Institution', type: 'text' },
    spruchkoerper:    { label: 'Spruchkörper', type: 'text', placeholder: 'z.B. 12. Zivilkammer' },
    abteilung:        { label: 'Abteilung', type: 'text', placeholder: 'z.B. Schadenregulierung' },
    ansprechpartner:  { label: 'Ansprechpartner', type: 'text' },
    adresse_strasse:  { label: 'Straße', type: 'text' },
    adresse_nr:       { label: 'Nr.', type: 'text' },
    plz:              { label: 'PLZ', type: 'text', validate: /^\d{5}$/ },
    ort:              { label: 'Ort', type: 'text' },
    email:            { label: 'E-Mail', type: 'email' },
    telefon:          { label: 'Telefon', type: 'tel' },
    mobil:            { label: 'Mobil', type: 'tel' },
    ust_id:           { label: 'USt-IdNr.', type: 'text', placeholder: 'DE123456789' },

    // ─── Vorgangsdaten (Phase 1B) ───────────────────────────
    schadennummer:        { label: 'Schadennummer', type: 'text', help: 'Wird vom Versicherer pro Schaden vergeben' },
    versicherungsnummer:  { label: 'Versicherungsschein-Nr.', type: 'text' },
    versicherungsart:     { label: 'Versicherungsart', type: 'select',
                            options: ['Wohngebäude','Hausrat','Haftpflicht','Elementar','Bauleistung','Sonstiges'] },
    selbstbeteiligung_eur:{ label: 'Selbstbeteiligung (EUR)', type: 'number' },
    anwalt_az:            { label: 'Aktenzeichen Anwalt', type: 'text' },
    mandant_seite:        { label: 'Mandant-Seite', type: 'select',
                            options: [{value:'klaeger',label:'Kläger'},
                                      {value:'beklagter',label:'Beklagter'},
                                      {value:'sonstiges',label:'Sonstiges'}] },
    gericht_az:           { label: 'Geschäftszeichen Gericht', type: 'text', placeholder: 'z.B. 12 O 234/26' },
    beweisbeschluss_datum:{ label: 'Beweisbeschluss-Datum', type: 'date' },
    beweisfragen:         { label: 'Beweisfragen (Wortlaut)', type: 'textarea',
                            help: 'Wortlaut aus dem Beweisbeschluss — wird in Pflichthinweis-PDF zitiert (§407a ZPO)' },
    frist_gutachten:      { label: 'Frist zur Gutachten-Erstellung', type: 'date',
                            help: '§ 407a Abs 1 ZPO Pflicht' },
    kostenvorschuss_eur:  { label: 'Kostenvorschuss (EUR)', type: 'number' },
    behoerden_az:         { label: 'Behörden-Aktenzeichen', type: 'text' },
    rechtsgrundlage:      { label: 'Rechtsgrundlage', type: 'text' },
    privat_az:            { label: 'Eigenes Aktenzeichen (optional)', type: 'text' },
    firma_az:             { label: 'Aktenzeichen Firma', type: 'text' },
    projekt_nr:           { label: 'Projekt-Nummer', type: 'text' },

    // ─── Phase 2: Schadens-Objekt + Beteiligte ──────────────
    objekt_adresse_strasse: { label: 'Objekt — Straße + Nr.', type: 'text' },
    objekt_adresse_plz:     { label: 'Objekt — PLZ', type: 'text', validate: /^\d{5}$/ },
    objekt_adresse_ort:     { label: 'Objekt — Ort', type: 'text' },
    objekt_typ:             { label: 'Objekt-Typ', type: 'select',
                              options: ['Einfamilienhaus','Mehrfamilienhaus','Eigentumswohnung',
                                        'Reihenhaus','Doppelhaushälfte','Gewerbeobjekt',
                                        'Bauwerk im Bau','Sonstiges'] },
    baujahr:                { label: 'Baujahr', type: 'number' },
    eigentuemer:            { label: 'Eigentümer (falls abweichend)', type: 'kontakt_picker' },
    versicherungsnehmer:    { label: 'Versicherungsnehmer / Geschädigter', type: 'kontakt_picker' },
    mandant:                { label: 'Mandant des Anwalts', type: 'kontakt_picker' },
    klaeger:                { label: 'Kläger', type: 'kontakt_picker' },
    klaeger_anwalt:         { label: 'Anwalt Kläger', type: 'kontakt_picker' },
    beklagter:              { label: 'Beklagter', type: 'kontakt_picker' },
    beklagter_anwalt:       { label: 'Anwalt Beklagter', type: 'kontakt_picker' },
    schadensart:            { label: 'Schadensart', type: 'select',
                              options: Object.keys(SCHADENSARTEN).map(k =>
                                  ({ value: k, label: SCHADENSARTEN[k].label })) },
    schadens_datum:         { label: 'Schadens-Datum', type: 'date',
                              help: 'Pflicht insb. bei Versicherungs-Schaeden' },

    // ─── Schadensart-spezifische Felder ─────────────────────
    wasser_eintrittspunkt:  { label: 'Wasser-Eintrittspunkt', type: 'text' },
    wasser_dauer:           { label: 'Schadensdauer', type: 'text', placeholder: 'z.B. 3 Tage / unbekannt' },
    brand_ursprungspunkt:   { label: 'Brand-Ursprungspunkt', type: 'text' },
    brand_loesch_methode:   { label: 'Lösch-Methode', type: 'text' },
    vertragsart:            { label: 'Vertragsart', type: 'select', options: ['BGB-Werkvertrag','VOB/B'] },
    abnahme_datum:          { label: 'Abnahme-Datum', type: 'date',
                              help: 'Pflicht bei Baumangel: Verjaehrungs-Berechnung' },
    bauunternehmen:         { label: 'Bauunternehmen (Verursacher)', type: 'kontakt_picker' },
    schimmel_befallene_flaeche_qm: { label: 'Befallene Fläche (m²)', type: 'number' },
    schimmel_lokalisation:  { label: 'Schimmel-Lokalisation', type: 'text' },
    elementar_ereignis_typ: { label: 'Elementar-Ereignis', type: 'select',
                              options: ['Sturm','Hagel','Hochwasser','Schneedruck','Erdrutsch','Sonstiges'] },
    elementar_ereignis_datum:{ label: 'Ereignis-Datum', type: 'date' },
    setzung_riss_typ:       { label: 'Riss-Typ', type: 'select',
                              options: ['Setzungsriss','Spannungsriss','Schwindriss','Strukturschaden'] },
    kombiniert_arten:       { label: 'Sub-Schadensarten', type: 'multi',
                              options: Object.keys(SCHADENSARTEN).filter(k => k !== 'kombiniert')
                                  .map(k => ({ value: k, label: SCHADENSARTEN[k].label })) },

    // ─── Phase 3: Ortstermin (gemeinsam alle Schadensarten) ─
    ortstermin_datum:       { label: 'Ortstermin-Datum', type: 'date' },
    ortstermin_uhrzeit:     { label: 'Ortstermin-Uhrzeit', type: 'time' },
    anwesende:              { label: 'Anwesende Personen', type: 'textarea',
                              help: 'IfS-Leitsatz Pflicht' },
    wetterbedingungen:      { label: 'Wetter-Bedingungen', type: 'text',
                              help: 'Bei Außenschäden Pflicht' },
    feuchte_messwerte:      { label: 'Feuchte-Messwerte', type: 'textarea',
                              help: 'Messpunkte mit Datum + Hilfsmittel + Werten' },
    russprobe_entnahme:     { label: 'Rußprobe entnommen', type: 'select', options: ['Ja','Nein','Nicht möglich'] },
    probennahme:            { label: 'Probennahme (Schimmel/Mikrobiologie)', type: 'select', options: ['Ja','Nein'] },
    riss_messungen:         { label: 'Riss-Messungen', type: 'textarea',
                              help: 'Lokalisation, Breite, Verlauf' },
    schadensbeschreibung:   { label: 'Schadens-Beschreibung', type: 'textarea',
                              help: 'Min. 200 Zeichen' }
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Liefert die Pflichtfelder fuer ein Auftraggeber-Typ + Schadensart
 * Kombination, gegliedert in Phase 1A/1B/2/3.
 *
 * @param {AuftraggeberTyp} auftraggeber_typ
 * @param {Schadensart} [schadensart]
 * @returns {{
 *   phase_1a_stammdaten: string[],
 *   phase_1b_vorgang: string[],
 *   phase_2_objekt: string[],
 *   phase_2_beteiligte: string[],
 *   phase_2_schadensart_zusatz: string[],
 *   phase_3_ortstermin: string[]
 * }}
 */
export function getRequiredFields(auftraggeber_typ, schadensart = null) {
    const at = AUFTRAGGEBER_TYPEN[auftraggeber_typ];
    if (!at) {
        throw new Error(`Unknown auftraggeber_typ: ${auftraggeber_typ}`);
    }

    const phase_1a = [...at.stammdaten_pflicht];
    const phase_1b = [...at.vorgangs_pflicht];

    // Phase 2 Objekt — gemeinsam alle Typen
    const phase_2_objekt = ['objekt_adresse_strasse', 'objekt_adresse_plz', 'objekt_adresse_ort',
                            'objekt_typ', 'schadensart', 'schadens_datum'];

    const phase_2_beteiligte = [...at.beteiligte_pflicht];

    let phase_2_schadensart_zusatz = [];
    let phase_3 = ['ortstermin_datum', 'ortstermin_uhrzeit', 'anwesende', 'schadensbeschreibung'];

    if (schadensart) {
        const sa = SCHADENSARTEN[schadensart];
        if (!sa) {
            throw new Error(`Unknown schadensart: ${schadensart}`);
        }
        phase_2_schadensart_zusatz = [...sa.zusatz_felder];
        phase_3 = [...phase_3, ...sa.ortstermin_pflicht];
        // Bei Baumangel kommt bauunternehmen aus zusatz_felder als kontakt_picker
        if (schadensart === 'baumangel') {
            phase_2_beteiligte.push('bauunternehmen');
        }
    }

    return {
        phase_1a_stammdaten: phase_1a,
        phase_1b_vorgang: phase_1b,
        phase_2_objekt,
        phase_2_beteiligte,
        phase_2_schadensart_zusatz,
        phase_3_ortstermin: phase_3
    };
}

/**
 * Wie getRequiredFields, aber nur die optionalen Felder.
 *
 * @param {AuftraggeberTyp} auftraggeber_typ
 * @param {Schadensart} [schadensart]
 * @returns {{
 *   phase_1a_stammdaten_opt: string[],
 *   phase_1b_vorgang_opt: string[],
 *   phase_2_objekt_opt: string[]
 * }}
 */
export function getOptionalFields(auftraggeber_typ, _schadensart = null) {
    const at = AUFTRAGGEBER_TYPEN[auftraggeber_typ];
    if (!at) {
        throw new Error(`Unknown auftraggeber_typ: ${auftraggeber_typ}`);
    }
    return {
        phase_1a_stammdaten_opt: [...at.stammdaten_opt],
        phase_1b_vorgang_opt:    [...at.vorgangs_opt],
        phase_2_objekt_opt:      ['baujahr', 'eigentuemer']
    };
}

/**
 * Validiert ein komplettes Auftrags-Payload gegen die schema-defined
 * Pflichtfelder. Returnt array of errors (leer = valid).
 *
 * Wizard nutzt das pro Phase: validateAuftragsPayload(p, { phaseLimit: '1b' })
 * validiert nur 1A+1B, ignoriert Phase 2/3-Felder die noch nicht
 * gesetzt sind.
 *
 * @param {Record<string, unknown>} payload
 * @param {Object} [opts]
 * @param {('1a'|'1b'|'2'|'3'|'all')} [opts.phaseLimit='all']
 * @returns {{ field: string, phase: string, message: string }[]}
 */
export function validateAuftragsPayload(payload, { phaseLimit = 'all' } = {}) {
    const errors = [];
    const at = payload.auftraggeber_typ;
    if (!at) {
        errors.push({ field: 'auftraggeber_typ', phase: '1a', message: 'Auftraggeber-Typ ist Pflicht' });
        return errors;
    }
    if (!AUFTRAGGEBER_TYPEN[at]) {
        errors.push({ field: 'auftraggeber_typ', phase: '1a', message: `Unbekannter Typ: ${at}` });
        return errors;
    }

    const required = getRequiredFields(at, payload.schadensart);

    const phasesToCheck = {
        '1a':  ['phase_1a_stammdaten'],
        '1b':  ['phase_1a_stammdaten', 'phase_1b_vorgang'],
        '2':   ['phase_1a_stammdaten', 'phase_1b_vorgang', 'phase_2_objekt', 'phase_2_beteiligte', 'phase_2_schadensart_zusatz'],
        '3':   ['phase_1a_stammdaten', 'phase_1b_vorgang', 'phase_2_objekt', 'phase_2_beteiligte', 'phase_2_schadensart_zusatz', 'phase_3_ortstermin'],
        'all': ['phase_1a_stammdaten', 'phase_1b_vorgang', 'phase_2_objekt', 'phase_2_beteiligte', 'phase_2_schadensart_zusatz', 'phase_3_ortstermin']
    }[phaseLimit] ?? [];

    for (const phaseKey of phasesToCheck) {
        for (const fieldId of required[phaseKey]) {
            const value = payload[fieldId];
            if (value == null || (typeof value === 'string' && value.trim() === '')) {
                const meta = FELDER[fieldId];
                errors.push({
                    field: fieldId,
                    phase: phaseKey,
                    message: `${meta?.label ?? fieldId} ist Pflicht`
                });
            } else if (typeof value === 'string' && FELDER[fieldId]?.validate instanceof RegExp) {
                if (!FELDER[fieldId].validate.test(value)) {
                    errors.push({
                        field: fieldId,
                        phase: phaseKey,
                        message: `${FELDER[fieldId].label} hat ungültiges Format`
                    });
                }
            }
        }
    }

    return errors;
}

/**
 * Convenience: liefert Field-Metadata fuer ein konkretes Feld.
 * @param {string} fieldId
 * @returns {object | null}
 */
export function getFieldMeta(fieldId) {
    return FELDER[fieldId] ?? null;
}
