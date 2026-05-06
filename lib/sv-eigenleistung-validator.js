/**
 * PROVA — sv-eigenleistung-validator.js (MEGA²⁸ W1-I3)
 *
 * §407a ZPO Pre-Send-Validator. Bevor PDF generiert wird:
 *   1. SV-Eigenleistung in §6 ≥ 500 Zeichen
 *   2. Konjunktiv-II-Marker mind. 1× vorhanden
 *   3. KI-Disclosure-Box im PDF-Template (EU AI Act Art. 50)
 *
 * Bei Fail: PDF-Generation blockiert. User-Hinweis faktisch (nicht patronisierend).
 *
 * UMD: browser via window.ProvaEigenleistungValidator, node via require.
 *
 * Public API:
 *   validate({ p6_text, template_html }) → { ok, fails:[{rule, message}], warnings:[] }
 */
'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.ProvaEigenleistungValidator = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {

  const MIN_LENGTH = 500;
  const KONJUNKTIV2_MARKERS = /\b(dürfte|könnte|läge nahe|ließe sich|wäre|würde|hätte|sollte|möchte|müsste)\b/i;
  const KI_DISCLOSURE_MARKER = /(EU AI Act|Art\.\s*50|KI-Strukturhilfe|§407a|prova-ki-disclaimer)/i;

  function validateP6Length(p6_text) {
    const len = (p6_text || '').length;
    if (len < MIN_LENGTH) {
      return { rule: 'min_length', message: 'Voraussetzung "§6 mindestens ' + MIN_LENGTH + ' Zeichen Eigenleistung" erfüllt: Nein. Aktuell: ' + len + ' Zeichen. Prüfen Sie §6.' };
    }
    return null;
  }

  function validateKonjunktiv2(p6_text) {
    if (!KONJUNKTIV2_MARKERS.test(p6_text || '')) {
      return { rule: 'konjunktiv_ii', message: 'Voraussetzung "Konjunktiv-II-Marker in §6" erfüllt: Nein. Beispiele: dürfte / könnte / ließe sich. Prüfen Sie §6.' };
    }
    return null;
  }

  function validateKiDisclosure(template_html) {
    if (!template_html) return { rule: 'ki_disclosure', message: 'Voraussetzung "KI-Disclosure-Box im PDF-Template" erfüllt: Nein (Template fehlt).' };
    if (!KI_DISCLOSURE_MARKER.test(template_html)) {
      return { rule: 'ki_disclosure', message: 'Voraussetzung "KI-Disclosure-Box im PDF-Template" erfüllt: Nein. EU AI Act Art. 50 Pflicht.' };
    }
    return null;
  }

  /**
   * Haupt-Validator.
   * @param {object} input { p6_text, template_html }
   * @returns {{ok, fails, warnings, status}}
   */
  function validate(input) {
    input = input || {};
    const fails = [];
    const warnings = [];

    const a = validateP6Length(input.p6_text);
    const b = validateKonjunktiv2(input.p6_text);
    const c = validateKiDisclosure(input.template_html);
    if (a) fails.push(a);
    if (b) fails.push(b);
    if (c) fails.push(c);

    return {
      ok: fails.length === 0,
      fails,
      warnings,
      status: fails.length === 0 ? 'pass' : 'block',
      message: fails.length === 0
        ? 'Alle 3 Pre-Send-Validatoren erfüllt.'
        : 'PDF-Generation blockiert: ' + fails.length + ' Voraussetzung(en) nicht erfüllt.'
    };
  }

  return {
    validate,
    validateP6Length,
    validateKonjunktiv2,
    validateKiDisclosure,
    _const: { MIN_LENGTH, KONJUNKTIV2_MARKERS, KI_DISCLOSURE_MARKER }
  };
});
