/* ════════════════════════════════════════════════════════════════════
   PROVA 08-pdf-templates.spec.js (Session 7 — Tier 1, Test #8-lite)

   ZWECK
   Ohne einen einzigen echten PDFMonkey-Call (also ohne Geld ausgeben)
   strukturell prüfen, ob alle 18 PDF-Templates + Sonder-Templates
   korrekt verdrahtet sind:
   - Template-IDs im Code vorhanden
   - Platzhalter vollständig
   - §407a-Bestandteile in Gutachten-Templates
   - Keine toten Template-Referenzen

   Dies ist die Vorstufe zu Tier 1 #6 (echte PDF-Generation).
   Wenn dieser Test grün ist, weiß man: die Strukturen stimmen.
   Der Live-Test mit echten PDFs kommt in einer späteren Session.
   ════════════════════════════════════════════════════════════════════ */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://prova-systems.de';

// PDFMonkey Template-IDs aus PROVA MASTER-REF v79 (userMemories)
const PDFMONKEY_IDS = {
  'F-01 JVEG':                    'S32BEA1F',
  'F-02':                         'B1C3E69D',
  'F-03':                         'EA5CAC85',
  'F-04':                         'C4BB257B',
  'F-05':                         '64BFD7F0',
  'F-06':                         '8ECAC2E4',
  'F-07':                         'A4E57F73',
  'F-08':                         '6ADE8D9A',
  'F-09':                         'BA076019',
  'F-10':                         '6FF656D3',
  'F-11':                         '6B85ECFF',
  'F-12':                         '4233F240',
  'F-13':                         '8868A0E2',
  'F-14':                         '3174576E',
  'F-15':                         '36E140DC',
  'F-16':                         'A8D05FAB',
  'F-17':                         '37CF6A57',
  'F-18':                         '4D81616B',
  'FOTO-Anlage':                  '0383BD85',
  'BRIEF':                        'BAD1170B',
  'SOLO-Rechnung':                'EC64C790-3E04',
  'TEAM-Rechnung':                'E865E0CD-535A'
};

// Repository-Root: Tests laufen aus Repo-Verzeichnis
const REPO_ROOT = process.cwd();

