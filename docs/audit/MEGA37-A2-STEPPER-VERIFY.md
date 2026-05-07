# MEGA³⁷ A2 — `_oeffneSchritt` Stepper Verify

**Datum:** 2026-05-08
**Branch:** `mega34-final-100-percent`
**Befund:** ✅ Kein Bug. `_oeffneSchritt` verhält sich für Rückwärts-Sprünge korrekt.

---

## Code-Analyse

`prova-wizard.js:234`

```js
function _oeffneSchritt(n) {
  WZ.schritt = n;                          // Setzt aktuellen Schritt auf n
  if (WZ.el) WZ.el.remove();               // Altes DOM-Element wird entfernt
  WZ.el = _erstelleWizard(n);              // Neuer DOM-Knoten für Schritt n
  document.body.appendChild(WZ.el);
  setTimeout(function() {                  // Fokus auf erstes Input
    var first = WZ.el.querySelector('input, select, textarea');
    if (first) first.focus();
  }, 80);
}
```

### Was passiert mit Daten?
`WZ.felder` (das State-Objekt mit allen Wizard-Eingaben) wird **NICHT** angefasst.
`_oeffneSchritt` modifiziert nur:
- `WZ.schritt` (aktueller Schritt)
- `WZ.el` (DOM-Wrapper-Knoten)

Eingegebene Daten bleiben intakt. Der DOM-Knoten wird rekonstruiert via
`_erstelleWizard(n)`, der seinerseits aus `WZ.felder['wz-...']` die Werte
zurückliest und in die Inputs zurücksetzt.

### Schutz gegen versehentlichen Datenverlust
Beide Caller rufen vor dem Sprung `_sammleDaten()` auf:
- `_zurueck()` (`prova-wizard.js:265`)
- `_wzZurueckZuSchritt(n)` (M³⁶ W7.4)

`_sammleDaten()` liest die aktuellen Input-Werte aus dem DOM und persistiert
sie nach `WZ.felder` — bevor `_oeffneSchritt` den DOM-Knoten ersetzt.

### Vorwärts-Sprung-Schutz
`_oeffneSchritt` selbst hat KEINE Vorwärts-Validierung — der Schutz liegt
beim Caller:
- `_weiter()` ruft `_validiere()` zuerst, dann `_oeffneSchritt(WZ.schritt + 1)`
- `_wzZurueckZuSchritt(n)` validiert `target < WZ.schritt` (M³⁶ W7.4)

→ Direkte externe Aufrufe an `_oeffneSchritt(99)` würden Validation umgehen,
aber `_oeffneSchritt` ist nicht als `window.*` exportiert. Externer Zugriff
nur über die kontrollierten Caller möglich.

---

## Verify-Tests (M³⁷ A2)

`tests/wizard/m37-a2-oeffneschritt-verify.test.js` — 5 Tests:

1. `_oeffneSchritt` setzt `WZ.schritt = n` korrekt
2. `_oeffneSchritt` lässt `WZ.felder` unverändert (Datenerhalt)
3. `_oeffneSchritt` ersetzt `WZ.el` (alter Knoten weg, neuer erstellt)
4. `_zurueck` ruft `_sammleDaten()` VOR `_oeffneSchritt` auf
5. `_wzZurueckZuSchritt` ruft `_sammleDaten()` VOR `_oeffneSchritt` auf

---

## Acceptance

- ✅ Code-Lese-Audit ergibt kein Bug-Verhalten
- ✅ Daten-Persistenz garantiert via `_sammleDaten()`-Aufruf in allen Callern
- ✅ Vorwärts-/Rückwärts-Validierung an Caller-Seite (kein Skip möglich)
- ✅ Tests grün

**M³⁶-Risiko aus Sprint-Bericht damit ausgeschlossen.** Kein Patch nötig.

*— M³⁷ A2 Verify — 2026-05-08*
