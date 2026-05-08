/**
 * PROVA — Quality-Markers-Lib (MEGA³⁰ C3)
 *
 * 3 Regex-Pattern für §6 Fachurteil-Qualitäts-Check (Vision-Master Regel 11).
 * Mindestens 2/3 Marker im Editor-Text = OK.
 *
 * Public API:
 *   checkMarkers(text) → { norm, konjunktiv, paragraph, count, ok, missing }
 *
 * Regex-Pattern aus Vision-Master + Marcel-Direktive:
 * - Norm-Verweis: §, DIN, EN, VOB, HOAI, BGB, ZPO etc.
 * - Konjunktiv II: würde, wäre, hätte, dürfte, könnte, müsste, sollte, liege, stünde
 * - §-Verweis: explizit Paragraph-Notation
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProvaQualityMarkers = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  // Norm-Verweis: §, DIN, EN, VOB, HOAI, BGB, ZPO, JVEG, BauO, GEG, ImmoWertV, AVB, AVV
  const PATTERN_NORM = /§\s*\d+|DIN\s*\d+|DIN\s+EN\s*\d+|EN\s*\d+|VOB|HOAI|JVEG|BGB|ZPO|BauO|GEG|ImmoWertV|AVB|AVV|StPO|StGB|StVO|VwVfG|MaBV|MietG/i;

  // Konjunktiv II — Liste typischer Verben in Hypothese / Kausalaussagen
  const PATTERN_KONJUNKTIV = /\b(würde|wäre|hätte|dürfte|könnte|müsste|sollte|liege|stünde|spräche|gäbe|käme|läge|sähe|wüsste|hielte|fände|gefiele)\b/i;

  // §-Verweis: explizit Paragraph (auch ohne ZPO/BGB-Suffix)
  const PATTERN_PARAGRAPH = /§\s*\d+/;

  function checkMarkers(text) {
    const t = String(text || '');
    const norm = PATTERN_NORM.test(t);
    const konjunktiv = PATTERN_KONJUNKTIV.test(t);
    const paragraph = PATTERN_PARAGRAPH.test(t);
    const count = (norm ? 1 : 0) + (konjunktiv ? 1 : 0) + (paragraph ? 1 : 0);
    const ok = count >= 2;
    const missing = [];
    if (!norm) missing.push('Norm-Verweis (DIN/§/VOB/HOAI/...)');
    if (!konjunktiv) missing.push('Konjunktiv II (würde/wäre/hätte/...)');
    if (!paragraph) missing.push('§-Verweis (z.B. § 6 ZPO)');
    return { norm, konjunktiv, paragraph, count, ok, missing };
  }

  return {
    checkMarkers,
    PATTERNS: { PATTERN_NORM, PATTERN_KONJUNKTIV, PATTERN_PARAGRAPH }
  };
}));
