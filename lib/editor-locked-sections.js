/**
 * PROVA Editor Locked-Sections (MEGA⁴⁰ P9 + P3)
 *
 * 4 Compliance-Sektionen die im Hybrid-Modus (weg_c) automatisch
 * vor PDF-Generation eingefügt werden:
 *   - deckblatt (vorne)
 *   - paragraph_407a_zpo (vor §6 Fachurteil)
 *   - eu_ai_act_disclosure (Anhang)
 *   - unterschrift (am Ende)
 *
 * Public API (window.ProvaEditorLockedSections):
 *   getSection(key, vars?) — TipTap-JSON für eine Sektion
 *   injectAll(tipTapJson, vars?) — wrappt Doc mit allen 4 Sections
 *   PROVA_LOCKED_SECTIONS — Array of {key, position}
 *
 * Variables:
 *   {{Auftraggeber}}, {{Aktenzeichen}}, {{Gutachtenort}}, {{Datum}},
 *   {{SV_Name}}, {{SV_Bestellungsnr}}
 */
'use strict';

(function () {

  const PROVA_LOCKED_SECTIONS = [
    { key: 'deckblatt', position: 'top' },
    { key: 'paragraph_407a_zpo', position: 'before_section_6' },
    { key: 'eu_ai_act_disclosure', position: 'after_appendix' },
    { key: 'unterschrift', position: 'bottom' }
  ];

  function _para(text, opts) {
    opts = opts || {};
    const node = { type: 'paragraph' };
    if (opts.align) node.attrs = { textAlign: opts.align };
    node.content = [{ type: 'text', text: text }];
    return node;
  }

  function _h(level, text) {
    return { type: 'heading', attrs: { level: level }, content: [{ type: 'text', text: text }] };
  }

  function _interpolate(text, vars) {
    if (!text || !vars) return text;
    return text.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (m, k) => vars[k] != null ? vars[k] : m);
  }

  function _interpolateNode(node, vars) {
    if (!node || !vars) return node;
    if (Array.isArray(node)) return node.map(n => _interpolateNode(n, vars));
    const cloned = JSON.parse(JSON.stringify(node));
    function walk(n) {
      if (!n) return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.type === 'text' && typeof n.text === 'string') {
        n.text = _interpolate(n.text, vars);
      }
      if (Array.isArray(n.content)) walk(n.content);
    }
    walk(cloned);
    return cloned;
  }

  function getSection(key, vars) {
    let nodes;
    switch (key) {
      case 'deckblatt':
        nodes = [
          _h(1, 'Sachverständigen-Gutachten'),
          _para('Auftraggeber: {{Auftraggeber}}', { align: 'center' }),
          _para('Aktenzeichen: {{Aktenzeichen}}', { align: 'center' }),
          _para('Gutachtenort: {{Gutachtenort}}', { align: 'center' }),
          _para('Datum: {{Datum}}', { align: 'center' }),
          { type: 'pageBreak' }
        ];
        break;
      case 'paragraph_407a_zpo':
        nodes = [
          _h(2, 'Gutachterbelehrung gemäß § 407a ZPO'),
          _para('Der Sachverständige hat bei seiner Tätigkeit nach besten Kräften die Wahrheit unparteilich zu erforschen, sein Gutachten unabhängig nach bestem Wissen und Gewissen zu erstellen und sich der ihm anvertrauten Sache mit der erforderlichen Sorgfalt zu widmen.'),
          _para('Es bleibt im Verantwortungsbereich des Sachverständigen, alle ihm zugänglichen Erkenntnisquellen auszuschöpfen. Eine pauschale Übernahme von KI-generierten Inhalten ist ausgeschlossen — KI dient nur als strukturelle Hilfe (Rechtschreibung, Konjunktiv-II-Prüfung, Halluzinations-Check). Die fachliche Bewertung obliegt ausschließlich dem Sachverständigen.')
        ];
        break;
      case 'eu_ai_act_disclosure':
        nodes = [
          _h(2, 'Hinweis gemäß EU AI Act (Verordnung 2024/1689)'),
          _para('Bei der Erstellung dieses Gutachtens kamen unterstützende KI-Werkzeuge zum Einsatz: (1) Rechtschreib- und Grammatik-Prüfung, (2) Konjunktiv-II-Validierung, (3) Halluzinations-Check und (4) Strukturhilfen. Alle fachlichen Inhalte, Befunde und Bewertungen wurden ausschließlich vom unterzeichnenden Sachverständigen erarbeitet und verantwortet.'),
          _para('Die eingesetzten Modelle: GPT-5.5 (OpenAI). Datenverarbeitung gemäß DSGVO unter Pseudonymisierung personenbezogener Daten vor Übertragung.')
        ];
        break;
      case 'unterschrift':
        nodes = [
          _h(2, 'Unterschrift'),
          _para('Vorstehendes Gutachten erstelle ich nach bestem Wissen und Gewissen.'),
          _para('Ort, Datum: {{Gutachtenort}}, {{Datum}}'),
          _para(' '),
          _para(' '),
          _para('_______________________________'),
          _para('{{SV_Name}}'),
          _para('Öffentlich bestellter und vereidigter Sachverständiger'),
          _para('IHK-Bestellungs-Nr.: {{SV_Bestellungsnr}}')
        ];
        break;
      default:
        return null;
    }
    return _interpolateNode(nodes, vars || {});
  }

  /**
   * Injiziert alle 4 Locked-Sections in das Editor-Doc (für PDF-Generation).
   * Pragmatic-Layout: Deckblatt vorne, §407a + EU AI Act + Unterschrift am Ende.
   *
   * @param {Object} tipTapJson — User-Editor-Doc
   * @param {Object} [vars] - Variables für Interpolation
   * @returns {Object} TipTap-Doc mit Locked-Sections injiziert
   */
  function injectAll(tipTapJson, vars) {
    if (!tipTapJson) tipTapJson = { type: 'doc', content: [] };
    const userContent = Array.isArray(tipTapJson.content) ? tipTapJson.content : [];

    const deckblatt = getSection('deckblatt', vars) || [];
    const para407a = getSection('paragraph_407a_zpo', vars) || [];
    const aiAct = getSection('eu_ai_act_disclosure', vars) || [];
    const unterschrift = getSection('unterschrift', vars) || [];

    return {
      type: 'doc',
      content: [
        ...deckblatt,
        ...para407a,
        { type: 'pageBreak' },
        ...userContent,
        { type: 'pageBreak' },
        ...aiAct,
        { type: 'pageBreak' },
        ...unterschrift
      ]
    };
  }

  // Public API
  const api = {
    getSection: getSection,
    injectAll: injectAll,
    PROVA_LOCKED_SECTIONS: PROVA_LOCKED_SECTIONS,
    _interpolate: _interpolate,
    _interpolateNode: _interpolateNode
  };

  if (typeof window !== 'undefined') {
    window.ProvaEditorLockedSections = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