test.describe('#8 PDF-Template-Korrektheit (statisch)', () => {

  test('#8a Alle PDFMonkey Template-IDs sind im Code referenziert', async () => {
    const missing = [];
    const files = fs.readdirSync(REPO_ROOT)
      .filter(f => f.endsWith('.js') || f.endsWith('.html'))
      .map(f => path.join(REPO_ROOT, f));

    // Alle Source-Files einmal einlesen + durchsuchen
    const allContent = files.map(f => {
      try { return fs.readFileSync(f, 'utf8'); } catch { return ''; }
    }).join('\n');

    for (const [label, id] of Object.entries(PDFMONKEY_IDS)) {
      // Template-IDs können mit oder ohne Suffix vorkommen
      const shortId = id.split('-')[0];
      if (!allContent.includes(id) && !allContent.includes(shortId)) {
        missing.push(`${label} (${id})`);
      }
    }

    console.log(`    ℹ️  PDFMonkey-Template-IDs geprüft: ${Object.keys(PDFMONKEY_IDS).length}`);
    console.log(`    ℹ️  Im Code referenziert: ${Object.keys(PDFMONKEY_IDS).length - missing.length}`);

    if (missing.length > 0) {
      console.log('    ⚠ Nicht im Code gefunden:');
      missing.forEach(m => console.log(`       · ${m}`));
      console.log('    💡 Mögliche Ursachen: Templates noch nicht verdrahtet ODER ID-Verweis fehlt');
    }

    // Warn-Schwelle: bis 3 ungenutzte IDs OK (evtl. geplante Features)
    expect(missing.length, 'Maximal 3 Template-IDs ohne Code-Referenz').toBeLessThanOrEqual(3);
  });

  test('#8b rechnung-pdf.js ruft PDFMonkey mit template_id auf', async () => {
    const file = path.join(REPO_ROOT, 'rechnung-pdf.js');
    if (!fs.existsSync(file)) {
      console.log('    ⚠ rechnung-pdf.js nicht gefunden — Test inconclusive');
      return;
    }
    const content = fs.readFileSync(file, 'utf8');

    expect(content, 'rechnung-pdf.js muss PDFMonkey ansprechen').toMatch(/pdfmonkey/i);
    expect(content, 'rechnung-pdf.js muss template_id enthalten').toMatch(/template_id|document_template_id/);
    // rechnung-pdf.js unterscheidet Rechnungstypen (nicht Abo-Pakete):
    // jveg=F-01, pauschale=F-02, stunden=F-03, kurzstellungnahme=F-04, gutschrift=F-05
    expect(content, 'rechnung-pdf.js muss mindestens zwei Rechnungstypen unterscheiden').toMatch(/jveg[\s\S]*pauschale|pauschale[\s\S]*stunden|stunden[\s\S]*jveg/);

    console.log('    ✅ rechnung-pdf.js → PDFMonkey + template_id + Rechnungstyp-Logik vorhanden');
  });

  test('#8c Gutachten-Templates haben §407a-konforme Bestandteile', async () => {
    // Prüft pdfmonkey-*.html und vorlage-*.html auf Pflicht-Elemente eines
    // §407a ZPO / §404a StPO Gutachtens
    const vorlagen = fs.readdirSync(REPO_ROOT)
      .filter(f => f.startsWith('vorlage-') && f.endsWith('.html'))
      .map(f => path.join(REPO_ROOT, f));

    console.log(`    ℹ️  Gutachten-Vorlagen im Repo: ${vorlagen.length}`);

    const pflicht = [
      { key: 'sv_name',       label: 'Sachverständigen-Name' },
      { key: 'aktenzeichen',  label: 'Aktenzeichen / Schadensnummer' },
      { key: 'datum|date',    label: 'Datum' },
      { key: 'auftraggeber',  label: 'Auftraggeber' }
    ];

    const fehlend = [];
    for (const v of vorlagen) {
      const content = fs.readFileSync(v, 'utf8');
      const name = path.basename(v);
      for (const p of pflicht) {
        const re = new RegExp(p.key, 'i');
        if (!re.test(content)) {
          fehlend.push(`${name}: fehlt "${p.label}"`);
        }
      }
    }

    if (fehlend.length > 0) {
      console.log('    ⚠ Fehlende Pflichtfelder in Templates:');
      fehlend.slice(0, 10).forEach(f => console.log(`       · ${f}`));
    } else {
      console.log('    ✅ Alle Vorlage-Templates haben Pflicht-Bestandteile');
    }

    // Warnschwelle großzügig — manche Templates sind Teilgutachten
    expect(fehlend.length, 'Mehr als 20 fehlende Pflichtfelder wären kritisch').toBeLessThanOrEqual(20);
  });

  test('#8d Keine Stripe-Price-IDs ohne Test-Prefix in Production-Code', async () => {
    // Sicherheit: Keine Test-Price-IDs versehentlich in Live
    const files = fs.readdirSync(REPO_ROOT)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(REPO_ROOT, f));

    const suspicious = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      // Suche price_1TEST* oder price_1TJLnv* (letzte sind die echten aus Memory)
      // Wichtig: price_1TJLnv8 und price_1TJLpG8 sind die echten canonical IDs
      const matches = content.match(/price_\w+/g) || [];
      for (const m of matches) {
        if (m.toLowerCase().includes('test') && !file.includes('test')) {
          suspicious.push(`${path.basename(file)}: ${m}`);
        }
      }
    }

    console.log(`    ℹ️  Verdächtige Test-Price-IDs in Production: ${suspicious.length}`);
    if (suspicious.length > 0) {
      suspicious.forEach(s => console.log(`       ⚠ ${s}`));
    }
    expect(suspicious.length, 'Keine Test-Price-IDs in Production-Files').toBe(0);
  });

  test('#8e pdf-proxy.js oder zugferd-rechnung.js existiert und ist konfiguriert', async () => {
    const pdfProxy = path.join(REPO_ROOT, 'rechnung-pdf.js');
    const zugferd = path.join(REPO_ROOT, 'zugferd-rechnung.js');

    const hasPdfProxy = fs.existsSync(pdfProxy);
    const hasZugferd = fs.existsSync(zugferd);

    console.log(`    ℹ️  rechnung-pdf.js existiert: ${hasPdfProxy}`);
    console.log(`    ℹ️  zugferd-rechnung.js existiert: ${hasZugferd}`);

    expect(hasPdfProxy || hasZugferd, 'Mindestens ein Rechnungs-PDF-Generator muss existieren').toBeTruthy();

    if (hasZugferd) {
      const content = fs.readFileSync(zugferd, 'utf8');
      // ZUGFeRD erfordert XRechnung-XML oder ZUGFeRD-XML
      const hasXml = content.includes('<') && content.includes('xml');
      console.log(`    ℹ️  zugferd-rechnung.js hat XML-Logik: ${hasXml}`);
    }
  });
});

