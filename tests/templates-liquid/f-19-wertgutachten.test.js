/**
 * Tests für F-19-WERTGUTACHTEN.liquid.template.html (MEGA²⁸ V3.2-W8-I2)
 *
 * Strukturelle Verifikation der Liquid-Variante:
 * - 4-Teil-Struktur
 * - 5 Pflicht-Klauseln (W8-T5 Recherche-Doku)
 * - Variable-Substitution-Marker
 * - Compliance-Verweise (§§ 6-43 ImmoWertV, § 194 BauGB, BGH ±30%, § 407a ZPO, Art. 50)
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'templates-goldstandard', '04-gutachten', 'F-19-WERTGUTACHTEN.liquid.template.html'),
  'utf8'
);

describe('F-19 Liquid — IHK-SVO 4-Teil-Struktur', () => {
  test('Teil 1, 2, 3, 4 Header vorhanden', () => {
    assert.match(SRC, /Teil 1 — Auftrag/);
    assert.match(SRC, /Teil 2 — Stammdaten/);
    assert.match(SRC, /Teil 3 — Beantwortung/);
    assert.match(SRC, /Teil 4 — Zusammenfassung/);
  });

  test('Sachverständige Beurteilung (Fachurteil) Section', () => {
    assert.match(SRC, /Sachverständige Beurteilung \(Fachurteil\)/);
    assert.match(SRC, /\{\{ fachurteil_text \}\}/);
  });
});

describe('F-19 Liquid — 5 Pflicht-Klauseln (W8-T5)', () => {
  test('Klausel 1: Bewertungsstichtag § 7 ImmoWertV', () => {
    assert.match(SRC, /Bewertungsstichtag.*§ 7 ImmoWertV/i);
  });

  test('Klausel 2: Verfahrens-Begründung § 6 ImmoWertV', () => {
    assert.match(SRC, /Verfahrens-Begründung.*§ 6 ImmoWertV/i);
  });

  test('Klausel 3: BGH-Genauigkeitsmarge ±30%', () => {
    assert.match(SRC, /BGH-Genauigkeitsmarge|±30%|V ZR 420\/99/);
  });

  test('Klausel 4: § 407a Abs. 3 ZPO Eigenleistung', () => {
    assert.match(SRC, /§ 407a/);
    assert.match(SRC, /Eigenleistung/i);
  });

  test('Klausel 5: Art. 50 EU AI Act KI-Disclosure', () => {
    assert.match(SRC, /Art\. 50 EU AI Act/);
    assert.match(SRC, /KI-Hilfsmittel-Erklärung/);
  });
});

describe('F-19 Liquid — Variable-Substitution', () => {
  const REQUIRED_VARS = [
    'az', 'datum', 'sv_name', 'auftraggeber_name', 'auftraggeber_anschrift',
    'objekt_adresse', 'objekt_typ', 'baujahr', 'bewertungsstichtag',
    'verkehrswert_eur', 'verkehrswert_eur_in_worten',
    'fachurteil_text', 'unterschrift_ort', 'unterschrift_datum'
  ];

  REQUIRED_VARS.forEach(v => {
    test('Variable ' + v + ' wird referenziert', () => {
      assert.match(SRC, new RegExp('\\{\\{\\s*' + v + '\\s*[\\}|]'));
    });
  });

  test('Liquid-Loops für beweisfragen + vorgelegte_unterlagen', () => {
    assert.match(SRC, /\{%\s*for frage in beweisfragen\s*%\}/);
    assert.match(SRC, /\{%\s*for unterlage in vorgelegte_unterlagen\s*%\}/);
  });

  test('Conditional-Blocks für 3 Verfahren (Vergleichswert/Sachwert/Ertragswert)', () => {
    assert.match(SRC, /\{%\s*if vergleichswert_eur\s*%\}/);
    assert.match(SRC, /\{%\s*if sachwert_eur\s*%\}/);
    assert.match(SRC, /\{%\s*if ertragswert_eur\s*%\}/);
  });
});

describe('F-19 Liquid — ImmoWertV-Compliance-Verweise', () => {
  test('§§ 6 ImmoWertV (Verfahrenswahl)', () => {
    assert.match(SRC, /§ 6 ImmoWertV/);
  });

  test('§§ 14-23 ImmoWertV (Vergleichswert)', () => {
    assert.match(SRC, /§§ 14-23 ImmoWertV/);
  });

  test('§§ 27-34 ImmoWertV (Ertragswert)', () => {
    assert.match(SRC, /§§ 27-34 ImmoWertV/);
  });

  test('§§ 35-43 ImmoWertV (Sachwert)', () => {
    assert.match(SRC, /§§ 35-43 ImmoWertV/);
  });

  test('§ 194 BauGB Verkehrswert-Definition', () => {
    assert.match(SRC, /§ 194 BauGB/);
    assert.match(SRC, /gewöhnlichen Geschäftsverkehr/);
  });
});

describe('F-19 Liquid — Audit-Header + Recherche-Verweis', () => {
  test('Audit-Header mit MEGA²⁸ W8-I2 Marker', () => {
    assert.match(SRC, /MEGA.{1,3} W8-I2/);
  });

  test('Recherche-Doku-Verweis im Header', () => {
    assert.match(SRC, /MEGA-28-W8-T5-RECHERCHE-F19/);
  });

  test('Compliance-Stand-Marker', () => {
    assert.match(SRC, /ImmoWertV 2021/);
    assert.match(SRC, /§ 407a Abs\. 3 ZPO/);
    assert.match(SRC, /Art\. 50 EU AI Act/);
  });
});

describe('F-19 Liquid — Output-Quality', () => {
  test('Verkehrswert-Box mit prominenter EUR-Anzeige', () => {
    assert.match(SRC, /verkehrswert-box/);
    assert.match(SRC, /verkehrswert-eur/);
  });

  test('Fachurteil-Box mit Eigenleistungs-Hinweis', () => {
    assert.match(SRC, /fachurteil-box/);
    assert.match(SRC, /ohne KI-Unterstützung/);
  });

  test('Unterschrift-Block mit SV-Name + Stempel', () => {
    assert.match(SRC, /unterschrift-block/);
    assert.match(SRC, /Unterschrift Sachverständiger/);
    assert.match(SRC, /Stempel/);
  });
});
