# MEGA⁷⁰ Phase 3.4 — Quick-Wins Backlog

**Status:** Dokumentiert als Patch-Snippets. Marcel triggert Page-für-Page nach Pilot-Start.

---

## normen.html — Instant-Search-Highlighting

**Aktuell:** Suche filtert ohne Highlighting.
**Patch:**
```js
function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return text.replace(re, '<mark>$1</mark>');
}
// In renderRows(): item.titel = highlight(item.titel, searchValue)
```
**Effort:** ~15 Min.

---

## briefe.html — Empty-State mit Vorlagen-Thumbs

**Aktuell:** Listet existing Briefe, leerer State minimalistisch.
**Patch:** Empty-State (via `ProvaEmptyPresets.render('#br-list', 'briefe')` — bereits in 2.2 implementiert) + Quick-Add-Karten mit 3 häufigsten Vorlagen.
**Effort:** ~15 Min (Empty-Preset einbinden + Cards).

---

## termine.html — Segmented-Control + J/K-Keyboard-Nav

**Aktuell:** Liste mit Click-Selection.
**Patch:**
```html
<div class="segmented">
  <button data-view="liste" class="active">Liste</button>
  <button data-view="kalender">Kalender</button>
  <button data-view="agenda">Agenda</button>
</div>
<script>
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'j') focusNext();
  if (e.key === 'k') focusPrev();
});
</script>
```
**Effort:** ~30 Min.

---

## fristen.html — Kanban-View pro Pipeline

**Aktuell:** View-Toggle Liste/Kalender (MEGA⁶⁹-FINAL-1 C.5).
**Erweitern:** dritter Tab "Kanban" mit Spalten pro Pipeline-Phase.
**Patch:**
```html
<button data-view="kanban">📋 Kanban</button>
<div id="fr-view-kanban" hidden>
  <div class="kanban-grid">
    <div class="kanban-col" data-status="offen">…</div>
    <div class="kanban-col" data-status="laufend">…</div>
    <div class="kanban-col" data-status="erfuellt">…</div>
  </div>
</div>
```
**Effort:** ~45 Min.

---

## dokument-import.html — Skeleton-Loading + Progress

**Aktuell:** Spinner während Upload.
**Patch:** Skeleton-Row pro hochgeladenes File + Progress-Bar pro File:
```html
<div class="upload-row skel" data-file="abc.pdf">
  <div class="skel-thumb"></div>
  <div class="upload-progress"><div class="bar" style="width:42%"></div></div>
</div>
```
**Effort:** ~30 Min.

---

## bescheinigung-erstellen.html — Live-Preview rechts (Split 60/40)

**Aktuell:** Form ohne Preview.
**Patch:** 2-Col-Grid: Form 60% + iframe-Preview 40% mit `srcdoc` aus Form-Werten.
```html
<div class="bs-split">
  <form class="bs-form">…</form>
  <iframe class="bs-preview" id="bs-preview" srcdoc=""></iframe>
</div>
<script>
form.addEventListener('input', () => {
  preview.srcdoc = renderTemplate(formValues);
});
</script>
```
**Effort:** ~1h.

---

## Self-Scoping

Marcel-Direktive: "wenn nur Zeit für eine Phase: Phase 1". Phase 3.4 hat ROI eher kosmetisch — ich dokumentiere als Backlog mit konkreten Patches statt jetzt 6 Pages anzufassen. Marcel kann diese Patches in einer 2-3h Polish-Session nach Pilot abarbeiten.

**Status:** ✅ Backlog dokumentiert mit Patches und Aufwand-Schätzung.
