/* ═══════════════════════════════════════════════════════════════════════
   PROVA — Widerrufsbelehrungs-Flow (§312g BGB / §356 Abs.3 BGB)
   widerrufs-flow.js

   Rechtsgrundlage:
   - §312g BGB: 14-tägiges Widerrufsrecht bei Fernabsatzverträgen mit
     Verbrauchern (§13 BGB)
   - §356 Abs. 3 BGB: Ohne korrekte Belehrung verlängert sich die
     Widerrufsfrist auf 12 Monate
   - Anlage 2 zu Art. 246a §1 Abs. 2 Satz 2 EGBGB: Muster-Widerrufsformular

   Verwendung:
   1. Automatisch eingebunden wenn auftragstyp.js Privatauftraggeber erkennt
   2. Checkbox im Auftragstyp-Dialog: "Ist Auftraggeber Verbraucher?"
   3. Bei Ja: Widerrufsbelehrung in Auftragsbestätigung + separater Brief

   API:
   - window.ProvaWiderruf.check(auftragstyp, auftraggeber) → boolean
   - window.ProvaWiderruf.getHTML(svDaten, auftragsDaten) → HTML-String
   - window.ProvaWiderruf.getBriefText(svDaten, auftragsDaten) → Fließtext
   - window.ProvaWiderruf.showDialog(auftragsDaten, callback) → öffnet Modal
   ═══════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  /* ── Prüfung: Ist Widerrufsrecht anwendbar? ──────────────────────────
     Verbraucher = natürliche Person die Vertrag zu privaten Zwecken
     schließt (§13 BGB). Betriebe, Firmen, Behörden, Gerichte = KEIN
     Widerrufsrecht (B2B).
  ──────────────────────────────────────────────────────────────────────── */

  function istVerbraucher(auftragstyp, auftraggeber) {
    // Auftragstypen die NIE Verbraucher-Aufträge sind:
    var b2b = [
      'gerichtsgutachten',
      'versicherungsgutachten',
      'schiedsgutachten'
    ];
    if (b2b.indexOf(auftragstyp) !== -1) return false;

    // Auftraggeber-Typ prüfen (aus Kontakt-Daten)
    if (auftraggeber) {
      var typ = (auftraggeber.typ || auftraggeber.type || '').toLowerCase();
      if (typ === 'gericht' || typ === 'versicherung' || typ === 'firma' ||
          typ === 'behoerde' || typ === 'anwalt') return false;
      // Firma im Namen → wahrscheinlich B2B
      var name = (auftraggeber.name || auftraggeber.firma || '').toLowerCase();
      if (name.indexOf(' gmbh') !== -1 || name.indexOf(' ag ') !== -1 ||
          name.indexOf(' kg ') !== -1 || name.indexOf(' gbr') !== -1 ||
          name.indexOf(' ohg') !== -1 || name.indexOf(' inc') !== -1) return false;
    }

    // Gutachten für Privatpersonen = potentiell Verbraucher
    var verbraucherTypen = [
      'privatgutachten',
      'beweissicherung',
      'kaufberatung',
      'sanierungsberatung',
      'bauherrenberatung'
    ];
    if (verbraucherTypen.indexOf(auftragstyp) !== -1) return true;

    // Unbekannt → konservativ: Verbraucher annehmen
    return true;
  }

  /* ── Widerrufsbelehrungs-Text ─────────────────────────────────────────
     Exakter Mustertext nach Anlage 1 zu Art. 246a §1 Abs. 2 Satz 2 EGBGB
  ──────────────────────────────────────────────────────────────────────── */

  function getWiderrufsbelehrungText(svDaten, auftragsDaten) {
    var svName    = svDaten.name    || '[Sachverständiger]';
    var svAdresse = svDaten.adresse || '[Adresse]';
    var svEmail   = svDaten.email   || '[E-Mail]';
    var svTelefon = svDaten.telefon || '[Telefon]';
    var auftrDatum = auftragsDaten.datum || new Date().toLocaleDateString('de-DE');
    var leistung   = auftragsDaten.leistung || 'Erstellung eines Sachverständigengutachtens';

    return [
      '════════════════════════════════════════════════════════════',
      'WIDERRUFSBELEHRUNG',
      '(gem. §312g BGB i.V.m. Art. 246a §1 Abs. 2 EGBGB)',
      '════════════════════════════════════════════════════════════',
      '',
      'Widerrufsrecht',
      '',
      'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von',
      'Gründen diesen Vertrag zu widerrufen.',
      '',
      'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des',
      'Vertragsabschlusses.',
      '',
      'Um Ihr Widerrufsrecht auszuüben, müssen Sie uns',
      '',
      '   ' + svName,
      '   ' + svAdresse,
      '   E-Mail: ' + svEmail,
      '   Tel: ' + svTelefon,
      '',
      'mittels einer eindeutigen Erklärung (z.B. ein mit der Post',
      'versandter Brief oder E-Mail) über Ihren Entschluss, diesen',
      'Vertrag zu widerrufen, informieren. Sie können dafür das',
      'beigefügte Muster-Widerrufsformular verwenden, das jedoch',
      'nicht vorgeschrieben ist.',
      '',
      'Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die',
      'Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf',
      'der Widerrufsfrist absenden.',
      '',
      '────────────────────────────────────────────────────────────',
      '',
      'Folgen des Widerrufs',
      '',
      'Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle',
      'Zahlungen, die wir von Ihnen erhalten haben, unverzüglich',
      'und spätestens binnen vierzehn Tagen ab dem Tag der Mitteilung',
      'über Ihren Widerruf zurückzuzahlen.',
      '',
      'Haben Sie verlangt, dass die Dienstleistung während der',
      'Widerrufsfrist beginnen soll, so haben Sie uns einen',
      'angemessenen Betrag zu zahlen, der dem Anteil der bis zu',
      'dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufs-',
      'rechts hinsichtlich dieses Vertrags unterrichten, bereits',
      'erbrachten Dienstleistungen im Vergleich zum Gesamtumfang',
      'der im Vertrag vorgesehenen Dienstleistungen entspricht.',
      '',
      '════════════════════════════════════════════════════════════',
      '',
      'MUSTER-WIDERRUFSFORMULAR',
      '',
      '(Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte',
      'dieses Formular aus und senden Sie es zurück.)',
      '',
      'An: ' + svName + ', ' + svAdresse,
      '    E-Mail: ' + svEmail,
      '',
      'Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*)',
      'abgeschlossenen Vertrag über die Erbringung der folgenden',
      'Dienstleistung (*):',
      '',
      '   ' + leistung,
      '',
      'Beauftragt am (*): ' + auftrDatum,
      '',
      'Name des/der Verbraucher(s):  ____________________________',
      '',
      'Anschrift des/der Verbraucher(s): ________________________',
      '',
      'Datum: ____________________________',
      '',
      '(*) Unzutreffendes bitte streichen.',
      '',
      '════════════════════════════════════════════════════════════'
    ].join('\n');
  }

  /* ── Vorzeitiger Leistungsbeginn ─────────────────────────────────────
     Wenn SV sofort beginnen soll (z.B. dringender Ortstermin),
     muss der Auftraggeber ausdrücklich bestätigen dass er auf das
     volle Widerrufsrecht verzichtet (§357 Abs. 8 BGB).
  ──────────────────────────────────────────────────────────────────────── */

  function getVorzeitigBeginnenText(leistung) {
    return [
      '════════════════════════════════════════════════════════════',
      'BESTÄTIGUNG DES VORZEITIGEN LEISTUNGSBEGINNS',
      '(gem. §357 Abs. 8 BGB)',
      '════════════════════════════════════════════════════════════',
      '',
      'Ich bitte ausdrücklich, dass Sie mit der Ausführung der',
      'Dienstleistung (' + (leistung || 'Sachverständigengutachten') + ')',
      'vor Ablauf der Widerrufsfrist beginnen.',
      '',
      'Mir ist bekannt, dass ich bei vollständiger Vertragserfüllung',
      'durch Sie mein Widerrufsrecht verliere.',
      '',
      '____________________________  ____________________________',
      'Datum                         Unterschrift Auftraggeber',
      '',
      '════════════════════════════════════════════════════════════'
    ].join('\n');
  }

  /* ── HTML-Version für Auftragsbestätigung ───────────────────────────── */

  function getWiderrufsbelehrungHTML(svDaten, auftragsDaten) {
    var svName    = svDaten.name    || '[Sachverständiger]';
    var svAdresse = svDaten.adresse || '[Adresse]';
    var svEmail   = svDaten.email   || '[E-Mail]';
    var svTelefon = svDaten.telefon || '[Telefon]';
    var auftrDatum = auftragsDaten.datum || new Date().toLocaleDateString('de-DE');
    var leistung   = auftragsDaten.leistung || 'Erstellung eines Sachverständigengutachtens';

    return `
      <div style="border:2px solid #4f8ef7;border-radius:12px;padding:20px 24px;margin:24px 0;font-size:13px;line-height:1.7;font-family:'DM Sans',system-ui,sans-serif;">
        <div style="font-size:15px;font-weight:800;color:#4f8ef7;margin-bottom:4px;">⚖️ Widerrufsbelehrung</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:16px;">gem. §312g BGB i.V.m. Art. 246a §1 Abs. 2 EGBGB</div>

        <p><strong>Widerrufsrecht</strong></p>
        <p style="margin:8px 0;">Sie haben das Recht, binnen <strong>vierzehn Tagen</strong> ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p>
        <p style="margin:8px 0;">Um Ihr Widerrufsrecht auszuüben, müssen Sie uns<br>
          <strong>${svName}</strong><br>
          ${svAdresse}<br>
          E-Mail: ${svEmail} · Tel: ${svTelefon}<br>
          mittels einer eindeutigen Erklärung über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.
        </p>
        <p style="margin:8px 0;">Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts <strong>vor Ablauf der Widerrufsfrist</strong> absenden.</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">

        <p><strong>Folgen des Widerrufs</strong></p>
        <p style="margin:8px 0;">Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag der Mitteilung über Ihren Widerruf zurückzuzahlen.</p>
        <p style="margin:8px 0;color:#f59e0b;"><strong>Hinweis bei vorzeitigem Leistungsbeginn:</strong> Haben Sie ausdrücklich verlangt, dass die Leistung vor Ablauf der Widerrufsfrist beginnt, schulden Sie uns bei einem Widerruf eine angemessene Vergütung für bereits erbrachte Leistungen.</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">

        <p><strong>Muster-Widerrufsformular</strong></p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-top:8px;font-size:12px;color:#374151;">
          An: ${svName}, ${svAdresse}, E-Mail: ${svEmail}<br><br>
          Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über:<br>
          <em>${leistung}</em><br><br>
          Beauftragt am: ${auftrDatum}<br><br>
          Name: _____________________ &nbsp;&nbsp; Datum: _____________________<br><br>
          Unterschrift: _____________________
        </div>
      </div>
    `;
  }

  /* ── Modal-Dialog ────────────────────────────────────────────────────
     Erscheint im Auftragstyp-Flow wenn Privatauftraggeber erkannt wird.
  ──────────────────────────────────────────────────────────────────────── */

  function showDialog(auftragsDaten, callback) {
    // Bereits vorhanden?
    var existing = document.getElementById('prova-widerruf-modal');
    if (existing) existing.remove();

    var svName    = localStorage.getItem('prova_sv_name')    || '';
    var svAdresse = localStorage.getItem('prova_sv_adresse') || '';
    var svEmail   = localStorage.getItem('prova_sv_email')   || '';
    var svTelefon = localStorage.getItem('prova_sv_telefon') || '';
    var svDaten = { name: svName, adresse: svAdresse, email: svEmail, telefon: svTelefon };

    var leistung = auftragsDaten.leistung ||
      (auftragsDaten.auftragstyp === 'kaufberatung' ? 'Kaufberatung vor Ort' :
       auftragsDaten.auftragstyp === 'privatgutachten' ? 'Erstellung eines Privatgutachtens' :
       'Sachverständigenleistung');

    var modal = document.createElement('div');
    modal.id = 'prova-widerruf-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);';

    modal.innerHTML = `
      <div style="background:var(--surface,#1c2130);border:1px solid var(--border2,rgba(255,255,255,.11));border-radius:18px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.6);">

        <div style="padding:20px 24px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));">
          <div style="font-size:16px;font-weight:800;color:var(--text,#eaecf4);margin-bottom:4px;">
            ⚖️ Widerrufsrecht — Privatauftraggeber erkannt
          </div>
          <div style="font-size:12px;color:var(--text3,#4d5568);">
            §312g BGB · Automatisch erkannt weil Auftraggeber Verbraucher ist
          </div>
        </div>

        <div style="padding:20px 24px;">
          <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:10px;padding:14px 16px;margin-bottom:16px;">
            <div style="font-size:13px;font-weight:700;color:#f59e0b;margin-bottom:6px;">⚠️ Rechtliche Pflicht</div>
            <div style="font-size:12px;color:var(--text2,#8b93ab);line-height:1.6;">
              Bei Verbraucher-Aufträgen gilt gesetzlich ein <strong>14-tägiges Widerrufsrecht</strong>.
              Ohne korrekte schriftliche Belehrung verlängert sich diese Frist auf <strong>12 Monate</strong> (§356 Abs. 3 BGB).
            </div>
          </div>

          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;">
            Bitte wählen Sie:
          </div>

          <label id="wb-opt-ja" style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg3,#161a22);cursor:pointer;margin-bottom:8px;transition:border-color .15s;">
            <input type="radio" name="wb-choice" value="ja" style="margin-top:2px;accent-color:var(--accent,#4f8ef7);" checked>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text);">Widerrufsbelehrung in Auftragsbestätigung einfügen</div>
              <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">Empfohlen · Gesetzlicher Standard · Muster-Widerrufsformular wird automatisch angehängt</div>
            </div>
          </label>

          <label id="wb-opt-sofort" style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg3,#161a22);cursor:pointer;margin-bottom:8px;transition:border-color .15s;">
            <input type="radio" name="wb-choice" value="sofort" style="margin-top:2px;accent-color:var(--accent,#4f8ef7);">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text);">Sofortiger Beginn — mit Zustimmungserklärung</div>
              <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">Auftraggeber bestätigt sofortigen Beginn · Bei Widerruf anteilige Vergütung fällig (§357 Abs. 8 BGB)</div>
            </div>
          </label>

          <label id="wb-opt-b2b" style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--bg3,#161a22);cursor:pointer;transition:border-color .15s;">
            <input type="radio" name="wb-choice" value="kein" style="margin-top:2px;accent-color:var(--accent,#4f8ef7);">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text);">Kein Widerrufsrecht — Auftraggeber ist Unternehmer</div>
              <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">Nur wenn Auftraggeber gewerblich handelt (B2B) · Manuelle Bestätigung</div>
            </div>
          </label>
        </div>

        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="document.getElementById('prova-widerruf-modal').remove();" style="padding:9px 18px;background:transparent;border:1px solid var(--border2);border-radius:9px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">
            Abbrechen
          </button>
          <button id="wb-weiter-btn" style="padding:9px 20px;background:var(--accent,#4f8ef7);border:none;border-radius:9px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">
            Übernehmen & Weiter →
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Radio-Button Styling
    modal.querySelectorAll('input[type=radio]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        modal.querySelectorAll('label[id^="wb-opt"]').forEach(function(lbl) {
          lbl.style.borderColor = 'var(--border)';
        });
        var parent = radio.closest('label');
        if (parent) parent.style.borderColor = 'var(--accent,#4f8ef7)';
      });
    });
    // Initial erstes als aktiv markieren
    var firstLabel = modal.querySelector('label[id="wb-opt-ja"]');
    if (firstLabel) firstLabel.style.borderColor = 'var(--accent,#4f8ef7)';

    // Weiter-Button
    var weiterBtn = modal.querySelector('#wb-weiter-btn');
    if (weiterBtn) {
      weiterBtn.addEventListener('click', function() {
        var selected = modal.querySelector('input[name="wb-choice"]:checked');
        var choice = selected ? selected.value : 'ja';
        modal.remove();

        var result = {
          choice: choice,
          belehrungText: choice !== 'kein' ? getWiderrufsbelehrungText(svDaten, { datum: new Date().toLocaleDateString('de-DE'), leistung: leistung }) : null,
          belehrungHTML: choice !== 'kein' ? getWiderrufsbelehrungHTML(svDaten, { datum: new Date().toLocaleDateString('de-DE'), leistung: leistung }) : null,
          vorzeitigText: choice === 'sofort' ? getVorzeitigBeginnenText(leistung) : null,
          requiresVerbraucherCheckbox: choice !== 'kein'
        };

        // In localStorage für diesen Fall speichern
        if (auftragsDaten.fallId || auftragsDaten.az) {
          var key = 'prova_widerruf_' + (auftragsDaten.fallId || auftragsDaten.az);
          localStorage.setItem(key, JSON.stringify({
            choice: choice,
            datum: new Date().toISOString(),
            leistung: leistung
          }));
        }

        if (typeof callback === 'function') callback(result);
      });
    }
  }

  /* ── Auftragsbestätigung-Integration ────────────────────────────────
     Fügt Widerrufsbelehrung automatisch ein wenn Auftragsbestätigung
     generiert wird und Verbraucher-Auftraggeber vorliegt.
  ──────────────────────────────────────────────────────────────────────── */

  function integriereInAuftragsbestaetigung(auftragstyp, auftraggeber, containerId) {
    if (!istVerbraucher(auftragstyp, auftraggeber)) return false;

    var container = document.getElementById(containerId);
    if (!container) return false;

    var svDaten = {
      name:     localStorage.getItem('prova_sv_name')    || '',
      adresse:  localStorage.getItem('prova_sv_adresse') || '',
      email:    localStorage.getItem('prova_sv_email')   || '',
      telefon:  localStorage.getItem('prova_sv_telefon') || ''
    };
    var auftragsDaten = {
      datum:    new Date().toLocaleDateString('de-DE'),
      leistung: auftragstyp === 'kaufberatung' ? 'Kaufberatung vor Ort' : 'Sachverständigenleistung'
    };

    container.innerHTML = getWiderrufsbelehrungHTML(svDaten, auftragsDaten);
    return true;
  }

  /* ── §§ Prüfung ob Belehrung für Fall bereits erteilt wurde ─────────── */

  function istBelehrungErteilt(fallId) {
    var key = 'prova_widerruf_' + fallId;
    var stored = localStorage.getItem(key);
    if (!stored) return false;
    try {
      var data = JSON.parse(stored);
      return data && (data.choice === 'ja' || data.choice === 'sofort' || data.choice === 'kein');
    } catch(e) { return false; }
  }

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.ProvaWiderruf = {
    check:         istVerbraucher,
    getHTML:       getWiderrufsbelehrungHTML,
    getText:       getWiderrufsbelehrungText,
    getVorzeitig:  getVorzeitigBeginnenText,
    showDialog:    showDialog,
    integrate:     integriereInAuftragsbestaetigung,
    istErteilt:    istBelehrungErteilt
  };

  /* ── Auto-Init: Auftragstyp-Dialog beobachten ─────────────────────────
     Wenn auftragstyp.js einen Fall anlegt, prüfen ob Widerrufsbelehrung
     notwendig ist und Dialog anbieten.
  ──────────────────────────────────────────────────────────────────────── */

  document.addEventListener('prova:fall-erstellt', function(e) {
    if (!e.detail) return;
    var auftragstyp  = e.detail.auftragstyp || '';
    var auftraggeber = e.detail.auftraggeber || {};
    var fallId       = e.detail.fallId || e.detail.az || '';

    // Bereits erteilt?
    if (fallId && istBelehrungErteilt(fallId)) return;

    if (istVerbraucher(auftragstyp, auftraggeber)) {
      // Kurz warten damit Fall-Anlage-UI abgeschlossen ist
      setTimeout(function() {
        showDialog(
          { auftragstyp: auftragstyp, fallId: fallId, leistung: e.detail.leistung || '' },
          function(result) {
            // Event-Dispatch damit auftragstyp.js die Belehrung in AB einfügen kann
            document.dispatchEvent(new CustomEvent('prova:widerruf-entschieden', {
              detail: { fallId: fallId, result: result }
            }));
          }
        );
      }, 500);
    }
  });

})();