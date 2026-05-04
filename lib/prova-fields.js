/**
 * PROVA Fields Registry (Vanilla-JS, Standalone)
 * MEGA¹⁷-PERFECTION W57 (2026-05-08)
 *
 * Single Source of Truth fuer mappable PROVA-Felder.
 * Wird von prova-mode-c.js (Variable-Mapping) und kuenftig vom
 * Onboarding-Wizard / Auto-Detection / KI-Help genutzt.
 *
 * Public API (browser via window.ProvaFields, node via require):
 *   ProvaFields.PROVA_FIELDS                  // [{ key, label, group }, ...]
 *   ProvaFields.byGroup(group)                // [{ key, label, group }, ...]
 *   ProvaFields.byKey(key)                    // { key, label, group } | null
 *   ProvaFields.GROUPS                        // ['Akte', 'Objekt', ...]
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ProvaFields = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {

  const PROVA_FIELDS = [
    // Akten-Kern
    { key: 'akte.az',                  label: 'Aktenzeichen',                    group: 'Akte' },
    { key: 'akte.titel',               label: 'Titel / Kurzbezeichnung',         group: 'Akte' },
    { key: 'akte.fragestellung',       label: 'Fragestellung',                   group: 'Akte' },
    { key: 'akte.schadensart_label',   label: 'Schadensart',                     group: 'Akte' },
    { key: 'akte.auftragsdatum',       label: 'Auftragsdatum',                   group: 'Akte' },
    { key: 'akte.gutachtendatum',      label: 'Gutachten-Datum',                 group: 'Akte' },
    { key: 'akte.schadensstichtag',    label: 'Schadensstichtag',                group: 'Akte' },
    // Objekt
    { key: 'akte.objekt.adresse',      label: 'Objekt-Adresse',                  group: 'Objekt' },
    { key: 'akte.objekt.plz',          label: 'Objekt-PLZ',                      group: 'Objekt' },
    { key: 'akte.objekt.ort',          label: 'Objekt-Ort',                      group: 'Objekt' },
    { key: 'akte.objekt.objektart',    label: 'Objekt-Art',                      group: 'Objekt' },
    { key: 'akte.objekt.baujahr',      label: 'Baujahr',                         group: 'Objekt' },
    { key: 'akte.objekt.wohnflaeche',  label: 'Wohnflaeche (m²)',                group: 'Objekt' },
    // Auftraggeber (Kontakte)
    { key: 'kunde.name',               label: 'Auftraggeber Name',               group: 'Auftraggeber' },
    { key: 'kunde.adresse',            label: 'Auftraggeber Adresse',            group: 'Auftraggeber' },
    { key: 'kunde.plz',                label: 'Auftraggeber PLZ',                group: 'Auftraggeber' },
    { key: 'kunde.ort',                label: 'Auftraggeber Ort',                group: 'Auftraggeber' },
    { key: 'kunde.email',              label: 'Auftraggeber Email',              group: 'Auftraggeber' },
    { key: 'kunde.telefon',            label: 'Auftraggeber Telefon',            group: 'Auftraggeber' },
    // SV-Eigene
    { key: 'sv.name',                  label: 'SV Name',                         group: 'Sachverstaendiger' },
    { key: 'sv.titel',                 label: 'SV Titel',                        group: 'Sachverstaendiger' },
    { key: 'sv.kanzlei',               label: 'SV Kanzlei',                      group: 'Sachverstaendiger' },
    { key: 'sv.adresse',               label: 'SV Adresse',                      group: 'Sachverstaendiger' },
    { key: 'sv.email',                 label: 'SV Email',                        group: 'Sachverstaendiger' },
    // Honorar
    { key: 'akte.kosten_geschaetzt_brutto', label: 'Kosten geschaetzt (brutto)', group: 'Honorar' },
    { key: 'akte.kosten_geschaetzt_netto',  label: 'Kosten geschaetzt (netto)',  group: 'Honorar' },
    // System
    { key: 'system.heute',             label: 'Heutiges Datum',                  group: 'System' },
    { key: 'system.jahr',              label: 'Aktuelles Jahr',                  group: 'System' }
  ];

  const GROUPS = Array.from(new Set(PROVA_FIELDS.map(f => f.group)));

  function byGroup(group) {
    return PROVA_FIELDS.filter(f => f.group === group);
  }

  function byKey(key) {
    return PROVA_FIELDS.find(f => f.key === key) || null;
  }

  return {
    PROVA_FIELDS: PROVA_FIELDS,
    GROUPS: GROUPS,
    byGroup: byGroup,
    byKey: byKey
  };
});
