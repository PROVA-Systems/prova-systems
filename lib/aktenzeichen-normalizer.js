/**
 * PROVA Aktenzeichen-Normalizer (MEGA⁴¹ P1)
 *
 * Aktenzeichen-Format-Vielfalt: "12 O 345/24" vs "12-O-345-24" vs "12O345/24".
 * Normalisierung erlaubt Duplicate-Detection beim Daten-Import.
 *
 * Public API:
 *   normalize(az: string) → string (lowercased, normalized)
 *   isEquivalent(a, b) → boolean
 *   examples (für Tests)
 */
'use strict';

(function () {

  /**
   * Normalisiere Aktenzeichen für Vergleich.
   * - Whitespace + Bindestriche + Underscores entfernen
   * - Lowercase
   * - "/" und "." bleiben (Datums-Separatoren)
   *
   * Beispiele:
   *   "12 O 345/24"   → "12o345/24"
   *   "12-O-345-24"   → "12o34524"
   *   "12-O-345/24"   → "12o345/24"
   *   "12O345/24"     → "12o345/24"
   *   "AZ 5 C 12/26"  → "az5c12/26"
   */
  function normalize(az) {
    if (!az || typeof az !== 'string') return '';
    return String(az)
      .toLowerCase()
      .replace(/[\s\-_]+/g, '')
      .trim();
  }

  function isEquivalent(a, b) {
    return normalize(a) === normalize(b);
  }

  const examples = [
    { input: '12 O 345/24',  expected: '12o345/24' },
    { input: '12-O-345/24',  expected: '12o345/24' },
    { input: '12O345/24',    expected: '12o345/24' },
    { input: 'AZ 5 C 12/26', expected: 'az5c12/26' },
    { input: '',             expected: '' },
    { input: null,           expected: '' }
  ];

  const api = {
    normalize: normalize,
    isEquivalent: isEquivalent,
    examples: examples
  };

  if (typeof window !== 'undefined') {
    window.ProvaAktenzeichenNormalizer = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
