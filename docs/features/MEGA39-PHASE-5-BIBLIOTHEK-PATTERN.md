# MEGA³⁹ Phase 5 — Bibliothek-Pattern Universal-Toolbar

**Datum:** 2026-05-08
**Branch:** `mega39-master-consolidation`

## Components

| Komponente | Datei | Zweck |
|------------|-------|-------|
| Lib | `lib/bibliothek-pattern.js` | Universal-Toolbar mit 6 Kategorien + Auto-Complete |
| Lambda list | `netlify/functions/user-favoriten-list.js` | GET ?kategorie= |
| Lambda toggle | `netlify/functions/user-favoriten-toggle.js` | POST {kategorie, item_id, item_label} |
| Migration | `32_user_favoriten.sql` (APPLIED) | RLS user_id=auth.uid() |

## 6 Kategorien

| Key | Search-Type-Filter | Quelle |
|-----|---------------------|--------|
| normen | normen | global-search NORMEN_SEED (M³⁹ P2, 50+) |
| textbausteine | textbausteine | Supabase textbausteine-Tabelle |
| floskeln | textbausteine + client-Filter (subtitle "floskel") | Subset textbausteine |
| paragraphen | normen + client-Filter (§/ZPO/BGB/VOB/UStG) | Subset normen |
| kontakte | kontakte | Supabase kontakte |
| positionen | positionen | Supabase positionen |

## Workflow

```js
// Auf einer Editor-Page (z.B. freigabe.html):
PROVA_BIBLIOTHEK.init({
  container: '#einfuege-toolbar',
  editor: '#s6-text',
  kategorien: ['normen', 'textbausteine', 'paragraphen']  // optional, default 6
});
```

User-Klick → Mini-Suchfeld → 2+ Buchstaben → 200ms-debounced Live-Search → Pfeil-Tasten → Insert at Cursor + Recent-Items in localStorage (max 10).

Favoriten-Toggle (★) pro Item — server-side persistiert via user_favoriten-Tabelle.

## insertAtCursor

- TEXTAREA/INPUT: setSelectionRange + dispatchEvent('input')
- ContentEditable: document.execCommand('insertText')
- Function-Editor: callback(text)

## 7 Target-Pages für Marcel-Manual-Wiring

Lib + Lambdas sind generisch. Marcel-Manual: Auf 7 Pages (freigabe.html, ortstermin-modus.html, briefvorlagen.html, stellungnahme.html, rechnungen.html, schnelle-rechnung.html, kostenermittlung.html) einbinden:

```html
<script src="/lib/bibliothek-pattern.js" defer></script>
<div id="einfuege-toolbar"></div>
<textarea id="s6-text"></textarea>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (window.PROVA_BIBLIOTHEK) {
      window.PROVA_BIBLIOTHEK.init({
        container: '#einfuege-toolbar',
        editor: '#s6-text'
      });
    }
  });
</script>
```

## Tests

`tests/bibliothek/m39-p5-bibliothek-pattern.test.js` — **16/16 grün**:
- 6 Default-Kategorien
- KATEGORIE_META Schema
- Public API exposed (6 Methoden)
- search ruft global-search mit type-Filter
- Query <2 Zeichen → 0 Treffer
- floskeln + paragraphen client-side gefiltert
- Recent-Items localStorage (max 10, neueste zuerst)
- insertAtCursor in TEXTAREA + Function-Editor
- toggleFavorit ruft Lambda
- Lambda-Header (auth, methods, validate)
- 6 valid kategorien in Toggle-Lambda
- 200ms Live-Search-Debounce

## Acceptance

- [x] lib/bibliothek-pattern.js
- [x] 2 Lambdas (list + toggle)
- [x] Migration 32 (user_favoriten) APPLIED + RLS
- [x] 16 Tests grün
- [ ] Marcel-Manual: 7 Pages einbinden (Snippet oben)

*— M³⁹ P5 — 2026-05-08*
