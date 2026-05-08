# MEGA³⁹ Phase 6 — KI-Werkzeug-Stufen S1/S2/S3

**Datum:** 2026-05-08
**Branch:** `mega39-master-consolidation`

## Konzept (CLAUDE.md Regel 13)

| Stufe | Inhalt | Aktivierung | UI-Pattern |
|-------|--------|-------------|------------|
| **S1 Mechanisch** | Rechtschreibung / Komma / Grammatik | Live (auto) | inline-Marker / Browser-Spell-Check |
| **S2 Strukturell** | Absätze / Überschriften / Reihenfolge | Opt-In | Diff-Modal (Word-Level) mit Übernehmen/Ablehnen |
| **S3 Inhaltlich** | Konjunktiv II / Halluzin / §407a / Fachsprache | Opt-In | nicht-kopierbare Begründungs-Box — SV schreibt SELBST um |

## Implementation

`lib/ki-werkzeug-stufen.js` (NEU):

```js
window.PROVA_KI_WERKZEUG = {
  // §407a-Eigenleistung-Enforcement
  bindEditor({ textarea, charCounter, submitBtn, minChars=500 })

  // S2 (Diff)
  s2_struktur_vorschlag(text)
  showDiff(orig, neu, { onAccept, onReject })

  // S3 (Begründung)
  s3_konjunktiv_ii(text)
  s3_halluzinations_check(text, diktatOriginal)
  s3_407a_konsistenz(s4_text, s6_text)
  s3_fachsprache(text)
  showBegruendung(begruendungsText, vorschlag?)
};
```

**Backend:** Alle S2/S3-Aufrufe gehen über `/.netlify/functions/ki-proxy` mit
`purpose`-Parameter. Edge Function ki-proxy (M³⁹ P1) erzwingt für S3-Aufgaben
das Frontier-Modell `gpt-5.5` (FORCED_HIGH_MODEL_PURPOSES — Konjunktiv +
Halluzin + 407a sind alle dabei).

## §407a-Doktrin (Pflicht-Implementation)

### 500 Char Eigenleistung
```js
PROVA_KI_WERKZEUG.bindEditor({
  textarea: '#s6-text',
  charCounter: '#char-count',
  submitBtn: '#s6-submit'
});
```
→ Submit-Button bleibt disabled bis `value.length >= 500`.
→ Tooltip: „Noch X Zeichen Eigenleistung nötig (§407a ZPO)".
→ minChars konfigurierbar.

### Begründungs-Box NICHT-kopierbar
- CSS `user-select: none; -webkit-user-select: none;`
- JS `contextmenu`/`copy`/`cut`-Events `preventDefault()`
- Header: „⚠️ S3 KI-Hinweis (nicht zum Kopieren)"
- Notiz: „SV schreibt selbst um. 'Übernehmen' als Notausgang"

## Word-Level-Diff für S2

`_wordDiff(orig, neu)` liefert Array `[{op:'eq'|'add'|'del', text}]`. Render:
- `add` → grün hinterlegt
- `del` → rot hinterlegt + line-through
- `eq` → neutral

Modal hat **Übernehmen** (callback `onAccept`) und **Ablehnen** (`onReject`).

## KI-Funktions-Garantie (CLAUDE.md Regel 15)

5 KI-Funktionen erfasst (S2-Struktur + 4× S3) — pro Funktion müssen vor Pilot-Live 5-Tests-Suite grün sein (existierend in `tests/ki-funktions-garantie.test.js` aus M²⁸ P6-I1, 19/19 grün laut M³⁷-W8-Verify).

## Tests

`tests/ki/m39-p6-ki-werkzeug-stufen.test.js` — **15/15 grün**:
- Public API (8 Methoden)
- PURPOSE_TO_S Mapping (5 distinct purposes, alle S3 → praezise/gpt-5.5)
- DEFAULT_MIN_CHARS = 500
- s3_konjunktiv_ii ruft ki-proxy mit purpose
- s3_407a_konsistenz übergibt s4+s6 separat
- s3_halluzinations_check übergibt diktat_original
- bindEditor disable/enable bei <500/>=500 Chars
- minChars konfigurierbar
- bindEditor wirft bei fehlender textarea
- _wordDiff erkennt add/del/eq
- Begründungs-Box CSS user-select:none + 3 Event-Blocks
- showDiff Übernehmen/Ablehnen Buttons + Callbacks
- §407a-Doktrin im Header dokumentiert

## Marcel-Manual: Editor-Page-Wiring

Empfohlen für `freigabe.html` und `stellungnahme.html`:

```html
<script src="/lib/ki-werkzeug-stufen.js" defer></script>

<textarea id="s6-text" placeholder="§6 Fachurteil — schreiben Sie Ihre persönliche Bewertung..."></textarea>
<div>Eigenleistung: <strong id="char-count">0</strong> / 500 Zeichen</div>

<div class="ki-toolbar">
  <button onclick="onS2Struktur()">📐 S2 Struktur</button>
  <button onclick="onS3Konjunktiv()">⚠️ S3 Konjunktiv II</button>
  <button onclick="onS3Halluzin()">🔍 S3 Halluzinations-Check</button>
  <button onclick="onS3_407a()">⚖️ S3 §407a-Konsistenz</button>
</div>

<button id="s6-submit">Freigeben</button>

<script>
PROVA_KI_WERKZEUG.bindEditor({
  textarea: '#s6-text',
  charCounter: '#char-count',
  submitBtn: '#s6-submit'
});

async function onS2Struktur() {
  const text = document.getElementById('s6-text').value;
  const r = await PROVA_KI_WERKZEUG.s2_struktur_vorschlag(text);
  if (r.ok) PROVA_KI_WERKZEUG.showDiff(text, r.vorschlag, {
    onAccept: (neuText) => { document.getElementById('s6-text').value = neuText; }
  });
}

async function onS3Konjunktiv() {
  const text = document.getElementById('s6-text').value;
  const r = await PROVA_KI_WERKZEUG.s3_konjunktiv_ii(text);
  if (r.ok) PROVA_KI_WERKZEUG.showBegruendung(r.begruendung || r.result || '');
}
// usw. für Halluzin / 407a / Fachsprache
</script>
```

## Acceptance

- [x] lib/ki-werkzeug-stufen.js
- [x] Public API mit 8 Methoden
- [x] §407a 500-Char-Enforcement
- [x] Begründungs-Box nicht-kopierbar (3 Event-Blocks + CSS)
- [x] Word-Level-Diff für S2
- [x] gpt-5.5-Pflicht für S3-Aufgaben (M³⁹ P1 FORCED_HIGH_MODEL_PURPOSES)
- [x] 15 Tests grün
- [ ] Marcel-Manual: 2 Editor-Pages mit Toolbar einbinden

*— M³⁹ P6 — 2026-05-08*