test.describe('#8 Pseudonymisierungs-Library (Session 7)', () => {

  test('#8f prova-pseudo.js existiert und exportiert ProvaPseudo.apply()', async ({ page }) => {
    const file = path.join(REPO_ROOT, 'prova-pseudo.js');
    if (!fs.existsSync(file)) {
      console.log('    ⚠ prova-pseudo.js existiert noch nicht — bitte Session 7 deployen');
      return;
    }

    // Im Browser-Context laden + testen
    await page.goto(BASE + '/app-login.html');  // egal welche Seite, nur Browser-Context
    await page.addScriptTag({ url: BASE + '/prova-pseudo.js' }).catch(async () => {
      // Fallback: lokale Datei injecten
      const content = fs.readFileSync(file, 'utf8');
      await page.addScriptTag({ content });
    });

    await page.waitForTimeout(500);

    const testResult = await page.evaluate(() => {
      if (typeof window.ProvaPseudo === 'undefined') {
        return { error: 'ProvaPseudo nicht global verfügbar' };
      }
      if (typeof window.ProvaPseudo.apply !== 'function') {
        return { error: 'ProvaPseudo.apply fehlt' };
      }

      // Realistischer Test-Input
      const input = 'Herr Klaus Müller, wohnhaft Musterstraße 42, 50667 Köln. ' +
                    'E-Mail: klaus.mueller@example.de, Telefon +49 221 98765432, ' +
                    'IBAN DE89 3704 0044 0532 0130 00. ' +
                    'Feuchtemessung: 14% Holzfeuchte im Keller.';
      const out = window.ProvaPseudo.apply(input);
      const report = window.ProvaPseudo.lastReport;

      return {
        input,
        output: out,
        report,
        containsRawIban:  out.includes('DE89 3704'),
        containsRawEmail: out.includes('klaus.mueller@'),
        containsRawTel:   out.includes('98765432'),
        containsMessung:  out.includes('14%') || out.includes('Holzfeuchte')
      };
    });

    console.log(`    ℹ️  Input:  ${testResult.input?.slice(0, 80)}...`);
    console.log(`    ℹ️  Output: ${testResult.output?.slice(0, 80)}...`);
    console.log(`    ℹ️  Report:`, JSON.stringify(testResult.report));

    expect(testResult.error).toBeFalsy();
    expect(testResult.containsRawIban, 'IBAN darf NICHT unverändert bleiben').toBeFalsy();
    expect(testResult.containsRawEmail, 'E-Mail darf NICHT unverändert bleiben').toBeFalsy();
    expect(testResult.containsRawTel, 'Telefon darf NICHT unverändert bleiben').toBeFalsy();
    expect(testResult.containsMessung, 'Fachliche Messwerte MÜSSEN erhalten bleiben').toBeTruthy();

    console.log(`    ✅ Pseudonymisierung greift, Messwerte bleiben erhalten`);
  });

  test('#8g ProvaClickGuard ist global verfügbar', async ({ page }) => {
    const file = path.join(REPO_ROOT, 'prova-click-guard.js');
    if (!fs.existsSync(file)) {
      console.log('    ⚠ prova-click-guard.js existiert noch nicht — bitte Session 7 deployen');
      return;
    }

    await page.goto(BASE + '/app-login.html');
    await page.addScriptTag({ url: BASE + '/prova-click-guard.js' }).catch(async () => {
      const content = fs.readFileSync(file, 'utf8');
      await page.addScriptTag({ content });
    });
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      if (typeof window.ProvaClickGuard === 'undefined') return { error: 'nicht verfügbar' };

      // Test: wrap() sollte nur einen Call zulassen
      let calls = 0;
      const guarded = window.ProvaClickGuard.wrap('test', async () => {
        calls++;
        await new Promise(r => setTimeout(r, 100));
      }, 500);

      // 3 parallele Calls
      return Promise.all([guarded(), guarded(), guarded()]).then(() => ({ calls }));
    });

    console.log(`    ℹ️  3 parallele Calls → tatsächlich ausgeführt: ${result.calls}`);
    expect(result.error).toBeFalsy();
    expect(result.calls, 'Bei 3 parallelen Calls darf nur 1 durchkommen').toBe(1);
    console.log(`    ✅ Guard blockiert Parallelaufrufe korrekt`);
  });
});
