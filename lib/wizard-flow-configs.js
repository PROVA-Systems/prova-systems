/**
 * PROVA Wizard-Flow-Configs (MEGA⁴² P2)
 *
 * Standardisierte Stepper-Konfigurationen für alle 4 Workflows (A/B/C/D).
 * Wird vom existing prova-wizard.js + lib/wizard-stepper.js gemeinsam genutzt
 * um konsistente Step-Definitionen und Validation-Regeln zu liefern.
 *
 * Public API (window.ProvaWizardFlowConfigs):
 *   getFlow(flowKey) → { key, label, steps:[{key,label,fields,validate}], skipPhases }
 *   listFlows() → ['A','B','C','D']
 *   describeFlow(flowKey) → string (für UI-Tooltips)
 *
 * Source-of-Truth für:
 *   - prova-wizard.js Header-Stepper (live)
 *   - lib/wizard-stepper.js (neue Pages oder Refactor)
 *   - tests/wizard-stepper/*.test.js (Validation-Coverage)
 */
'use strict';

(function () {
  const FLOWS = {
    A: {
      key: 'A',
      label: 'Schaden & Mangel',
      description: 'Ursachen-Analyse + Sanierungsvorschlag (§1-§6 Voll-Struktur).',
      auftragstypen: [
        'gerichtsgutachten', 'versicherungsgutachten', 'privatgutachten',
        'schiedsgutachten', 'beweissicherung', 'ergaenzungsgutachten', 'gegengutachten'
      ],
      steps: [
        {
          key: 'auftragstyp',
          label: 'Auftragstyp',
          fields: ['auftrag_typ'],
          validate: function (state) {
            if (!state || !state.auftrag_typ) return { valid: false, errors: [{ field: 'auftrag_typ', msg: 'Auftragstyp wählen' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'wo_was',
          label: 'Wo & Was',
          fields: ['adresse', 'plz', 'ort', 'gebaeudeart'],
          validate: function (state) {
            if (!state.adresse) return { valid: false, errors: [{ field: 'adresse', msg: 'Schadenadresse fehlt' }] };
            if (!state.plz) return { valid: false, errors: [{ field: 'plz', msg: 'PLZ fehlt' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'auftraggeber',
          label: 'Auftraggeber',
          fields: ['auftraggeber_name', 'auftraggeber_email'],
          validate: function (state) {
            if (!state.auftraggeber_name) return { valid: false, errors: [{ field: 'auftraggeber_name', msg: 'Name fehlt' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'rahmen',
          label: 'Rahmen',
          fields: ['rechtsgrundlage', 'beweisbeschluss', 'frist'],
          validate: function () { return { valid: true, errors: [] }; }
        }
      ],
      skipPhases: function (auftrag_typ) {
        if (auftrag_typ === 'beweissicherung') return [5, 6];
        if (auftrag_typ === 'ergaenzungsgutachten') return [1, 2, 3];
        if (auftrag_typ === 'gegengutachten') return [1];
        return [];
      }
    },
    B: {
      key: 'B',
      label: 'Wertgutachten',
      description: 'ImmoWertV-konformes Wertgutachten (Verkehrswert, Marktwert).',
      auftragstypen: ['wertgutachten', 'kurzwert', 'verkehrswert'],
      steps: [
        {
          key: 'auftragstyp',
          label: 'Wertgutachten-Typ',
          fields: ['auftrag_typ'],
          validate: function (state) {
            if (!state.auftrag_typ) return { valid: false, errors: [{ field: 'auftrag_typ', msg: 'Typ wählen' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'objekt',
          label: 'Objektdaten',
          fields: ['adresse', 'plz', 'ort', 'wohnflaeche', 'baujahr'],
          validate: function (state) {
            if (!state.adresse) return { valid: false, errors: [{ field: 'adresse', msg: 'Adresse fehlt' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'auftraggeber',
          label: 'Auftraggeber',
          fields: ['auftraggeber_name', 'zweck'],
          validate: function (state) {
            if (!state.auftraggeber_name) return { valid: false, errors: [{ field: 'auftraggeber_name', msg: 'Name fehlt' }] };
            if (!state.zweck) return { valid: false, errors: [{ field: 'zweck', msg: 'Bewertungszweck fehlt' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'methode',
          label: 'Methode',
          fields: ['wertermittlungsmethode', 'stichtag'],
          validate: function (state) {
            if (!state.wertermittlungsmethode) return { valid: false, errors: [{ field: 'wertermittlungsmethode', msg: 'Methode wählen' }] };
            return { valid: true, errors: [] };
          }
        }
      ],
      skipPhases: function () { return []; }
    },
    C: {
      key: 'C',
      label: 'Beratung',
      description: 'Kurzberatung mit Stunden-Abrechnung (Kauf-/Sanierungsberatung).',
      auftragstypen: ['kaufberatung', 'sanierungsberatung', 'baurechtberatung'],
      steps: [
        {
          key: 'auftragstyp',
          label: 'Beratungstyp',
          fields: ['auftrag_typ'],
          validate: function (state) {
            if (!state.auftrag_typ) return { valid: false, errors: [{ field: 'auftrag_typ', msg: 'Typ wählen' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'thema',
          label: 'Thema',
          fields: ['adresse', 'thema', 'kurzbeschreibung'],
          validate: function (state) {
            if (!state.thema) return { valid: false, errors: [{ field: 'thema', msg: 'Thema fehlt' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'auftraggeber',
          label: 'Auftraggeber',
          fields: ['auftraggeber_name', 'auftraggeber_email'],
          validate: function (state) {
            if (!state.auftraggeber_name) return { valid: false, errors: [{ field: 'auftraggeber_name', msg: 'Name fehlt' }] };
            return { valid: true, errors: [] };
          }
        }
      ],
      skipPhases: function () { return [1, 2, 3, 4, 5, 6]; }
    },
    D: {
      key: 'D',
      label: 'Baubegleitung',
      description: 'Periodische Berichte über Bauphase (Zeitreihen, Fortschritt).',
      auftragstypen: ['baubegleitung', 'baudokumentation'],
      steps: [
        {
          key: 'auftragstyp',
          label: 'Baubegleitungstyp',
          fields: ['auftrag_typ'],
          validate: function (state) {
            if (!state.auftrag_typ) return { valid: false, errors: [{ field: 'auftrag_typ', msg: 'Typ wählen' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'projekt',
          label: 'Projekt',
          fields: ['adresse', 'projektname', 'baubeginn', 'fertigstellung'],
          validate: function (state) {
            if (!state.projektname) return { valid: false, errors: [{ field: 'projektname', msg: 'Projektname fehlt' }] };
            if (!state.adresse) return { valid: false, errors: [{ field: 'adresse', msg: 'Bauadresse fehlt' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'auftraggeber',
          label: 'Auftraggeber',
          fields: ['auftraggeber_name', 'auftraggeber_rolle'],
          validate: function (state) {
            if (!state.auftraggeber_name) return { valid: false, errors: [{ field: 'auftraggeber_name', msg: 'Name fehlt' }] };
            return { valid: true, errors: [] };
          }
        },
        {
          key: 'rhythmus',
          label: 'Berichts-Rhythmus',
          fields: ['rhythmus', 'startdatum'],
          validate: function (state) {
            if (!state.rhythmus) return { valid: false, errors: [{ field: 'rhythmus', msg: 'Rhythmus wählen' }] };
            return { valid: true, errors: [] };
          }
        }
      ],
      skipPhases: function () { return []; }
    }
  };

  function getFlow(flowKey) {
    if (!flowKey || typeof flowKey !== 'string') return null;
    return FLOWS[flowKey.toUpperCase()] || null;
  }

  function listFlows() {
    return Object.keys(FLOWS);
  }

  function describeFlow(flowKey) {
    const f = getFlow(flowKey);
    return f ? f.description : '';
  }

  function getStepsForAuftragstyp(auftragstyp) {
    if (!auftragstyp) return null;
    for (const k of Object.keys(FLOWS)) {
      if (FLOWS[k].auftragstypen.includes(auftragstyp)) {
        return { flow: k, steps: FLOWS[k].steps, skipPhases: FLOWS[k].skipPhases(auftragstyp) };
      }
    }
    return null;
  }

  // Counts a flow's required (non-optional) field-coverage for cross-flow consistency-Check
  function getFieldCoverage(flowKey) {
    const f = getFlow(flowKey);
    if (!f) return null;
    const required = [];
    for (const step of f.steps) {
      for (const field of step.fields) {
        // Detect required by running validate with empty state
        const r = step.validate({});
        if (r && r.errors) {
          for (const err of r.errors) {
            if (err.field === field && !required.includes(field)) required.push(field);
          }
        }
      }
    }
    return { total_steps: f.steps.length, required_fields: required };
  }

  const api = { getFlow, listFlows, describeFlow, getStepsForAuftragstyp, getFieldCoverage, _FLOWS: FLOWS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.ProvaWizardFlowConfigs = api;
  }
})();
