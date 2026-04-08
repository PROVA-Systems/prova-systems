/* ════════════════════════════════════════════════════════════
   PROVA stellungnahme-logic.js
   §6 Fachurteil — Komplette Logik
   Extrahiert aus stellungnahme.html
   §407a ZPO · Konjunktiv II · KI-Assist · Audit-Trail
════════════════════════════════════════════════════════════ */

'use strict';
/* ═══════════════════════════════════════════════════════
   PROVA §6 Fachurteil — Neue 2-Spalten-Version
   Gate + v3_1 konsolidiert · Progressive Disclosure
   §407a ZPO · Konjunktiv II · Audit-Trail
═══════════════════════════════════════════════════════ */

// AUTH
(function(){
  if(!localStorage.getItem('prova_user')) window.location.href='app-login.html';
})();

// STATE
let selectedTyp = localStorage.getItem('prova_gutachten_typ') || 'gericht';
let selectedWeg = localStorage.getItem('prova_stellungnahme_weg') || 'A';
let kiInspLoaded = false;
let kjTimer = null;
let ausformTimer = null;
let kiAnalyseData = null; // Guided Writing v3.1

// az aus URL-Parameter (von akte.html) oder sessionStorage
const _urlAz = new URLSearchParams(window.location.search).get('az') || '';
if(_urlAz) sessionStorage.setItem('prova_current_az', _urlAz);
const az = _urlAz || sessionStorage.getItem('prova_current_az') || localStorage.getItem('prova_letztes_az') || '—';
const sa = sessionStorage.getItem('prova_current_schadenart') || localStorage.getItem('prova_schadenart') || '—';
const obj = sessionStorage.getItem('prova_current_objekt') || '—';
const datum = sessionStorage.getItem('prova_current_datum') || '—';
const baujahr = sessionStorage.getItem('prova_current_baujahr') || localStorage.getItem('prova_baujahr') || '';
const rid = sessionStorage.getItem('prova_record_id') || '';

// ═══════════════════════════════════════════════════════
// GUIDED WRITING v3.1 — KI-Analyse-Box
// ═══════════════════════════════════════════════════════
async function ladeKIAnalyse() {
  const btn = document.getElementById('btnKIAnalyse');
  const content = document.getElementById('kiAnalyseContent');
  const loading = document.getElementById('kiAnalyseLoading');
  btn.disabled = true;
  btn.textContent = '⏳ Wird geladen…';
  loading.innerHTML = '<div style="padding:20px;text-align:center;"><div class="spinner" style="width:24px;height:24px;border:3px solid rgba(79,142,247,.2);border-top-color:#4f8ef7;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto 8px;"></div><div style="font-size:11px;color:var(--text3);">KI analysiert Ihren Fall…</div></div>';

  try {
    const diktat = localStorage.getItem('prova_transkript') || '';
    const messwerte = localStorage.getItem('prova_messwerte') || '';
    const entwurf = localStorage.getItem('prova_entwurf_text') || '';

    const res = await fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aufgabe: 'fachurteil_entwurf',
        diktat: diktat,
        schadenart: sa,
        messwerte: messwerte,
        verwendungszweck: selectedTyp,
        paragraphen: entwurf ? { gesamt: entwurf } : null,
        az: az,
        objekt: obj,
        baujahr: localStorage.getItem('prova_baujahr') || '',
        auftraggeber: localStorage.getItem('prova_auftraggeber_name') || ''
      })
    });

    const data = await res.json();
    kiAnalyseData = data;
    renderKIAnalyse(data);
    btn.textContent = '✅ Geladen';
    document.getElementById('btnKIToggle').style.display = '';
  } catch (err) {
    console.error('KI-Analyse Fehler:', err);
    loading.innerHTML = '<div style="padding:12px;color:var(--red);font-size:12px;">⚠️ Fehler beim Laden der Analyse. Bitte versuchen Sie es erneut.</div>';
    btn.disabled = false;
    btn.textContent = '↻ Erneut laden';
  }
}

function renderKIAnalyse(data) {
  const loading = document.getElementById('kiAnalyseLoading');
  loading.style.display = 'none';

  // Diktat zu kurz → Hinweis anzeigen
  if (data.hinweis === 'DIKTAT_ZU_KURZ') {
    loading.innerHTML = '<div style="padding:14px 16px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;font-size:12px;color:var(--warn);">'
      + '⚠️ <strong>Zu wenig Informationen im Diktat.</strong><br><br>'
      + 'Bitte ergänzen Sie im Diktat:<br>'
      + '• Genaue Lage und Ausdehnung des Schadens<br>'
      + '• Gemessene Feuchte- oder Temperaturwerte<br>'
      + '• Bauphase und Baujahr des Objekts<br>'
      + '• Nutzungsverhalten (sofern relevant)</div>';
    loading.style.display = 'block';
    return;
  }

  // Messwert-Analyse
  if (data.messwert_analyse && data.messwert_analyse.length > 0) {
    const box = document.getElementById('messwertAnalyse');
    const liste = document.getElementById('messwertListe');
    box.style.display = 'block';
    liste.innerHTML = data.messwert_analyse.map(m =>
      `<div style="padding:6px 0;border-bottom:1px solid var(--border);">
        <strong style="color:var(--text);">${m.messwert}</strong>
        <span style="color:var(--text3);"> → Grenzwert: ${m.grenzwert}</span>
        <span style="color:${m.bewertung && m.bewertung.includes('Überschreitung') ? 'var(--red)' : 'var(--green)'}; font-weight:600;"> ${m.bewertung}</span>
        <span style="font-size:10px;color:var(--text3);"> (${m.normreferenz})</span>
      </div>`
    ).join('');
  }

  // Ursachenkategorien
  if (data.ursachenkategorien && data.ursachenkategorien.length > 0) {
    const box = document.getElementById('ursachenBox');
    const liste = document.getElementById('ursachenListe');
    box.style.display = 'block';
    liste.innerHTML = data.ursachenkategorien.map((u, i) => {
      const color = u.plausibilitaet === 'hoch' ? 'var(--green)' : u.plausibilitaet === 'mittel' ? 'var(--warn)' : 'var(--text3)';
      return `<label style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--surface2);border-radius:8px;cursor:pointer;">
        <input type="checkbox" class="ursache-check" data-kategorie="${u.kategorie}" onchange="trackUrsacheWahl(this)" style="margin-top:2px;">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--text);">${u.kategorie}
            <span style="font-size:9px;padding:2px 6px;border-radius:4px;background:${color}20;color:${color};font-weight:700;margin-left:4px;">${u.plausibilitaet}</span>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">${u.begruendung}</div>
        </div>
      </label>`;
    }).join('');
  }

  // Diktat-Extrakte — NUR anzeigen wenn der SV tatsächlich etwas gesagt hat
  if (data.diktat_extrakte) {
    const de = data.diktat_extrakte;
    const box = document.getElementById('diktatExtrakte');
    const text = document.getElementById('diktatExtraktText');
    const hasFeststellungen = de.feststellungen && de.feststellungen.trim() && de.feststellungen.trim() !== 'leer';
    const hasUrsachen = de.hat_ursachen && de.ursachen_hinweise && de.ursachen_hinweise.trim();
    const hasEmpf = de.hat_empfehlungen && de.empfehlungen && de.empfehlungen.trim();
    
    if (hasFeststellungen || hasUrsachen || hasEmpf) {
      box.style.display = 'block';
      let html = '';
      if (hasFeststellungen) html += `<div style="margin-bottom:8px;padding:8px 10px;background:var(--surface2);border-radius:6px;"><span style="color:var(--accent);font-weight:600;font-size:11px;">FESTSTELLUNGEN:</span><br>${de.feststellungen}</div>`;
      if (hasUrsachen) html += `<div style="margin-bottom:8px;padding:8px 10px;background:var(--surface2);border-radius:6px;"><span style="color:var(--warn);font-weight:600;font-size:11px;">URSACHEN-HINWEISE (aus Ihrem Diktat):</span><br>${de.ursachen_hinweise}</div>`;
      if (hasEmpf) html += `<div style="padding:8px 10px;background:var(--surface2);border-radius:6px;"><span style="color:var(--green);font-weight:600;font-size:11px;">EMPFEHLUNGEN (aus Ihrem Diktat):</span><br>${de.empfehlungen}</div>`;
      if (!hasUrsachen && !hasEmpf) html += '';
      text.innerHTML = html;
    }
  }

  // Normen-Vorschläge aktualisieren
  if (data.normen_vorschlaege && data.normen_vorschlaege.length > 0) {
    const nl = document.getElementById('normenListe');
    nl.innerHTML = data.normen_vorschlaege.map(n =>
      `<div class="norm-item" onclick="insertPhrase('${n.klick_text.replace(/'/g, "\\'")}')">
        <strong>${n.norm}</strong>
        <span style="font-size:10px;color:var(--text3);display:block;">${n.relevanz}</span>
      </div>`
    ).join('');
  }
}

// Ursache-Wahl tracken
function trackUrsacheWahl(checkbox) {
  // Für KI_STATISTIK — wird beim Bestätigen gesammelt
}

// "Andere Ursache" Toggle
function toggleAndereUrsache() {
  const cb = document.getElementById('ursacheAndere');
  const input = document.getElementById('ursacheAndereText');
  input.disabled = !cb.checked;
  if (cb.checked) input.focus();
}

// KI-Analyse Box ein/ausklappen
function toggleKIBox() {
  const content = document.getElementById('kiAnalyseContent');
  const btn = document.getElementById('btnKIToggle');
  if (content.style.display === 'none') {
    content.style.display = '';
    btn.textContent = '▲ Einklappen';
  } else {
    content.style.display = 'none';
    btn.textContent = '▼ Ausklappen';
  }
}

// Ergänzungs-Diktat
function starteErgaenzungsDiktat() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Spracherkennung wird von Ihrem Browser nicht unterstützt. Bitte verwenden Sie Chrome.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.continuous = true;
  recognition.interimResults = true;

  const btn = document.getElementById('btnErgDiktat');
  btn.textContent = '🔴 Aufnahme läuft… (Klick = Stopp)';
  btn.style.background = 'rgba(239,68,68,.1)';
  btn.style.borderColor = 'rgba(239,68,68,.3)';
  btn.style.color = 'var(--red)';

  let transcript = '';

  recognition.onresult = function(e) {
    transcript = '';
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
  };

  recognition.onend = function() {
    btn.textContent = '🎙️ Ergänzung diktieren';
    btn.style.background = 'rgba(16,185,129,.08)';
    btn.style.borderColor = 'rgba(16,185,129,.2)';
    btn.style.color = 'var(--green)';

    if (transcript.trim()) {
      // In aktuelles Textfeld einfügen
      const ta = selectedWeg === 'A' ? document.getElementById('svTextA') : null;
      if (ta) {
        const pos = ta.selectionStart || ta.value.length;
        ta.value = ta.value.substring(0, pos) + ' ' + transcript.trim() + ' ' + ta.value.substring(pos);
        onInputA();
        zeigToast('Diktat eingefügt ✅', 'ok');
      }
    }
  };

  btn.onclick = function() { recognition.stop(); };
  recognition.start();
}

// Eigenleistung-Fortschrittsbalken aktualisieren
function updateEigenleistung(len) {
  const count = document.getElementById('eigenleistungCount');
  const fill = document.getElementById('eigenleistungFill');
  const pct = Math.min(100, (len / 700) * 100);
  const color = len >= 700 ? 'var(--green)' : len >= 250 ? 'var(--warn)' : 'var(--red)';

  count.textContent = `${len} / 700 Zeichen`;
  count.style.color = color;
  fill.style.width = pct + '%';
  fill.style.background = color;
}

// §7 Offenlegungstexte
const OFFENLEGUNG = {
  gericht:`Dieses Gutachten wurde unter Zuhilfenahme des digitalen Assistenzsystems PROVA Systems erstellt. Das System wurde zur strukturellen Aufbereitung der vom Sachverständigen erhobenen Daten (§1–§5), zur formalen Textgestaltung sowie zur Sicherstellung der normgerechten Fachsprache (insb. Konjunktiv-Prüfung in §6) eingesetzt. Die fachliche Datenerhebung, die Kausalitätsprüfung sowie die abschließende Bewertung in §6 erfolgten ausschließlich durch den Sachverständigen persönlich. Die KI-Nutzung wird hiermit gemäß §407a Abs. 3 ZPO offengelegt. Gemäß EU AI Act (Verordnung (EU) 2024/1689): KI-gestützt erstellt, geprüft und verantwortet durch den unterzeichnenden Sachverständigen.`,
  versicherung:`Die Erstellung dieses Gutachtens erfolgte unter Einsatz des digitalen Assistenzsystems PROVA Systems (KI-gestützte Strukturierung §1–§5, Konjunktiv-Prüfung §6). Das Fachurteil in §6 wurde eigenständig vom Sachverständigen erstellt. KI-gestützt erstellt, geprüft und verantwortet durch den unterzeichnenden Sachverständigen (EU AI Act).`,
  privat:`Erstellt mit PROVA Systems (KI-Assistenz §1–§5). §6 Fachurteil: eigenständige Leistung des Sachverständigen. KI-gestützt erstellt, geprüft und verantwortet durch den unterzeichnenden Sachverständigen (EU AI Act).`
};

// KJ2 Verbotsliste — erweitert, alle typischen SV-Indikativ-Muster
const INDIK_BAD = [
  /* KJ2-CHECKER v3.0 — Rechtsgrundlage:
     §407a ZPO, §839a BGB, IFS Sachverständigen-Merkblatt,
     BGH §286 ZPO (Vollbeweis = Richteraufgabe)
     KERN-REGEL: SV formuliert Wahrscheinlichkeiten — kein Vollbeweis im Indikativ.
     ERLAUBT im Indikativ: Messwerte, Sichtbefunde, Laborergebnisse.
     VERBOTEN: Kausalaussagen, Wertungen, Schuldzuweisungen, Prognosen im Indikativ.
     TECHNISCH: [^.!?]{0,120} erfasst dt. Satzklammer (Hilfsverb…Partizip). */

  // ═══ KATEGORIE 1: GEWISSHEITSAUSSAGEN — absolut verboten ═══
  {rx:/\bsicher\b/gi,            sev:'HOCH', h:'"sicher" → VERBOTEN (§407a ZPO) → "naheliegend", "wahrscheinlich"'},
  {rx:/\bzweifelsfrei\b/gi,      sev:'HOCH', h:'"zweifelsfrei" → VERBOTEN → "mit hoher Wahrscheinlichkeit"'},
  {rx:/\bzweifelsohne\b/gi,      sev:'HOCH', h:'"zweifelsohne" → VERBOTEN → "naheliegend"'},
  {rx:/\bunzweifelhaft\b/gi,     sev:'HOCH', h:'"unzweifelhaft" → VERBOTEN → "mit überwiegender Wahrscheinlichkeit"'},
  {rx:/\bmit\s+Sicherheit\b/gi,  sev:'HOCH', h:'"mit Sicherheit" → Richterformulierung → "mit hoher Wahrscheinlichkeit"'},
  {rx:/\bohne\s+(jeden\s+)?Zweifel\b/gi, sev:'HOCH', h:'"ohne Zweifel" → VERBOTEN → "mit überwiegender Wahrscheinlichkeit"'},
  {rx:/\bsteht\s+fest\b/gi,      sev:'HOCH', h:'"steht fest" → Richtersprache → "erscheint naheliegend"'},
  {rx:/\bliegt\s+auf\s+der\s+Hand\b/gi, sev:'HOCH', h:'"liegt auf der Hand" → VERBOTEN → "erscheint naheliegend"'},
  {rx:/\bist\s+(damit\s+)?(bewiesen|belegt|nachgewiesen|gesichert)\b/gi, sev:'HOCH', h:'"ist bewiesen/belegt/nachgewiesen" → VERBOTEN → "erscheint naheliegend"'},
  {rx:/\bist\s+erwiesen\b/gi,    sev:'HOCH', h:'"ist erwiesen" → VERBOTEN → "erscheint hinreichend belegt"'},
  {rx:/\bgilt\s+als\s+(erwiesen|belegt|bewiesen|gesichert|nachgewiesen)\b/gi, sev:'HOCH', h:'"gilt als erwiesen" → VERBOTEN → "erscheint hinreichend belegt"'},
  {rx:/\beindeutig\s+(fest)?gestellt\b/gi, sev:'HOCH', h:'"eindeutig festgestellt" → VERBOTEN → "festgestellt werden konnte"'},
  {rx:/\bist\s+(eindeutig|offensichtlich|offenbar|klar|zwingend|unbestreitbar)\b/gi, sev:'HOCH', h:'"ist eindeutig/offensichtlich/klar" → VERBOTEN → "erscheint naheliegend"'},
  {rx:/\bmit\s+an\s+Sicherheit\s+grenzender\s+Wahrscheinlichkeit\b/gi, sev:'HOCH', h:'"mit an Sicherheit grenzender Wahrscheinlichkeit" → NUR Richterformel (BGH §286 ZPO) → "mit hoher Wahrscheinlichkeit"'},
  {rx:/\bist\s+unstreitig\b/gi,  sev:'HOCH', h:'"ist unstreitig" → Richtersprache → "erscheint unbestritten"'},
  {rx:/\bist\s+zwingend\b/gi,    sev:'HOCH', h:'"ist zwingend" → VERBOTEN → "erscheint naheliegend"'},
  {rx:/\bist\s+klar\b/gi,        sev:'HOCH', h:'"ist klar" → VERBOTEN → "erscheint naheliegend"'},
  {rx:/\bnachweislich\b/gi,      sev:'HOCH', h:'"nachweislich" → impliziert Beweis → "nach den Feststellungen"'},
  {rx:/\berwiesenermaßen\b/gi,   sev:'HOCH', h:'"erwiesenermaßen" → VERBOTEN → "nach den vorliegenden Befunden"'},
  {rx:/\bdefinitiv\b/gi,         sev:'HOCH', h:'"definitiv" → VERBOTEN → "mit hoher Wahrscheinlichkeit"'},
  {rx:/\boffensichtlich\b/gi,    sev:'MITTEL', h:'"offensichtlich" → nur bei Sichtbefunden zulässig, nicht bei Kausalaussagen → "naheliegenderweise"'},
  {rx:/\baugenscheinlich\b/gi,   sev:'MITTEL', h:'"augenscheinlich" → nur bei Sichtbefunden zulässig, nicht bei Kausalaussagen'},
  {rx:/\btatsächlich\b/gi,       sev:'MITTEL', h:'"tatsächlich" → suggeriert Gewissheit → nur bei direkt gemessenen Fakten zulässig'},
  {rx:/\bohne\s+Weiteres\b/gi,   sev:'MITTEL', h:'"ohne Weiteres" → impliziert Selbstverständlichkeit → "nach den festgestellten Befunden"'},
  {rx:/\bes\s+steht\s+fest\s*,?\s*dass\b/gi, sev:'HOCH', h:'"Es steht fest, dass" → VERBOTEN — Richtersprache → "Es erscheint naheliegend, dass"'},

  // ═══ KATEGORIE 2: KAUSALAUSSAGEN IM INDIKATIV ═══
  // SATZKLAMMER: hat/haben + [beliebige Satzglieder] + Partizip
  {rx:/\bhat\b[^.!?]{0,120}\bbeigetragen\b/gi,   sev:'HOCH', h:'"hat … beigetragen" → Kausalindikativ → "dürfte … beigetragen haben"'},
  {rx:/\bhaben\b[^.!?]{0,120}\bbeigetragen\b/gi,  sev:'HOCH', h:'"haben … beigetragen" → Kausalindikativ → "dürften … beigetragen haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bgeführt\b/gi,        sev:'HOCH', h:'"hat … geführt" → Kausalindikativ → "dürfte … geführt haben"'},
  {rx:/\bhaben\b[^.!?]{0,120}\bgeführt\b/gi,      sev:'HOCH', h:'"haben … geführt" → Kausalindikativ → "dürften … geführt haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bverursacht\b/gi,     sev:'HOCH', h:'"hat … verursacht" → Kausalindikativ → "dürfte … verursacht haben"'},
  {rx:/\bhaben\b[^.!?]{0,120}\bverursacht\b/gi,   sev:'HOCH', h:'"haben … verursacht" → Kausalindikativ → "dürften … verursacht haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bausgelöst\b/gi,      sev:'HOCH', h:'"hat … ausgelöst" → Kausalindikativ → "dürfte … ausgelöst haben"'},
  {rx:/\bhaben\b[^.!?]{0,120}\bausgelöst\b/gi,    sev:'HOCH', h:'"haben … ausgelöst" → Kausalindikativ → "dürften … ausgelöst haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bbegünstigt\b/gi,     sev:'HOCH', h:'"hat … begünstigt" → Kausalindikativ → "dürfte … begünstigt haben"'},
  {rx:/\bhaben\b[^.!?]{0,120}\bbegünstigt\b/gi,   sev:'HOCH', h:'"haben … begünstigt" → Kausalindikativ → "dürften … begünstigt haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bbewirkt\b/gi,        sev:'HOCH', h:'"hat … bewirkt" → Kausalindikativ → "dürfte … bewirkt haben"'},
  {rx:/\bhaben\b[^.!?]{0,120}\bbewirkt\b/gi,      sev:'HOCH', h:'"haben … bewirkt" → Kausalindikativ → "dürften … bewirkt haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bherbeigeführt\b/gi,  sev:'HOCH', h:'"hat … herbeigeführt" → Kausalindikativ → "dürfte … herbeigeführt haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bermöglicht\b/gi,     sev:'MITTEL', h:'"hat … ermöglicht" → Kausalindikativ → "dürfte … ermöglicht haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bverstärkt\b/gi,      sev:'MITTEL', h:'"hat … verstärkt" → Kausalindikativ → "dürfte … verstärkt haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bbeschleunigt\b/gi,   sev:'MITTEL', h:'"hat … beschleunigt" → Kausalindikativ → "dürfte … beschleunigt haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bverschuldet\b/gi,    sev:'HOCH', h:'"hat … verschuldet" → Schuldzuweisung → "dürfte … beigetragen haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bversäumt\b/gi,       sev:'HOCH', h:'"hat … versäumt" → Schuldzuweisung → "wurde … nicht durchgeführt"'},
  {rx:/\bhat\b[^.!?]{0,120}\bvernachlässigt\b/gi, sev:'HOCH', h:'"hat … vernachlässigt" → Schuldzuweisung → "dürfte … nicht ausreichend berücksichtigt haben"'},
  {rx:/\bhaben\b[^.!?]{0,120}\bvernachlässigt\b/gi, sev:'HOCH', h:'"haben … vernachlässigt" → Schuldzuweisung → "dürften … nicht ausreichend berücksichtigt haben"'},
  {rx:/\bhat\b[^.!?]{0,120}\bmissachtet\b/gi,     sev:'HOCH', h:'"hat … missachtet" → Schuldzuweisung → "dürfte … nicht berücksichtigt haben"'},
  {rx:/\bhätte\b[^.!?]{0,100}\bmüssen\b/gi,       sev:'MITTEL', h:'"hätte … müssen" → impliziert Pflichtverstoß — Rechtswertung ist Richteraufgabe → nur Befunde beschreiben'},
  {rx:/\btrug\b[^.!?]{0,80}\bbei\b/gi,            sev:'HOCH', h:'"trug … bei" → Kausalindikativ → "dürfte … beigetragen haben"'},
  // Präsens-Kausalaussagen
  {rx:/\bist\s+zurückzuführen\b/gi,    sev:'HOCH', h:'"ist zurückzuführen" → Kausalindikativ → "dürfte zurückzuführen sein"'},
  {rx:/\blässt\s+sich\s+zurückführen\b/gi, sev:'MITTEL', h:'"lässt sich zurückführen" → besser: "dürfte zurückzuführen sein"'},
  {rx:/\bführt\s+zu\b/gi,              sev:'HOCH', h:'"führt zu" → Kausalindikativ → "könnte zu … führen"'},
  {rx:/\bführte\s+zu\b/gi,             sev:'HOCH', h:'"führte zu" → Kausalindikativ → "dürfte geführt haben zu"'},
  {rx:/\bberuht\s+auf\b/gi,            sev:'HOCH', h:'"beruht auf" → Kausalindikativ → "dürfte beruhen auf"'},
  {rx:/\bbasiert\s+auf\b/gi,           sev:'MITTEL', h:'"basiert auf" → Kausalindikativ → "dürfte basieren auf"'},
  {rx:/\bresultiert\s+(aus|daraus)\b/gi, sev:'HOCH', h:'"resultiert aus" → Kausalindikativ → "dürfte resultieren aus"'},
  {rx:/\bresultierte\s+(aus|daraus)\b/gi, sev:'HOCH', h:'"resultierte aus" → Kausalindikativ → "dürfte resultiert haben aus"'},
  {rx:/\bbewirkt\b/gi,                 sev:'HOCH', h:'"bewirkt" → Kausalindikativ → "dürfte bewirken"'},
  {rx:/\bbewirkte\b/gi,                sev:'HOCH', h:'"bewirkte" → Kausalindikativ → "dürfte bewirkt haben"'},
  {rx:/\blöst\s+aus\b/gi,              sev:'HOCH', h:'"löst aus" → Kausalindikativ → "dürfte auslösen"'},
  {rx:/\blöste\s+aus\b/gi,             sev:'HOCH', h:'"löste aus" → Kausalindikativ → "dürfte ausgelöst haben"'},
  {rx:/\bgeht\s+zurück\s+auf\b/gi,    sev:'HOCH', h:'"geht zurück auf" → Kausalindikativ → "dürfte zurückzuführen sein auf"'},
  {rx:/\bging\s+zurück\s+auf\b/gi,    sev:'HOCH', h:'"ging zurück auf" → Kausalindikativ → "dürfte zurückzuführen sein auf"'},
  {rx:/\bliegt\s+(die\s+)?(Ursache|Grund|Auslöser|Fehler|Mangel|Ursächlichkeit)\b/gi, sev:'HOCH', h:'"liegt die Ursache/der Grund" → Kausalindikativ → "dürfte die Ursache liegen"'},
  {rx:/\bliegt\s+darin\b/gi,           sev:'HOCH', h:'"liegt darin" → Indikativ → "dürfte darin liegen"'},
  {rx:/\bliegt\s+daran\b/gi,           sev:'HOCH', h:'"liegt daran" → Indikativ → "dürfte daran liegen"'},
  {rx:/\bist\s+(die\s+)?(Ursache|Schadensursache|Grund|Auslöser)\b/gi, sev:'HOCH', h:'"ist die Ursache/der Grund" → Kausalindikativ → "dürfte die Ursache sein"'},
  {rx:/\bwar\s+(die\s+)?(Ursache|ursächlich|kausal)\b/gi, sev:'HOCH', h:'"war die Ursache/ursächlich" → Kausalindikativ → "dürfte ursächlich gewesen sein"'},
  {rx:/\bist\s+(kausal|ursächlich|mitursächlich|mitverantwortlich)\b/gi, sev:'HOCH', h:'"ist kausal/ursächlich/mitursächlich" → Kausalindikativ → "dürfte … sein"'},
  {rx:/\bist\s+(die\s+)?Folge\b/gi,   sev:'HOCH', h:'"ist die Folge" → Kausalindikativ → "dürfte die Folge sein"'},
  {rx:/\bist\s+zu\s+suchen\b/gi,      sev:'HOCH', h:'"ist zu suchen" → Kausalindikativ → "dürfte zu suchen sein"'},
  {rx:/\bist\s+damit\s+(erklärt|begründet)\b/gi, sev:'HOCH', h:'"ist damit erklärt/begründet" → Kausalindikativ → "ließe sich damit erklären"'},
  {rx:/\berklärt\s+sich\b/gi,          sev:'HOCH', h:'"erklärt sich" → Kausalindikativ → "ließe sich erklären durch"'},
  {rx:/\bzeigt\s*,?\s*dass\b/gi,       sev:'MITTEL', h:'"zeigt, dass" → impliziert Beweis → "legt nahe, dass"'},
  {rx:/\bzeigt\s+sich\s*,?\s*dass\b/gi, sev:'MITTEL', h:'"zeigt sich, dass" → "ließe sich erkennen, dass"'},
  {rx:/\bbeweist\b/gi,                 sev:'HOCH', h:'"beweist" → VERBOTEN — Beweisführung ist Aufgabe des Gerichts → "legt nahe"'},
  {rx:/\bbelegt\s*,?\s*dass\b/gi,      sev:'MITTEL', h:'"belegt, dass" → suggeriert Beweis → "legt nahe, dass"'},
  {rx:/\bfolgt\s+(daraus|hieraus)\b/gi, sev:'HOCH', h:'"folgt daraus" → Kausalindikativ → "ließe sich daraus ableiten"'},
  {rx:/\bergibt\s+sich\s+(daraus|hieraus)\b/gi, sev:'HOCH', h:'"ergibt sich daraus" → Kausalindikativ → "ließe sich daraus schließen"'},
  {rx:/\bwurde\s+verursacht\s+durch\b/gi, sev:'HOCH', h:'"wurde verursacht durch" → Kausalindikativ → "dürfte verursacht worden sein durch"'},
  {rx:/\bist\s+entstanden\s+(durch|infolge)\b/gi, sev:'HOCH', h:'"ist entstanden durch" → Kausalindikativ → "dürfte entstanden sein durch"'},
  {rx:/\bentstand\s+(durch|infolge|wegen)\b/gi, sev:'HOCH', h:'"entstand durch" → Kausalindikativ → "dürfte entstanden sein durch"'},

  // ═══ KATEGORIE 3: SCHULD- UND VERANTWORTUNGSZUWEISUNGEN ═══
  {rx:/\bist\s+(allein\s+)?verantwortlich\s+für\b/gi, sev:'HOCH', h:'"ist verantwortlich für" → Schuldzuweisung durch SV unzulässig → "dürfte mitursächlich sein für"'},
  {rx:/\bist\s+schuld\b/gi,            sev:'HOCH', h:'"ist schuld" → Schuldzuweisung — nicht Aufgabe des SV → "erscheint mitursächlich"'},
  {rx:/\bhat\s+schuldhaft\b/gi,        sev:'HOCH', h:'"hat schuldhaft" → Schuldzuweisung → "scheint schuldhaft gehandelt zu haben"'},
  {rx:/\bhat\s+fahrlässig\b/gi,        sev:'HOCH', h:'"hat fahrlässig" → Rechtsbegriff — Schuldzuweisung → "scheint fahrlässig gehandelt zu haben"'},
  {rx:/\bgrob\s+fahrlässig\b/gi,       sev:'HOCH', h:'"grob fahrlässig" → rechtliche Wertung VERBOTEN → "dürfte eine erhebliche Abweichung … darstellen"'},
  {rx:/\bvorsätzlich\b/gi,             sev:'HOCH', h:'"vorsätzlich" → strafrechtlicher Begriff VERBOTEN → Befunde beschreiben'},
  {rx:/\bhat\b[^.!?]{0,80}\bgegen\s+(die\s+)?(DIN|VOB|WTA|Norm|Vorschrift|Regel)\b/gi, sev:'HOCH', h:'"hat gegen DIN/Norm verstoßen" → Rechtswertung → "entspricht nicht den Anforderungen der …"'},
  {rx:/\bVerstoß\s+gegen\b/gi,         sev:'MITTEL', h:'"Verstoß gegen" → rechtliche Wertung → "entspricht nicht … / weicht ab von …"'},
  {rx:/\bunterlassen\b/gi,             sev:'MITTEL', h:'"unterlassen" → impliziert Pflichtversäumnis → "wurde … nicht ausgeführt"'},

  // ═══ KATEGORIE 4: DIREKTIVE EMPFEHLUNGEN IM INDIKATIV ═══
  {rx:/\bwird\s+empfohlen\b/gi,        sev:'HOCH', h:'"wird empfohlen" → Direktive im Indikativ → "wäre zu empfehlen"'},
  {rx:/\bempfehle\s+ich\b/gi,          sev:'MITTEL', h:'"empfehle ich" → Direktive 1. Person → "wäre zu empfehlen" (objektiver)'},
  {rx:/\bwird\s+geraten\b/gi,          sev:'MITTEL', h:'"wird geraten" → Direktive im Indikativ → "wäre zu empfehlen"'},
  {rx:/\bist\s+anzuordnen\b/gi,        sev:'HOCH', h:'"ist anzuordnen" → Anordnung durch SV unzulässig — Richteraufgabe → "wäre zu empfehlen"'},
  {rx:/\bist\s+anzuweisen\b/gi,        sev:'HOCH', h:'"ist anzuweisen" → Anweisung durch SV unzulässig → "wäre zu empfehlen"'},
  {rx:/\bist\s+durchzuführen\b/gi,     sev:'HOCH', h:'"ist durchzuführen" → Direktive im Indikativ → "wäre durchzuführen"'},
  {rx:/\bist\s+umzusetzen\b/gi,        sev:'HOCH', h:'"ist umzusetzen" → Direktive im Indikativ → "wäre umzusetzen"'},
  {rx:/\bist\s+vorzunehmen\b/gi,       sev:'HOCH', h:'"ist vorzunehmen" → Direktive im Indikativ → "wäre vorzunehmen"'},
  {rx:/\bist\s+herzustellen\b/gi,      sev:'MITTEL', h:'"ist herzustellen" → Direktive im Indikativ → "wäre herzustellen"'},
  {rx:/\bist\s+zu\s+(erneuern|sanieren|beheben|prüfen|reparieren|ersetzen|beseitigen|abdichten|trockenleg|reinigen|entfernen|trocknen)\b/gi, sev:'MITTEL', h:'"ist zu sanieren/erneuern/beheben/prüfen" → Direktive Indikativ → "wäre zu sanieren/erneuern"'},
  {rx:/\bmuss\s+(sofort|unverzüglich|umgehend|zwingend)\b/gi, sev:'HOCH', h:'"muss sofort/unverzüglich" → Anordnung durch SV → "wäre unverzüglich … zu empfehlen"'},
  {rx:/\bist\s+(sofort|unverzüglich|umgehend)\b/gi, sev:'MITTEL', h:'"ist sofort/unverzüglich" → Direktive → "wäre unverzüglich … zu empfehlen"'},

  // ═══ KATEGORIE 5: BEWERTUNGSAUSSAGEN IM INDIKATIV ═══
  {rx:/\bist\s+(dringend\s+)?erforderlich\b/gi, sev:'MITTEL', h:'"ist erforderlich" → Indikativ → "wäre erforderlich"'},
  {rx:/\bist\s+(unbedingt\s+)?notwendig\b/gi, sev:'MITTEL', h:'"ist notwendig" → Indikativ → "wäre notwendig"'},
  {rx:/\bist\s+geboten\b/gi,           sev:'MITTEL', h:'"ist geboten" → Indikativ → "wäre geboten"'},
  {rx:/\bmuss\s+[a-zäöüß]/gi,          sev:'MITTEL', h:'"muss …" → Indikativ → "wäre zu … / sollte …"'},
  {rx:/\bmüssen\s+[a-zäöüß]/gi,        sev:'MITTEL', h:'"müssen …" → Indikativ → "wären zu …"'},
  {rx:/\bsollte\s+unverzüglich\b/gi,   sev:'MITTEL', h:'"sollte unverzüglich" → "wäre unverzüglich zu empfehlen"'},
  {rx:/\bist\s+(mangelhaft|fehlerhaft|defekt|beschädigt|unzureichend|ungenügend|schadhaft)\b/gi, sev:'MITTEL', h:'"ist mangelhaft/fehlerhaft/unzureichend" → Wertungs-Indikativ → "erscheint mangelhaft" / "dürfte mangelhaft sein"'},
  {rx:/\bist\s+(nicht\s+)?(norm|DIN|VOB|WTA|regelwerk)gerecht\b/gi, sev:'MITTEL', h:'"ist nicht normgerecht" → Wertung → "erscheint nicht normgerecht gem. …"'},
  {rx:/\bist\s+normwidrig\b/gi,        sev:'MITTEL', h:'"ist normwidrig" → Wertung → "erscheint nicht konform mit …"'},
  {rx:/\bist\s+einwandfrei\b/gi,       sev:'MITTEL', h:'"ist einwandfrei" → absolute Wertung → "erscheint nach den Befunden einwandfrei"'},
  {rx:/\bist\s+ordnungsgemäß\b/gi,     sev:'MITTEL', h:'"ist ordnungsgemäß" → rechtliche Wertung → "erscheint ordnungsgemäß ausgeführt"'},

  // ═══ KATEGORIE 6: PROGNOSEN IM INDIKATIV ═══
  {rx:/\bwird\s+(zu\s+)?(Schäden|Folgeschäden|Feuchte|Schimmel|Schimmelbildung|Korrosion|Substanzverlust)\b/gi, sev:'MITTEL', h:'"wird zu Schäden/Schimmel" → Prognoseindikativ → "könnte zu … führen"'},
  {rx:/\bbesteht\s+(die\s+)?(Gefahr|Risiko|Möglichkeit|Wahrscheinlichkeit)\b/gi, sev:'MITTEL', h:'"besteht Gefahr/Risiko" → Indikativ → "bestünde die Gefahr"'},
  {rx:/\bkann\s+[^.!?]{0,60}\bführen\b/gi, sev:'MITTEL', h:'"kann zu … führen" → "könnte zu … führen"'},
  {rx:/\bwird\s+sich\s+(ausbreiten|fortschreiten|verschlechtern|zunehmen|vergrößern|verstärken)\b/gi, sev:'MITTEL', h:'"wird sich ausbreiten/verschlechtern" → Prognoseindikativ → "könnte sich ausbreiten"'},
  {rx:/\bist\s+zu\s+erwarten\b/gi,     sev:'MITTEL', h:'"ist zu erwarten" → Prognoseindikativ → "wäre zu erwarten"'},
  {rx:/\bwird\s+(langfristig|mittelfristig|kurzfristig|absehbar)\b/gi, sev:'MITTEL', h:'"wird langfristig/mittelfristig" → Prognoseindikativ → "könnte langfristig …"'},
  {rx:/\bwird\s+eintreten\b/gi,        sev:'HOCH', h:'"wird eintreten" → absolute Prognose → "könnte eintreten"'},
  {rx:/\bist\s+unausweichlich\b/gi,    sev:'HOCH', h:'"ist unausweichlich" → absolute Prognose → "erscheint wahrscheinlich"'},

  // ═══ KATEGORIE 7: FAZIT- UND ZUSAMMENFASSUNGS-VERSTÖSSE ═══
  {rx:/\bals\s+(Ursache|Auslöser)\s+gilt\b/gi, sev:'HOCH', h:'"gilt als Ursache/Auslöser" → "dürfte als Ursache in Betracht kommen"'},
  {rx:/\bzusammenfassend\s+ist\s+festzustellen\b/gi, sev:'HOCH', h:'"Zusammenfassend ist festzustellen" → "Zusammenfassend erscheint naheliegend, dass …"'},
  {rx:/\bals\s+Ergebnis\s+ist\s+(festzuhalten|festzustellen)\b/gi, sev:'HOCH', h:'"Als Ergebnis ist festzustellen" → "Als Ergebnis erscheint naheliegend, dass …"'},
  {rx:/\bes\s+steht\s+fest\s*,?\s*dass\b/gi, sev:'HOCH', h:'"Es steht fest, dass" → Richtersprache → "Es erscheint naheliegend, dass"'},
  {rx:/\bfazit\s*:\s*(die|der|das|es|als|eine|ein)\b/gi, sev:'HOCH', h:'Fazit: muss Konjunktiv II enthalten — keine Indikativ-Kausalaussagen'},
  {rx:/\bim\s+Ergebnis\s+ist\b/gi,     sev:'HOCH', h:'"Im Ergebnis ist" → Indikativ-Schlussfolgerung → "Im Ergebnis erscheint naheliegend"'},
  {rx:/\bist\s+festzustellen\s*,?\s*dass\b/gi, sev:'HOCH', h:'"ist festzustellen, dass" → Indikativ-Fazit → "erscheint naheliegend, dass"'},
  {rx:/\bstellt\s+der\s+Sachverständige\s+fest\b/gi, sev:'HOCH', h:'"stellt der Sachverständige fest" → "ist der Sachverständige der Auffassung, dass"'},
  {rx:/\bstellt\s+sich\s+heraus\b/gi,  sev:'MITTEL', h:'"stellt sich heraus" → Indikativ → "lässt sich erkennen" / "erscheint naheliegend"'},
  // ─── NEBENSATZ-ERGÄNZUNG: Partizip vor Hilfsverb (dt. Satzstellung) ───
  // z.B. "...die Bildung von Kondensat begünstigt haben." (Nebensatz)
  // z.B. "...was zur Entstehung beigetragen hat." (Relativsatz)
  {rx:/\bbeigetragen\s+(hat|haben|hatte|hatten)\b/gi,  sev:'HOCH', h:'"beigetragen hat/haben" → Kausalindikativ (Nebensatz) → "beigetragen haben dürfte/dürften"'},
  {rx:/\bbegünstigt\s+(hat|haben|hatte|hatten)\b/gi,   sev:'HOCH', h:'"begünstigt hat/haben" → Kausalindikativ (Nebensatz) → "begünstigt haben dürfte/dürften"'},
  {rx:/\bverursacht\s+(hat|haben|hatte|hatten)\b/gi,   sev:'HOCH', h:'"verursacht hat/haben" → Kausalindikativ (Nebensatz) → "verursacht haben dürfte/dürften"'},
  {rx:/\bgeführt\s+(hat|haben|hatte|hatten)\b/gi,      sev:'HOCH', h:'"geführt hat/haben" → Kausalindikativ (Nebensatz) → "geführt haben dürfte/dürften"'},
  {rx:/\bausgelöst\s+(hat|haben|hatte|hatten)\b/gi,    sev:'HOCH', h:'"ausgelöst hat/haben" → Kausalindikativ (Nebensatz) → "ausgelöst haben dürfte/dürften"'},
  {rx:/\bbewirkt\s+(hat|haben|hatte|hatten)\b/gi,      sev:'HOCH', h:'"bewirkt hat/haben" → Kausalindikativ (Nebensatz) → "bewirkt haben dürfte/dürften"'},
  {rx:/\bherbeigeführt\s+(hat|haben|hatte|hatten)\b/gi, sev:'HOCH', h:'"herbeigeführt hat/haben" → Kausalindikativ (Nebensatz) → "herbeigeführt haben dürfte/dürften"'},
  {rx:/\bverstärkt\s+(hat|haben|hatte|hatten)\b/gi,    sev:'MITTEL', h:'"verstärkt hat/haben" → Kausalindikativ (Nebensatz) → "verstärkt haben dürfte/dürften"'},
  {rx:/\bbeschleunigt\s+(hat|haben|hatte|hatten)\b/gi, sev:'MITTEL', h:'"beschleunigt hat/haben" → Kausalindikativ (Nebensatz) → "beschleunigt haben dürfte/dürften"'},
  {rx:/\bermöglicht\s+(hat|haben|hatte|hatten)\b/gi,   sev:'MITTEL', h:'"ermöglicht hat/haben" → Kausalindikativ (Nebensatz) → "ermöglicht haben dürfte/dürften"'},
];

/* ── INIT ── */
document.getElementById('headerAz').textContent = az;
document.getElementById('bannerAz').textContent = az;
document.getElementById('bannerSa').textContent = sa;
document.getElementById('bannerObj').textContent = obj !== '—' ? obj : '';
document.getElementById('ctxAz').textContent = az;
document.getElementById('ctxSa').textContent = sa;
document.getElementById('ctxObj').textContent = obj;
document.getElementById('ctxDatum').textContent = datum;

// Vorherigen Text wiederherstellen
const prevText = localStorage.getItem('prova_stellungnahme_text') || '';
if(prevText) {
  document.getElementById('svTextA').value = prevText;
  onInputA();
}

// Typ setzen
setTyp(selectedTyp);
setWeg(selectedWeg);

// Normen laden
ladeNormen();

// KI-Analyse auto-load wenn Diktat vorhanden
(function() {
  var diktat = localStorage.getItem('prova_transkript') || '';
  var entwurf = localStorage.getItem('prova_entwurf_text') || '';
  if((diktat + entwurf).length > 50) {
    // Kurz warten damit DOM vollständig ist
    setTimeout(ladeKIAnalyse, 800);
  }
})();

// Normen-Queue aus normen.html verarbeiten
(function() {
  try {
    var queue = JSON.parse(localStorage.getItem('prova_normen_queue') || '[]');
    if (!Array.isArray(queue) || queue.length === 0) return;
    // In aktive Textarea einfügen
    setTimeout(function() {
      var activeTab = document.querySelector('.weg-tab.active');
      var isWegA = !activeTab || activeTab.dataset.weg !== 'B';
      var ta = document.getElementById(isWegA ? 'svTextA' : 'svStichpunkte');
      if (!ta) ta = document.getElementById('svTextA');
      if (!ta) return;
      var prefix = ta.value.trim() ? '\n\n' : '';
      var normenText = queue.map(function(n){ return n.text || n; }).join('\n');

      ta.value = ta.value + prefix + 'Normenbezug:\n' + normenText;

      ta.dispatchEvent(new Event('input'));
      localStorage.removeItem('prova_normen_queue');
      // Inline-Hinweis
      var normCount = queue.filter(function(q){ return q.typ !== 'baustein'; }).length;
      var tbCount = queue.filter(function(q){ return q.typ === 'baustein'; }).length;
      var label = [];
      if (normCount > 0) label.push(normCount + ' Norm(en)');
      if (tbCount > 0) label.push(tbCount + ' Textbaustein(e)');
      var hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:99999;background:#0a1f2e;border:2px solid #10b981;border-radius:12px;padding:12px 20px;font-size:13px;font-weight:600;color:#10b981;box-shadow:0 8px 24px rgba(0,0,0,.8);';
      hint.textContent = '✅ ' + label.join(' + ') + ' in §6 eingefügt';
      document.body.appendChild(hint);
      setTimeout(function(){ hint.remove(); }, 3000);
    }, 600);
  } catch(e) {}
})();

/* ── NAVIGATION ── */
function goBack() {
  localStorage.setItem('prova_stellungnahme_return', window.location.href);
  window.location.href = 'akte.html';
}

/* ── TYP ── */
function setTyp(t) {
  selectedTyp = t;
  localStorage.setItem('prova_gutachten_typ', t);
  ['gericht','versicherung','privat'].forEach(x => {
    document.getElementById('typ-'+x).classList.toggle('active', x===t);
  });

  // §7-Vorschau anzeigen + Hinweis
  const hinweise = {
    gericht: '⚖️ Gerichtsgutachten: Vollständige §407a ZPO-Offenlegung + EU AI Act Label im PDF.',
    versicherung: '🏢 Versicherungsgutachten: Kürzere Offenlegung, kein ZPO-Verweis, EU AI Act Label bleibt.',
    privat: '🏠 Privatgutachten: Minimale Offenlegung, kein ZPO-Bezug, EU AI Act Label bleibt.'
  };
  const hinweisEl = document.getElementById('typ-hinweis');
  const vorschauEl = document.getElementById('offenlegungs-vorschau');
  const textEl = document.getElementById('offenlegungs-text');
  if(hinweisEl) {
    hinweisEl.textContent = hinweise[t] || '';
    hinweisEl.style.display = 'block';
    // Kurze Animation
    hinweisEl.style.opacity = '0';
    setTimeout(() => { hinweisEl.style.opacity = '1'; hinweisEl.style.transition = 'opacity .3s'; }, 10);
  }
  if(vorschauEl && textEl) {
    textEl.textContent = (OFFENLEGUNG[t] || OFFENLEGUNG.gericht).substring(0, 200) + '…';
    vorschauEl.style.display = 'block';
  }
  // Normen-Panel Typ-Filter aktualisieren
  if(typeof aktualisiereNormenPanel === 'function') aktualisiereNormenPanel();
}

/* ── WEG ── */
function setWeg(w) {
  selectedWeg = w;
  localStorage.setItem('prova_stellungnahme_weg', w);
  document.getElementById('tab-a').classList.toggle('active', w==='A');
  document.getElementById('tab-b').classList.toggle('active', w==='B');
  document.getElementById('weg-a').style.display = w==='A' ? 'block' : 'none';
  document.getElementById('weg-b').style.display = w==='B' ? 'block' : 'none';
  checkReady();
}

/* ── KJ2 CHECK ── */
function runKjCheck(text, elId) {
  clearTimeout(kjTimer);
  kjTimer = setTimeout(() => {
    const el = document.getElementById(elId);
    if(!el || !text || text.length < 30) {
      if(el) el.className = 'kj-check idle';
      return;
    }

    // Alle Verstöße sammeln MIT Position im Text
    let fehler = [];
    INDIK_BAD.forEach(b => {
      b.rx.lastIndex = 0;
      let match;
      while((match = b.rx.exec(text)) !== null) {
        fehler.push({
          hinweis: b.h,
          fundstelle: match[0],
          position: match.index
        });
        b.rx.lastIndex = match.index + 1;
      }
      b.rx.lastIndex = 0;
    });

    // KJ2-Badge
    if(fehler.length === 0) {
      el.className = 'kj-check ok';
      el.innerHTML = '<span>✅</span><span>Konjunktiv II — kein Verstoß erkannt</span>';
    } else {
      el.className = 'kj-check warn';
      el.innerHTML = `<span>⚠️</span><span>${fehler.length} Konjunktiv-Verstoß${fehler.length>1?'e':''} — klicken zum Anspringen:</span>`;
    }

    // Fehler-Sprung-Liste anzeigen
    // Ermittle zugehöriges textarea und Fehlerliste
    var taId = elId === 'kjCheckA' ? 'svTextA' : (elId === 'kjCheckB' ? null : 'svTextEdit');
    var listeId = elId === 'kjCheckA' ? 'kjFehlerListeA' : (elId === 'kjCheckEdit' ? 'kjFehlerListeEdit' : null);
    var listeEl = listeId ? document.getElementById(listeId) : null;

    if(listeEl) {
      if(fehler.length === 0) {
        listeEl.style.display = 'none';
        listeEl.innerHTML = '';
      } else {
        listeEl.style.display = 'block';
        listeEl.innerHTML = fehler.map(function(f, i) {
          var isHoch = f.sev === 'HOCH';
          var bg     = isHoch ? 'rgba(239,68,68,.06)'  : 'rgba(245,158,11,.06)';
          var bgHov  = isHoch ? 'rgba(239,68,68,.12)'  : 'rgba(245,158,11,.12)';
          var border = isHoch ? 'rgba(239,68,68,.15)'  : 'rgba(245,158,11,.2)';
          var col    = isHoch ? '#ef4444'               : '#f59e0b';
          var sevTxt = isHoch ? '⛔ HOCH'               : '⚠ MITTEL';
          return '<div onclick="springZuVerstoss(\'' + taId + '\', ' + f.position + ')"'
            + ' style="display:flex;align-items:flex-start;gap:8px;padding:5px 8px;margin-bottom:3px;'
            + 'background:' + bg + ';border:1px solid ' + border + ';'
            + 'border-radius:6px;cursor:pointer;transition:background .12s;font-size:11px;"'
            + ' onmouseover="this.style.background=\'' + bgHov + '\'"'
            + ' onmouseout="this.style.background=\'' + bg + '\'">'
            + '<span style="color:' + col + ';font-weight:700;flex-shrink:0;">' + sevTxt + ' ' + (i+1) + '</span>'
            + '<div>'
            + '<span style="background:rgba(' + (isHoch?'239,68,68':'245,158,11') + ',.15);color:' + col + ';padding:1px 5px;border-radius:3px;font-weight:600;font-family:monospace;">&quot;' + f.fundstelle + '&quot;</span>'
            + '<span style="color:var(--text3);margin-left:5px;">→ ' + f.hinweis + '</span>'
            + '</div></div>';
        }).join('');
      }
    }

    localStorage.setItem('prova_stellungnahme_kj2_ok', fehler.length===0 ? '1' : '0');
    checkReady();
  }, 700);
}

/* Springt zu einer Verstoss-Position in der Textarea */
function springZuVerstoss(taId, position) {
  var ta = document.getElementById(taId);
  if(!ta) return;
  ta.focus();
  ta.setSelectionRange(position, position);
  // Textarea scrollt zur Cursurposition
  var text = ta.value;
  var linesBefore = (text.substring(0, position).match(/\n/g) || []).length;
  var lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
  ta.scrollTop = Math.max(0, (linesBefore - 2) * lineHeight);
  // Kurz den gefundenen Text markieren (Selection)
  // Finde Ende des Treffers
  var restText = text.substring(position);
  INDIK_BAD.forEach(b => {
    b.rx.lastIndex = 0;
    var m = b.rx.exec(restText);
    if(m && m.index === 0) {
      ta.setSelectionRange(position, position + m[0].length);
    }
    b.rx.lastIndex = 0;
  });
}

/* ── INPUT HANDLERS ── */
var aktivFeld = 'B2'; // Standard: Kausalaussage
function setAktivFeld(feld) { aktivFeld = feld; }

// Indikativ-Wörter im Text highlighten
function highlightIndikativ(text, hlElId) {
  const el = document.getElementById(hlElId);
  if(!el) return;
  // HTML escapen
  let html = text
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
  // Jeden Verstoß markieren
  INDIK_BAD.forEach(b => {
    b.rx.lastIndex = 0;
    html = html.replace(b.rx, match => `<mark class="indikativ">${match}</mark>`);
    b.rx.lastIndex = 0;
  });
  el.innerHTML = html;
}

// KI-Denkanstoß: kontextuell basierend auf Verstoß + Feld
const HINT_MAP = {
  // Kausalaussagen (Feld B2)
  'Ursache|Schadensursache': {
    text: 'Kausalaussagen brauchen Konjunktiv II.',
    fixes: ['dürfte die Schadensursache sein', 'könnte ursächlich sein', 'wäre naheliegenderweise zurückzuführen auf']
  },
  'zurückzuführen': {
    text: '"ist zurückzuführen" ist Indikativ.',
    fixes: ['dürfte zurückzuführen sein auf', 'ließe sich zurückführen auf']
  },
  'zu suchen': {
    text: '"ist zu suchen" klingt nach Aussage, nicht Einschätzung.',
    fixes: ['dürfte zu suchen sein in', 'wäre am ehesten zu suchen in']
  },
  'liegt in|liegt an|liegt bei': {
    text: '"liegt in/an" ist Indikativ bei Ursachenaussagen.',
    fixes: ['dürfte liegen in', 'könnte begründet liegen in']
  },
  'geführt|führt zu': {
    text: 'Ursache-Wirkung muss im Konjunktiv II stehen.',
    fixes: ['dürfte geführt haben zu', 'könnte zu … geführt haben']
  },
  'verursacht': {
    text: '"verursacht" ist eine Kausalaussage → Konjunktiv II.',
    fixes: ['dürfte verursacht haben', 'könnte mitverursacht haben']
  },
  // Bewertungen (Feld B2/B3)
  'erforderlich|notwendig|geboten': {
    text: 'Handlungsempfehlungen müssen im Konjunktiv II stehen.',
    fixes: ['wäre erforderlich', 'erschiene notwendig', 'wäre geboten']
  },
  'muss |müssen ': {
    text: '"muss" ist imperativ — in Gutachten Konjunktiv II verwenden.',
    fixes: ['wäre zu empfehlen', 'sollte geprüft werden', 'wäre durchzuführen']
  },
  'ist zu (erneuern|sanieren|beheben|prüfen)': {
    text: '"ist zu sanieren" wirkt wie Anweisung, nicht Gutachten.',
    fixes: ['wäre zu sanieren', 'wäre zu erneuern', 'wäre fachgerecht zu beheben']
  },
  'mangelhaft|defekt': {
    text: 'Bewertungen ("mangelhaft") → Konjunktiv II wenn interpretativ.',
    fixes: ['erscheint mangelhaft', 'dürfte als mangelhaft einzustufen sein']
  },
  'eindeutig|offensichtlich|klar': {
    text: 'Absolute Aussagen vermeiden — Gutachten ist Einschätzung.',
    fixes: ['erscheint naheliegend', 'dürfte mit hoher Wahrscheinlichkeit', 'ließe sich schließen']
  },
};

function getHint(text) {
  if(!text || text.length < 20) return null;
  for(const [pattern, hint] of Object.entries(HINT_MAP)) {
    const rx = new RegExp(pattern, 'i');
    if(rx.test(text)) return hint;
  }
  return null;
}

function zeigeHint(hintElId, textElId, text) {
  const bubble = document.getElementById(hintElId);
  const textEl = document.getElementById(textElId);
  if(!bubble || !textEl) return;
  const hint = getHint(text);
  if(!hint) {
    bubble.classList.remove('show');
    bubble.removeAttribute('data-last-hint');
    return;
  }
  // Nur neu animieren wenn sich der Hint-Typ geändert hat
  const lastHint = bubble.getAttribute('data-last-hint');
  if(lastHint === hint.text) return; // gleicher Verstoß — nicht neu animieren
  bubble.setAttribute('data-last-hint', hint.text);
  // Text setzen
  textEl.innerHTML = hint.text + '<br>' +
    hint.fixes.map(f =>
      `<span class="ki-hint-fix" onclick="applyFix(this,'${f}')" title="Klicken zum Einfügen">→ ${f}</span>`
    ).join('');
  // Nur bei neuem Verstoß animieren
  bubble.classList.remove('show');
  void bubble.offsetWidth;
  bubble.classList.add('show');
}

function applyFix(el, fix) {
  // Fix in aktives Textarea einfügen — Cursor-Position respektieren
  const taMap = {B1:'svB1', B2:'svB2', B3:'svB3'};
  const taId = taMap[aktivFeld] || 'svB2';
  const ta = document.getElementById(taId);
  if(!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const val = ta.value;
  ta.value = val.substring(0,start) + fix + val.substring(end);
  ta.selectionStart = ta.selectionEnd = start + fix.length;
  ta.focus();
  onInputB();
}

function onInputA() {
  const txt = document.getElementById('svTextA').value;
  // Inline-Highlighting im Overlay
  highlightIndikativ(txt, 'hlA');
  const len = txt.length;
  const cc = document.getElementById('charA');
  var words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
  cc.textContent = `${len} Zeichen · ${words} Wörter (mind. 700 Z.)`;
  cc.className = 'char-count ' + (len>=700?'ok':len>=250?'warn':'bad');
  var cta = document.getElementById('freigabe-cta');
  if (cta) cta.style.display = len >= 700 ? 'block' : 'none';
  runKjCheck(txt, 'kjCheckA');
  localStorage.setItem('prova_stellungnahme_text', txt);
  // Auto-Save Indikator
  var saveInd = document.getElementById('autosave-ind');
  if (saveInd) { saveInd.textContent = '✓ gespeichert'; saveInd.style.opacity='1'; clearTimeout(window._saveTimer); window._saveTimer = setTimeout(function(){ saveInd.style.opacity='0'; }, 2000); }
  checkReady();
  updateAusformBtn();
  updateEigenleistung(len);
}

function onInputB() {
  const b1 = document.getElementById('svB1').value;
  const b2 = document.getElementById('svB2').value;
  const b3 = document.getElementById('svB3').value;

  // Char-Counter
  document.getElementById('charB1').textContent = b1.length+'/250';
  document.getElementById('charB1').className = 'char-count '+(b1.length>=250?'ok':b1.length>=125?'warn':'bad');
  document.getElementById('charB2').textContent = b2.length+'/350';
  document.getElementById('charB2').className = 'char-count '+(b2.length>=350?'ok':b2.length>=175?'warn':'bad');
  document.getElementById('charB3').textContent = b3.length+'/200';
  document.getElementById('charB3').className = 'char-count '+(b3.length>=150?'ok':b3.length>=75?'warn':'bad');

  // Highlights
  highlightIndikativ(b1, 'hlB1');
  highlightIndikativ(b2, 'hlB2');
  highlightIndikativ(b3, 'hlB3');

  // KJ2-Check nur auf Kausalaussage (Feld 2)
  runKjCheck(b2, 'kjCheckB');

  // Hüpfende Denkanstöße — nur für aktives Feld, andere ausblenden
  if(aktivFeld === 'B1') {
    zeigeHint('hintB1', 'hintB1text', b1);
    (function(){var _el=document.getElementById('hintB2');if(_el)_el.classList.remove('show');})();
    (function(){var _el=document.getElementById('hintB3');if(_el)_el.classList.remove('show');})();
  } else if(aktivFeld === 'B2') {
    zeigeHint('hintB2', 'hintB2text', b2);
    (function(){var _el=document.getElementById('hintB1');if(_el)_el.classList.remove('show');})();
    (function(){var _el=document.getElementById('hintB3');if(_el)_el.classList.remove('show');})();
  } else if(aktivFeld === 'B3') {
    zeigeHint('hintB3', 'hintB3text', b3);
    (function(){var _el=document.getElementById('hintB1');if(_el)_el.classList.remove('show');})();
    (function(){var _el=document.getElementById('hintB2');if(_el)_el.classList.remove('show');})();
  }

  // Ausform-Button
  const total = b1.length+b2.length+b3.length;
  const btn = document.getElementById('btnAusform');
  if(btn) btn.style.display = (total>=700) ? 'block' : 'none';
  checkReady();
  updateEigenleistung(total);
}

function onInputEdit() {
  const txt = document.getElementById('svTextEdit').value;
  document.getElementById('charEdit').textContent = txt.length+' Zeichen';
  runKjCheck(txt, 'kjCheckEdit');
  checkReady();
}

function updateAusformBtn() {
  // nur in Weg B relevant
}

/* ── READY CHECK ── */
function checkReady() {
  const txt = getFinalSvText();
  const confirmed = document.getElementById('confirm407a').checked;
  const btn = document.getElementById('btnWeiter');
  btn.disabled = !(txt.length >= 500 && confirmed);
}

function getFinalSvText() {
  if(selectedWeg === 'A') return document.getElementById('svTextA').value;
  const editWrap = document.getElementById('ausform-wrap');
  if(editWrap.style.display !== 'none') return document.getElementById('svTextEdit').value;
  const b1 = document.getElementById('svB1').value.trim();
  const b2 = document.getElementById('svB2').value.trim();
  const b3 = document.getElementById('svB3').value.trim();
  return [b1,b2,b3].filter(Boolean).join(' ');
}

/* ── KI-INSPIRATION ── */
function toggleInsp() {
  const body = document.getElementById('kiInspBody');
  const icon = document.getElementById('insp-toggle-icon');
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  icon.textContent = open ? '▼' : '▲';
  if(!open && !kiInspLoaded) ladeKiInsp();
}

async function ladeKiInsp() {
  kiInspLoaded = true;
  document.getElementById('kiInspLoading').style.display = 'flex';
  document.getElementById('kiInspText').style.display = 'none';
  document.getElementById('kiInspRefresh').style.display = 'none';

  // ── Vollständiger Fallkontext ──────────────────────────────
  const diktat    = (localStorage.getItem('prova_transkript') || '').trim();
  const messwerte = (localStorage.getItem('prova_messwerte') || '').trim();
  const entwurf   = (localStorage.getItem('prova_entwurf_text') || '').trim();
  const svText    = ((document.getElementById('svTextA')?document.getElementById('svTextA').value:'') || '').trim();
  const baujahr   = localStorage.getItem('prova_baujahr') || '';
  const auftraggeber = localStorage.getItem('prova_auftraggeber_name') || '';
  const gutTyp    = selectedTyp || 'gericht';

  // ── Mindest-Kontext prüfen ────────────────────────────────
  const gesamtKontext = diktat + messwerte + entwurf;
  if(gesamtKontext.length < 80) {
    document.getElementById('kiInspLoading').style.display = 'none';
    document.getElementById('kiInspText').innerHTML =
      '<span style="color:var(--warn);">⚠️ Zu wenig Informationen für einen Denkanstoß.<br><br>' +
      'Bitte ergänzen Sie im Diktat:<br>' +
      '• Lage und Ausdehnung des Schadens<br>' +
      '• Gemessene Feuchte- oder Temperaturwerte<br>' +
      '• Bauphase / Baujahr des Objekts<br>' +
      '• Nutzungsverhalten (sofern relevant)</span>';
    document.getElementById('kiInspText').style.display = 'block';
    document.getElementById('kiInspRefresh').style.display = 'inline-flex';
    return;
  }

  // ── Mega-System-Prompt ────────────────────────────────────
  const systemPrompt = `Du bist ein öffentlich bestellter und vereidigter Sachverständiger für Schäden an Gebäuden mit 30 Jahren Berufserfahrung. Du kennst die einschlägigen Normen (DIN-Normen, WTA-Merkblätter, VDI-Richtlinien), die Rechtsprechung des BGH und der Oberlandesgerichte sowie die Anforderungen der Sachverständigenordnung (IHK, BVS, BDSF).

RECHTLICHE GRUNDLAGEN:
- §407a ZPO: Persönliche Begutachtung, keine Spekulation über nicht erhobene Fakten
- BGH VII ZR 138/19: KI-Assistenz offenlegen, Verantwortung bleibt beim SV
- BGH VII ZR 46/17: Darlegungs- und Beweislast bei Baumängeln
- §823 BGB, §906 BGB: Schadensersatz und Kausalität
- VOB/B §13: Mängelgewährleistung am Bau

SCHREIBREGELN FÜR §6 — STRIKTE EINHALTUNG:
1. Konjunktiv II PFLICHT für ALLE Kausal- und Bewertungsaussagen: "dürfte", "könnte", "wäre", "ließe sich", "erscheint naheliegend"
2. Indikativ NUR für gemessene Fakten/Sichtbefunde/Normwerte: "Die gemessene Feuchte beträgt X%"
3. ABSOLUT VERBOTEN: Fakten erfinden die NICHT im Diktat/Entwurf stehen
4. VERBOTEN: Indikativ bei Ursachenaussagen: NICHT "ist zurückzuführen", SONDERN "dürfte zurückzuführen sein"
5. Wenn Informationen fehlen: EXPLIZIT benennen was fehlt, z.B. "Für eine abschließende Beurteilung wäre die Angabe der Raumluftfeuchte erforderlich."
6. Beweislast nach BGH-Rspr. formulieren (Anscheinsbeweis bei typischen Schadensbildern)
7. Sanierungsempfehlung mit konkreten Normen/Merkblättern

DENKANSTOSS-FORMAT:
6.1 Ursache: [2-3 Sätze im Konjunktiv II — ausschließlich aus Diktat/Entwurf ableiten]
6.2 Beweislast: [1-2 Sätze, BGH-Referenz wenn passend]
6.3 Sanierungsempfehlung: [2-3 Sätze, mit DIN/WTA-Verweis]

Antworte NUR mit dem §6-Denkanstoß-Text. Keine Einleitung, keine Erklärungen.`;

  // ── User-Prompt mit vollem Kontext ────────────────────────
  const userPrompt = `FALLKONTEXT:
Aktenzeichen: ${az}
Schadensart: ${sa}
Objekt: ${obj}${baujahr ? '\nBaujahr: '+baujahr : ''}${auftraggeber ? '\nAuftraggeber: '+auftraggeber : ''}
Gutachtentyp: ${{gericht:'Gerichtsgutachten',versicherung:'Versicherungsgutachten',privat:'Privatgutachten'}[gutTyp]||gutTyp}

${diktat ? 'DIKTAT DES SACHVERSTÄNDIGEN (Originalaufnahme):\n'+diktat : ''}${messwerte ? '\n\nMESSWERTE:\n'+messwerte : ''}${entwurf ? '\n\n§1–§5 ENTWURF (KI-ausformuliert, erste 1500 Zeichen):\n'+entwurf.substring(0,1500) : ''}${svText ? '\n\nWAS DER SV BISHER IN §6 GESCHRIEBEN HAT:\n'+svText : ''}

AUFGABE: Schreibe einen professionellen §6-Denkanstoß der AUSSCHLIESSLICH auf den oben stehenden Fallinformationen basiert. Falls wesentliche Informationen fehlen, benenne diese explizit.`;

  try {
    const res = await fetch('/.netlify/functions/ki-proxy', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages:[
          {role:'system', content: systemPrompt},
          {role:'user',   content: userPrompt}
        ]
      })
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const d = await res.json();
    const txt = (d.content&&d.content[0]&&d.content[0].text)
      ? d.content[0].text
      : (d.choices&&d.choices[0] ? d.choices[0].message.content : '');
    if(!txt) throw new Error('Kein Text');
    document.getElementById('kiInspText').textContent = txt;
    document.getElementById('kiInspText').style.display = 'block';
    document.getElementById('kiInspRefresh').style.display = 'inline-flex';
    localStorage.setItem('prova_ki_stellungnahme_vorschlag', txt);
  } catch(e) {
    document.getElementById('kiInspText').innerHTML =
      '<span style="color:var(--red);">KI nicht erreichbar ('+e.message+'). Bitte erneut versuchen.</span>';
    document.getElementById('kiInspText').style.display = 'block';
    document.getElementById('kiInspRefresh').style.display = 'inline-flex';
  }
  document.getElementById('kiInspLoading').style.display = 'none';
}

/* ── KI-AUSFORMULIEREN (Weg B) ── */
async function ausformulieren() {
  const b1 = document.getElementById('svB1').value.trim();
  const b2 = document.getElementById('svB2').value.trim();
  const b3 = document.getElementById('svB3').value.trim();
  if(!b1 || !b2) { zeigToast('Bitte Felder 1 und 2 ausfüllen.','warn'); return; }
  const btn = document.getElementById('btnAusform');
  btn.textContent = '⏳ KI formuliert…'; btn.disabled = true;
  const gesamtLen = b1.length+b2.length+b3.length;
  const maxLen = Math.round(gesamtLen*0.7);
  try {
    const res = await fetch('/.netlify/functions/ki-proxy', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gpt-4o-mini',
        max_tokens:700,
        messages:[
          {role:'system', content:`Du bist ein öffentlich bestellter und vereidigter Sachverständiger für Schäden an Gebäuden mit 30 Jahren Berufserfahrung. Du formulierst §6 Fachurteile für Gutachten.

STRIKTE REGELN — KEINE AUSNAHMEN:
1. Konjunktiv II PFLICHT für Kausal- und Bewertungsaussagen: dürfte, könnte, wäre, ließe sich
2. Indikativ NUR für Messwerte und Sichtbefunde
3. VERBOTEN: Fakten erfinden die der SV nicht angegeben hat
4. VERBOTEN: Indikativ bei Ursachenaussagen
5. Falls SV-Angaben unvollständig: im Text explizit benennen was für eine abschließende Bewertung fehlt
6. Beweislast nach BGH-Rechtsprechung formulieren wo passend
7. Sanierungsempfehlung mit Normverweis (DIN, WTA, VDI)
8. Output max ${maxLen} Zeichen
9. NUR den §6-Fließtext — keine Überschriften, keine Nummerierung

Antworte ausschließlich mit dem §6-Text.`},
          {role:'user', content:`Formuliere §6 aus diesen SV-Stichpunkten:

Aktenzeichen: ${az}
Schadensart: ${sa}
Objekt: ${obj}

SV-Beobachtung / Ursache:
${b1}

SV-Kausalschluss / Beweislast:
${b2}

SV-Empfehlung:
${b3}

Formuliere daraus einen vollständigen, professionellen §6-Fachurteil-Text im Konjunktiv II.`}
        ]
      })
    });
    const d = await res.json();
    let txt = (d.content&&d.content[0]&&d.content[0].text)
      ? d.content[0].text
      : (d.choices&&d.choices[0] ? d.choices[0].message.content : d.text || '');
    if(txt.length > maxLen) txt = txt.substring(0,maxLen)+'…';
    document.getElementById('svTextEdit').value = txt;
    document.getElementById('ausform-wrap').style.display = 'block';
    onInputEdit();
    document.getElementById('ausform-wrap').scrollIntoView({behavior:'smooth',block:'nearest'});
    localStorage.setItem('prova_ki_stellungnahme_vorschlag', txt);
  } catch(e) {
    zeigToast('KI nicht erreichbar — bitte manuell in Feld A eintippen.','err');
  }
  btn.textContent = '✨ Meine Stichpunkte formulieren lassen'; btn.disabled = false;
}

/* ── NORMEN ── */
const SA_TAGS = {
  'Wasserschaden':'WS','Schimmelbefall':'SC','Brandschaden':'BS',
  'Sturmschaden':'SS','Elementarschaden':'ES','Baumängel allgemein':'BA',
  'Baumängel':'BA','Schimmel/Feuchte':'SC','Feuchte':'SC'
};
const NORMEN_DB=[{"n":"WTA 6-1-01/D","t":"Schimmel: Luftfeuchte <60%, Wandfeuchte >20% kritisch","sa":"SC"},{"n":"DIN 4108-2","t":"Mindestwärmeschutz: fRsi ≥ 0,70 — Taupunkt prüfen","sa":"SC,WS,BA"},{"n":"DIN 4108-3","t":"Feuchteschutz: Tauwassernachweis, Diffusion","sa":"SC,WS,BA"},{"n":"DIN EN ISO 13788","t":"Hygrothermik: Oberflächenfeuchte >80%rF schimmelkritisch","sa":"SC"},{"n":"DIN 68800-1","t":"Holzschutz: Holzfeuchte >18% = Schimmelrisiko","sa":"SC,WS"},{"n":"DIN 1946-6","t":"Lüftung Wohngebäude: mind. 0,3-facher Luftwechsel/h","sa":"SC"},{"n":"DIN EN ISO 16000-1","t":"Innenraumluft: Probenahme + Messstrategie Schimmelpilze","sa":"SC"},{"n":"UBA-Leitfaden","t":"Schimmel >0,5 m² = erheblicher Mangel, Sanierungspflicht","sa":"SC"},{"n":"DIN 18533","t":"Abdichtung erdberührt: Lastfall W1-E bis W4-E","sa":"WS,ES"},{"n":"DIN 18534","t":"Nassraum-Abdichtung: Beanspruchungsklasse A0–A3","sa":"WS"},{"n":"VdS 3151","t":"Trocknung: Holz ≤15%, Mauerwerk ≤3% KMG Zielfeuchte","sa":"WS,ES"},{"n":"DIN 18353","t":"Estrich: CM Zementestrich ≤2,0%, Anhydrit ≤0,5%","sa":"WS"},{"n":"DIN EN 13564","t":"Rückstauschutz: Rückstauebene = Straßenoberkante","sa":"WS,ES"},{"n":"DIN EN 805","t":"Druckprüfung Leitungen: Prüfdruck 1,5-fach Betrieb","sa":"WS"},{"n":"DIN 4102-4","t":"Feuerwiderstandsklassen: F30/F60/F90 nach Bauteilen","sa":"BS"},{"n":"DIN EN 13501-2","t":"Klassifizierung Feuerwiderstand europäisch","sa":"BS"},{"n":"TRGS 519","t":"Asbest: Arbeiten bei Abbruch, Sanierung, Instandhaltung","sa":"BS"},{"n":"GefStoffV §14","t":"Schadstoffmessung: Expositionsermittlung nach Brand","sa":"BS"},{"n":"DIN EN 1991-1-4","t":"Windlasten: Windzone 1–4, Böengeschwindigkeit","sa":"SS"},{"n":"DIN EN 1991-1-3","t":"Schneelasten: Schneelastzone 1–3, 0,65–1,10 kN/m²","sa":"SS,ES"},{"n":"DIN 18338","t":"Dachdeckung: Mindestdachneigung Tonziegel 22°","sa":"SS"},{"n":"DIN 18531","t":"Flachdach: Aufkantung ≥150 mm, Bitumen 2-lagig ≥6 mm","sa":"SS"},{"n":"VOB/B §13","t":"Gewährleistung Bauwerk 4 Jahre, Mängelansprüche","sa":"BA,SA"},{"n":"DIN 18202","t":"Toleranzen Hochbau: Ebenheit Boden max. 5 mm/4 m","sa":"BA,BS_V"},{"n":"DIN EN 206","t":"Beton: Expositionsklassen XC1–XF4","sa":"BA"},{"n":"DIN 55699","t":"WDVS: Haftfestigkeit Untergrund ≥0,25 N/mm²","sa":"BA,SA"},{"n":"§633 BGB","t":"Sachmangel Werkvertrag: vereinbarte Beschaffenheit","sa":"BA,KA"},{"n":"§634 BGB","t":"Rechte bei Mängeln: Nacherfüllung, Rücktritt, Schadensersatz","sa":"BA,KA"},{"n":"DIN 4095","t":"Drainage: Planung, Einbau, Instandhaltung","sa":"ES"},{"n":"DIN EN 1997-1","t":"Geotechnik: Erdrutsch, Setzungen, Baugrundversagen","sa":"ES"},{"n":"DIN 4020","t":"Baugrunduntersuchungen: Anforderungen Geotechnik","sa":"ES"},{"n":"§485 ZPO","t":"Selbständiges Beweisverfahren: Antrag auf Gutachten","sa":"BS_V,KA"},{"n":"§487 ZPO","t":"Inhalt des Antrags: Beweisfragen, Beweismittel","sa":"BS_V"},{"n":"§492 ZPO","t":"Durchführung: Beweisaufnahme und Protokollierung","sa":"BS_V"},{"n":"DIN EN ISO 17123","t":"Messverfahren: Kalibrierung und Messprotokoll","sa":"BS_V"},{"n":"§434 BGB","t":"Sachmangel: Beschaffenheitsvereinbarung, übliche Qualität","sa":"KA"},{"n":"§438 BGB","t":"Verjährung: 5 Jahre bei Bauwerken","sa":"KA,BA"},{"n":"§444 BGB","t":"Arglistige Täuschung: kein Haftungsausschluss möglich","sa":"KA"},{"n":"WTA 2-9-04/D","t":"Sanierputzsystem: w ≤ 0,5 kg/(m²·h⁰˙⁵)","sa":"SA"},{"n":"GEG","t":"Gebäudeenergiegesetz: Sanierungspflichten, U-Werte","sa":"SA"},{"n":"§407a ZPO","t":"Persönliche Erstattungspflicht des Sachverständigen","sa":"GERICHT"},{"n":"§411 ZPO","t":"Schriftliches Gutachten: Frist, Unterschrift, Stempel","sa":"GERICHT"},{"n":"§412 ZPO","t":"Neues Gutachten: bei Widerspruch oder Ergänzungsbedarf","sa":"GERICHT"},{"n":"§404 ZPO","t":"Sachverständigenauswahl: bevorzugt ö.b.u.v.","sa":"GERICHT"},{"n":"VdS 2021","t":"VdS-Leitlinien für Sachverständige: Qualitätsstandards","sa":"VERSICHERUNG"},{"n":"GDV AFB 2010","t":"Allgemeine Feuerversicherungs-Bedingungen","sa":"VERSICHERUNG"},{"n":"GDV AWB 2010","t":"Allgemeine Wohngebäude-Versicherungs-Bedingungen","sa":"VERSICHERUNG"},{"n":"DIN 276","t":"Kosten im Bauwesen: Kostengliederung nach KG100-700","sa":"BA,BS,WS,SC,SS,ES"},{"n":"§823 BGB","t":"Schadensersatzpflicht bei unerlaubter Handlung","sa":"BA,WS,SC,BS,SS,ES"},{"n":"VOB/B §4 Nr.3","t":"Bedenkenanmeldung: Hinweispflicht Auftragnehmer","sa":"BA"}];

async function ladeNormen() {
  const el = document.getElementById('normenListe');
  if(!el) return;

  // Erste Stufe: statische Vorauswahl sofort zeigen
  const tag = SA_TAGS[sa];
  const statisch = tag
    ? NORMEN_DB.filter(n => n.sa.includes(tag)).slice(0,3)
    : NORMEN_DB.slice(0,3);

  el.innerHTML = '<div style="padding:8px 12px;font-size:11px;color:var(--text3);display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .6s linear infinite;"></span>KI analysiert Diktat…</div>'
    + statisch.map(n => renderNormItem(n)).join('');

  // Zweite Stufe: KI liest Diktat und schlägt spezifische Normen vor
  const diktat  = (localStorage.getItem('prova_transkript') || '').trim();
  const entwurf = (localStorage.getItem('prova_entwurf_text') || '').substring(0,800).trim();
  const kontext = diktat || entwurf;

  if(!kontext) {
    // Nur statische Normen zeigen
    el.innerHTML = statisch.map(n => renderNormItem(n)).join('');
    return;
  }

  try {
    const normenListe = NORMEN_DB.map(n => n.n + ' — ' + n.t + (n.g?' ('+n.g+')':'')).join('\n');
    const res = await fetch('/.netlify/functions/ki-proxy', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'gpt-4o-mini',
        max_tokens:200,
        messages:[
          {role:'system', content:'Du bist ein erfahrener Bausachverständiger. Antworte NUR mit einem JSON-Array der Norm-Bezeichnungen, z.B. ["DIN 4108-2","WTA 6-1-01/D"]. Keine Erklärungen, kein Markdown.'},
          {role:'user', content:'Wähle aus der folgenden Liste die 3-5 relevantesten Normen für diesen Fall aus.\n\nFall: '+sa+'\nDiktat/Sichtbefunde:\n'+kontext.substring(0,600)+'\n\nVerfügbare Normen:\n'+normenListe+'\n\nGib NUR ein JSON-Array zurück.'}
        ]
      })
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const d = await res.json();
    const txt = (d.content&&d.content[0]&&d.content[0].text)||
                (d.choices&&(d.choices[0]&&d.choices[0].message&&d.choices[0].message.content))||'';

    let vorschlag = [];
    try {
      const match = txt.match(/\[.*?\]/s);
      if(match) vorschlag = JSON.parse(match[0]);
    } catch(e) {}

    const kiNormen = vorschlag.length
      ? vorschlag.map(nr => NORMEN_DB.find(n => n.n===nr)).filter(Boolean)
      : statisch;

    el.innerHTML = kiNormen.map(n => renderNormItem(n)).join('');
  } catch(e) {
    el.innerHTML = statisch.map(n => renderNormItem(n)).join('');
  }
}

function renderNormItem(n) {
  return '<div class="norm-item" onclick="normEinfuegen(\'' + n.n.replace(/'/g,"\'") + '\',\'' + n.t.replace(/'/g,"\'") + '\')" style="cursor:pointer;">'
    + '<div class="norm-item-nr">' + n.n + '</div>'
    + '<div class="norm-item-txt">' + n.t + '</div>'
    + (n.g ? '<div class="norm-item-g">' + n.g + '</div>' : '')
    + '<span class="norm-add-btn" style="cursor:pointer;">+ In §6 einfügen</span>'
    + '</div>';
}

function normEinfuegen(nr, titel) {
  const insert = `\n(gem. ${nr} – ${titel})`;
  const ta = selectedWeg==='A' ? document.getElementById('svTextA') :
    (document.getElementById('ausform-wrap').style.display!=='none' ?
      document.getElementById('svTextEdit') : document.getElementById('svTextA'));
  const pos = ta.selectionStart || ta.value.length;
  ta.value = ta.value.slice(0,pos) + insert + ta.value.slice(pos);
  ta.focus();
  if(selectedWeg==='A') onInputA();
  else onInputEdit();
  zeigToast(`${nr} eingefügt ✅`,'ok');
}

function insertPhrase(phrase) {
  const ta = selectedWeg==='A' ? document.getElementById('svTextA') :
    (document.getElementById('ausform-wrap').style.display!=='none' ?
      document.getElementById('svTextEdit') : document.getElementById('svTextA'));
  const pos = ta.selectionStart || ta.value.length;
  const pre = pos>0 && ta.value[pos-1]!==' ' && ta.value[pos-1]!=='\n' ? ' ' : '';
  ta.value = ta.value.slice(0,pos) + pre + phrase + ' ' + ta.value.slice(pos);
  ta.focus();
  if(selectedWeg==='A') onInputA();
  else onInputEdit();
}

/* ── WEITER ZUR FREIGABE ── */
function weiterZuFreigabe() {
  const finalText = getFinalSvText();
  if(finalText.length < 700) { zeigToast('Bitte mindestens 700 Zeichen.','warn'); return; }

  const ts = new Date().toISOString();
  const kiVorschlag = localStorage.getItem('prova_ki_stellungnahme_vorschlag') || '';
  const offenlegung = OFFENLEGUNG[selectedTyp] || OFFENLEGUNG.gericht;

  // Alles speichern
  localStorage.setItem('prova_stellungnahme_text', finalText);
  localStorage.setItem('prova_stellungnahme_weg', selectedWeg);
  localStorage.setItem('prova_stellungnahme_ts', ts);
  localStorage.setItem('prova_stellungnahme_done', '1');
  localStorage.setItem('prova_gutachten_typ', selectedTyp);
  localStorage.setItem('prova_offenlegungstext', offenlegung);
  localStorage.setItem('prova_stellungnahme_version', 'v5.0-guided');
  localStorage.setItem('prova_stellungnahme_kj2_ok',
    document.getElementById('prova_stellungnahme_kj2_ok') ||
    localStorage.getItem('prova_stellungnahme_kj2_ok') || '0');

  // KI-Statistik sammeln (anonym)
  const gewaehlteUrsachen = Array.from(document.querySelectorAll('.ursache-check:checked')).map(cb => cb.dataset.kategorie);
  const andereUrsache = document.getElementById('ursacheAndere').checked ? (document.getElementById('ursacheAndereText')?document.getElementById('ursacheAndereText').value:'') || '' : '';
  
  const kiStatistik = {
    schadenart: sa,
    ursache_quelle: gewaehlteUrsachen.length > 0 ? 'ki_vorschlag' : (andereUrsache ? 'eigene_eingabe' : 'keine'),
    ursache_kategorien: gewaehlteUrsachen,
    andere_ursache: andereUrsache,
    ki_analyse_geladen: kiAnalyseData !== null,
    eigentext_zeichen: finalText.length,
    weg: selectedWeg,
    diktat_verwendet: !!localStorage.getItem('prova_transkript'),
    datum: new Date().toISOString().split('T')[0]
  };
  localStorage.setItem('prova_ki_statistik', JSON.stringify(kiStatistik));

  // "Andere Ursache" für KI_LERNPOOL speichern
  if (andereUrsache) {
    const lernpool = JSON.parse(localStorage.getItem('prova_lernpool') || '[]');
    lernpool.push({ schadenart: sa, ursache: andereUrsache, datum: kiStatistik.datum });
    localStorage.setItem('prova_lernpool', JSON.stringify(lernpool));
  }

  // Audit-Log kompakt
  const auditLog = {
    version:'v5.0-guided', ts_start: ts,
    weg: selectedWeg, typ: selectedTyp,
    ki_analyse: kiAnalyseData !== null,
    ursachen_gewaehlt: gewaehlteUrsachen,
    andere_ursache: andereUrsache,
    sv_final: finalText,
    ts_407a: ts,
    kj2_ok: localStorage.getItem('prova_stellungnahme_kj2_ok')==='1'
  };
  localStorage.setItem('prova_stellungnahme_audit', JSON.stringify(auditLog));

  // KI-Statistik + Lernpool an Airtable senden (non-blocking)
  try {
    const syncPayload = { statistik: kiStatistik };
    if (andereUrsache) {
      syncPayload.lernpool = [{ schadenart: sa, ursache: andereUrsache, datum: kiStatistik.datum }];
    }
    fetch('/.netlify/functions/ki-statistik', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload)
    }).catch(e => console.warn('KI-Statistik sync failed:', e));
  } catch (e) { console.warn('KI-Statistik sync error:', e); }

  // §6-Text AUCH nach Airtable schreiben (non-blocking, als Backup)
  try {
    var recordId = sessionStorage.getItem('prova_record_id') || localStorage.getItem('prova_record_id') || '';
    var az_write = localStorage.getItem('prova_letztes_az') || '';
    if (recordId && az_write) {
      fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'PATCH',
          path: '/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0/' + recordId,
          payload: {
            fields: {
              Stellungnahme_Text: finalText,
              Status: 'Entwurf',
              Gutachten_Typ: selectedTyp,
              Stellungnahme_Datum: ts
            }
          }
        })
      }).catch(e => console.warn('§6 Airtable-Sync:', e));
    }
  } catch(e) { console.warn('§6 Airtable-Write:', e); }

  // Schritt 5 visuell aktivieren
  var fs5 = document.getElementById('flow-step-freigabe');
  if(fs5) { fs5.className = 'flow-step active'; }
  var seps = document.querySelectorAll('.flow-sep');
  if(seps[3]) seps[3].classList.add('done');
  // Kurze Pause damit der User den Fortschritt sieht, dann weiterleiten
  setTimeout(function() {
    window.location.href = az && az !== '—' ? 'freigabe.html?az=' + encodeURIComponent(az) : 'freigabe.html';
  }, 400);
}

/* ── TOAST ── */
let toastTimer;
window.zeigToast = window.zeigToast || window.showToast || function(m){ alert(m); };


/* ─────────────────────────────────────────── */

/* ══════════════════════════════════════════════
   NORMEN SLIDE-PANEL — nutzt zentrale PROVA_NORMEN_DB
   Quelle: normen-logic.js → window.PROVA_NORMEN_DB
══════════════════════════════════════════════ */
// NSP_NORMEN ist jetzt window.PROVA_NORMEN_DB (163 Normen, alle Schadensarten)
// Gefiltert nach aktiver Schadensart beim Öffnen des Panels
var NSP_NORMEN = (window.PROVA_NORMEN_DB && window.PROVA_NORMEN_DB.length)
  ? window.PROVA_NORMEN_DB
  : []; // Fallback: leer wenn normen-logic.js nicht geladen

var nspAktivFilter = 'all';
var nspSuchText = '';

function renderNSP() {
  var list = document.getElementById('nsp-list');
  if (!list) return;

  var gefiltert = NSP_NORMEN.filter(function(n) {
    var saMatch = nspAktivFilter === 'all' || n.sa === 'all' || n.sa === nspAktivFilter;
    var suchMatch = !nspSuchText || 
      n.num.toLowerCase().includes(nspSuchText.toLowerCase()) ||
      n.titel.toLowerCase().includes(nspSuchText.toLowerCase()) ||
      n.gw.toLowerCase().includes(nspSuchText.toLowerCase());
    return saMatch && suchMatch;
  });

  if (!gefiltert.length) {
    list.innerHTML = '<div class="nsp-empty">Keine Normen gefunden — Suchbegriff anpassen</div>';
    return;
  }

  list.innerHTML = gefiltert.map(function(n) {
    return '<div class="nsp-norm-card">' +
      '<div class="nsp-norm-num">' + n.num + '</div>' +
      '<div class="nsp-norm-titel">' + n.titel + '</div>' +
      '<div class="nsp-norm-gw">' + n.gw + '</div>' +
      '<div class="nsp-norm-actions">' +
        '<button class="nsp-norm-insert" onclick="nspEinfuegen(' + JSON.stringify(n) + ')">↙ In §6 einfügen</button>' +
        '<button class="nsp-norm-copy" onclick="nspKopieren(' + JSON.stringify(n.num) + ')">📋 Kopieren</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

window.oeffneNormenPanel = function() {
  document.getElementById('normen-overlay').classList.add('open');
  document.getElementById('normen-slide-panel').classList.add('open');
  renderNSP();
};

window.schliesseNormenPanel = function() {
  document.getElementById('normen-overlay').classList.remove('open');
  document.getElementById('normen-slide-panel').classList.remove('open');
};

window.nspFilter = function(sa, btn) {
  nspAktivFilter = sa;
  document.querySelectorAll('.nsp-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderNSP();
};

window.nspSuche = function(v) {
  nspSuchText = v;
  renderNSP();
};

window.nspEinfuegen = function(norm) {
  // Aktive Textarea finden
  var aktTab = document.querySelector('.weg-tab.active');
  var isB = aktTab && aktTab.dataset.weg === 'B';
  var ta = document.getElementById(isB ? 'svStichpunkte' : 'svTextA');
  if (!ta) ta = document.getElementById('svTextA');

  var text = 'Gemäß ' + norm.num + ' (' + norm.titel + ') gilt: ' + norm.gw;
  
  if (ta) {
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var prefix = ta.value.trim() ? '\n\n' : '';
    ta.value = ta.value.slice(0, start) + prefix + text + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + prefix.length + text.length;
    ta.dispatchEvent(new Event('input'));
    ta.focus();
  }

  // Auch in Queue für andere Seiten
  try {
    var q = JSON.parse(localStorage.getItem('prova_normen_queue') || '[]');
    q.push({num: norm.num, titel: norm.titel, text: text, ts: new Date().toISOString()});
    localStorage.setItem('prova_normen_queue', JSON.stringify(q));
  } catch(e) {}

  schliesseNormenPanel();
  
  // Inline-Bestätigung
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(16,185,129,.12);border:1.5px solid rgba(16,185,129,.35);border-radius:12px;padding:12px 20px;font-size:13px;font-weight:600;color:#10b981;box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap;';
  banner.textContent = '✅ ' + norm.num + ' in §6 eingefügt';
  document.body.appendChild(banner);
  setTimeout(function(){ banner.remove(); }, 2500);
};

window.nspKopieren = function(normNum) {
  navigator.clipboard.writeText(normNum).catch(function(){});
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.3);border-radius:10px;padding:10px 18px;font-size:12px;color:var(--accent);';
  banner.textContent = '📋 ' + normNum + ' kopiert';
  document.body.appendChild(banner);
  setTimeout(function(){ banner.remove(); }, 2000);
};

/* ── KI-Normen-Vorschlag beim Tippen ── */
var NORM_TRIGGER = {
  'schimmel':   ['WTA 6-1-01/D','DIN 68800-1','BGH VII ZR 46/17'],
  'feuchte':    ['WTA 6-1-01/D','DIN 68800-1'],
  'luft':       ['DIN 1946-6','WTA 6-1-01/D'],
  'wasser':     ['VdS 3151','DIN 18533'],
  'estrich':    ['DIN 18353'],
  'putz':       ['DIN 18550','WTA 2-9-04/D'],
  'brand':      ['DIN 4102-1','DIN EN 13501-1'],
  'toleranz':   ['DIN 18202'],
  'mangel':     ['VOB/B §13','§839a BGB'],
  'haftung':    ['§839a BGB','§407a ZPO'],
};

var normVorschlagTimer = null;

function pruefeNormenVorschlag(text) {
  clearTimeout(normVorschlagTimer);
  normVorschlagTimer = setTimeout(function() {
    var textL = text.toLowerCase();
    var vorschlaege = [];
    Object.keys(NORM_TRIGGER).forEach(function(kw) {
      if (textL.includes(kw)) {
        NORM_TRIGGER[kw].forEach(function(n) {
          if (!vorschlaege.includes(n)) vorschlaege.push(n);
        });
      }
    });
    
    var container = document.getElementById('ki-normen-inline');
    if (!container) return;
    
    if (vorschlaege.length > 0) {
      container.className = 'ki-normen-inline show';
      document.getElementById('ki-normen-chips').innerHTML = vorschlaege.slice(0,4).map(function(n) {
        var normObj = NSP_NORMEN.find(function(x){return x.num===n;}) || {num:n,titel:'',gw:''};
        return '<span class="ki-normen-chip" onclick="nspEinfuegen(' + JSON.stringify(normObj) + ')">+ ' + n + '</span>';
      }).join('');
    } else {
      container.className = 'ki-normen-inline';
    }
  }, 1500);
}

// Hook in svTextA
document.addEventListener('DOMContentLoaded', function() {
  var ta = document.getElementById('svTextA');
  if (ta) {
    ta.addEventListener('input', function() {
      pruefeNormenVorschlag(this.value);
    });
  }
  // Schadenart für NSP-Filter vorauswählen
  var sa = localStorage.getItem('prova_schadenart') || '';
  if (sa.toLowerCase().includes('schimmel')) nspAktivFilter = 'SC';
  else if (sa.toLowerCase().includes('wasser')) nspAktivFilter = 'WS';
  else if (sa.toLowerCase().includes('brand')) nspAktivFilter = 'BS';
});



/* ═══════════════════════════════════════════════════════════
   NORMEN SLIDE PANEL — Kontextuell, ohne Seitenwechsel
   ═══════════════════════════════════════════════════════════ */

var _normenPanelData = [];
var _normenPanelGeladen = false;

function oeffneNormenPanel() {
  document.getElementById('normen-panel').classList.add('open');
  document.getElementById('normen-overlay').classList.add('open');
  if (!_normenPanelGeladen) ladeNormenPanel();
  document.getElementById('normen-panel-suche').focus();
}


/* ── TYP-abhängige Normen-Codes ── */
function aktualisiereNormenPanel() {
  var t = selectedTyp || 'gericht';
  var CODE_MAP = {
    gericht:    ['GERICHT'],
    versicherung: ['VERSICHERUNG'],
    privat:     []
  };
  var typCodes = CODE_MAP[t] || [];
  // Normen-Panel Items filtern: Typ-Normen oben anzeigen
  var items = document.querySelectorAll('.nsp-item');
  items.forEach(function(item) {
    var sa = (item.dataset.sa || '').split(',');
    var isTyp = typCodes.some(function(c){ return sa.includes(c); });
    item.classList.toggle('typ-norm', isTyp);
    item.style.order = isTyp ? '-1' : '0';
  });
}
function schliesseNormenPanel() {
  document.getElementById('normen-panel').classList.remove('open');
  document.getElementById('normen-overlay').classList.remove('open');
}

async function ladeNormenPanel() {
  // Aus Cache laden (normen.html cacht in prova_normen_cache)
  try {
    var cached = JSON.parse(localStorage.getItem('prova_normen_cache') || 'null');
    if (cached && cached.length > 0) {
      _normenPanelData = cached;
      _normenPanelGeladen = true;
      renderNormenPanel(_normenPanelData);
      zeigeKINormenVorschlaege();
      return;
    }
  } catch(e) {}

  // Fallback: Kernset direkt eingebettet
  _normenPanelData = [
    {num:'WTA 6-1-01/D',titel:'Leitfaden Wärme- und Feuchteschutz von Außenwänden',gw:'Taupunkt < Oberflächentemperatur; rH < 80% an Oberfläche',sa:'SC'},
    {num:'DIN 68800-1',titel:'Holzschutz — Allgemeines',gw:'Holzfeuchte < 20% (Grenzwert für Schimmelpilzrisiko)',sa:'SC'},
    {num:'DIN 1946-6',titel:'Raumlufttechnik — Lüftung von Wohnungen',gw:'Mindestluftwechsel 0,5/h; Feuchteschutz-Lüftung',sa:'SC'},
    {num:'VdS 3151',titel:'Leitfaden Wasserschäden',gw:'Trocknung bis max. 3% Materialfeuchte; Protokollpflicht',sa:'WS'},
    {num:'DIN 18533',titel:'Abdichtung von erdberührten Bauteilen',gw:'Expositionsklasse W1-E bis W4-E nach Beanspruchung',sa:'WS'},
    {num:'DIN 18550',titel:'Außenputz und Innenputz',gw:'Haftfestigkeit > 0,3 N/mm²; Rissbreite < 0,2mm',sa:'BA'},
    {num:'WTA 2-9-04/D',titel:'Sanierputzsysteme',gw:'Wasseraufnahme w < 0,5 kg/(m²·h⁰·⁵); Haftzug > 0,3 N/mm²',sa:'WS'},
    {num:'DIN 18157',titel:'Ausführung von Keramikbelägen',gw:'Verformung < 1/300 der Stützweite; Verbund > 0,5 N/mm²',sa:'WS'},
    {num:'DIN 4108-2',titel:'Mindestwärmeschutz',gw:'Raumseitig: θsi ≥ θsi,min = fRsi · (θi - θe) + θe',sa:'SC'},
    {num:'BGH VII ZR 46/17',titel:'BGH-Urt. Schimmelbefall Beweislast',gw:'Anscheinsbeweis bei typischem Schadensbild zugunsten Mangel',sa:'SC'},
    {num:'§ 13 VOB/B',titel:'Mängelansprüche des Auftraggebers',gw:'4 Jahre Gewährleistung Bauwerk; Mängelbeseitigungspflicht',sa:'BA'},
    {num:'DIN 4102-1',titel:'Brandverhalten von Baustoffen',gw:'Klassifizierung A1/A2 (nichtbrennbar) bis F (brennbar)',sa:'BS'},
  ];
  _normenPanelGeladen = true;
  renderNormenPanel(_normenPanelData);
  zeigeKINormenVorschlaege();
}

function renderNormenPanel(normen) {
  var el = document.getElementById('normen-panel-list');
  if (!el) return;
  if (!normen.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px;">Keine Normen gefunden</div>';
    return;
  }
  el.innerHTML = normen.map(function(n) {
    return '<div class="normen-panel-item">' +
      '<div class="normen-panel-item-num">' + n.num + '</div>' +
      '<div class="normen-panel-item-titel">' + n.titel + '</div>' +
      '<div class="normen-panel-item-gw">📏 ' + (n.gw || '—') + '</div>' +
      '<div class="normen-panel-item-btn">' +
        '<button class="normen-einfuegen-btn" onclick="normInTextarea(\''+n.num+'\',\''+n.titel+'\',\''+n.gw+'\')">↙ Einfügen</button>' +
        '<button class="normen-einfuegen-btn" style="background:var(--surface2);color:var(--text2);border:1px solid var(--border2);" onclick="normZitatKopieren(\''+n.num+'\')">📋 Zitat</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

function filterNormenPanel(q) {
  if (!q) { renderNormenPanel(_normenPanelData); return; }
  var ql = q.toLowerCase();
  var gefiltert = _normenPanelData.filter(function(n) {
    return n.num.toLowerCase().includes(ql) || n.titel.toLowerCase().includes(ql) || (n.gw||'').toLowerCase().includes(ql);
  });
  renderNormenPanel(gefiltert);
}

function normInTextarea(num, titel, gw) {
  // Aktive Textarea bestimmen
  var activeTab = document.querySelector('.weg-tab.active');
  var isB = activeTab && activeTab.dataset && activeTab.dataset.weg === 'B';
  var ta = document.getElementById(isB ? 'svStichpunkte' : 'svTextA');
  if (!ta) ta = document.getElementById('svTextA');
  if (!ta) return;

  var normText = 'Gemäß ' + num + ' (' + titel + ') gilt: ' + (gw || '');
  var pos = ta.selectionStart || ta.value.length;
  var prefix = ta.value.slice(0, pos);
  var suffix = ta.value.slice(pos);
  ta.value = prefix + (prefix && !prefix.endsWith('\n') ? '\n' : '') + normText + (suffix ? '\n' + suffix : '');
  ta.focus();
  ta.dispatchEvent(new Event('input'));

  // Gespeicherte Queue aktualisieren
  try {
    var q = JSON.parse(localStorage.getItem('prova_normen_queue') || '[]');
    q.push({num:num, titel:titel, text:normText, ts:new Date().toISOString()});
    localStorage.setItem('prova_normen_queue', JSON.stringify(q));
  } catch(e) {}

  // Bestätigung
  var flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(16,185,129,.15);border:1.5px solid rgba(16,185,129,.4);border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;color:#10b981;';
  flash.textContent = '✅ ' + num + ' in §6 eingefügt';
  document.body.appendChild(flash);
  setTimeout(function() { flash.remove(); }, 2000);
}

function normZitatKopieren(num) {
  var n = _normenPanelData.find(function(x) { return x.num === num; });
  if (!n) return;
  var zitat = 'Gemäß ' + n.num + ' (' + n.titel + ') gilt als Grenzwert: ' + (n.gw || '—');
  navigator.clipboard.writeText(zitat).then(function() {
    zeigToast('Zitat kopiert: ' + n.num, 'success');
  });
}

function zeigeKINormenVorschlaege() {
  var sa = localStorage.getItem('prova_schadenart') || '';
  var strip = document.getElementById('ki-norm-strip');
  var chips = document.getElementById('ki-norm-chips');
  if (!strip || !chips || !sa) return;

  var saL = sa.toLowerCase();
  var vorschlaege = _normenPanelData.filter(function(n) {
    if (saL.includes('schimmel') || saL.includes('feuchte')) return n.sa === 'SC';
    if (saL.includes('wasser')) return n.sa === 'WS';
    if (saL.includes('brand')) return n.sa === 'BS';
    if (saL.includes('bau') || saL.includes('mangel')) return n.sa === 'BA';
    return false;
  }).slice(0, 4);

  if (!vorschlaege.length) return;
  strip.style.display = 'block';
  chips.innerHTML = vorschlaege.map(function(n) {
    return '<span class="ki-norm-chip" onclick="normInTextarea(\''+n.num+'\',\''+n.titel+'\',\''+n.gw+'\')">'+n.num+'</span>';
  }).join('');
}

/* Keyboard shortcut: N zum Öffnen/Schließen */
document.addEventListener('keydown', function(e) {
  if (e.key === 'n' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
    e.preventDefault();
    var panel = document.getElementById('normen-panel');
    panel.classList.contains('open') ? schliesseNormenPanel() : oeffneNormenPanel();
  }
});



/* ── WORKFLOW-INTEGRATIONEN: Baubegleitung + Kalk-Notizen ── */
(function ladeWorkflowDaten() {
  // 0. Messwerte aus Akte in §2 vorab laden
  var mwText = localStorage.getItem('prova_messwerte_text') || '';
  if (mwText) {
    localStorage.removeItem('prova_messwerte_text');
    window._pendingMesswerte = mwText;
  }

  // 1. Baubegleitungs-KI-Bericht in §2/§3 einfügen wenn vorhanden
  var bbBericht = sessionStorage.getItem('prova_bb_bericht');
  if (bbBericht) {
    sessionStorage.removeItem('prova_bb_bericht');
    // §2 Textarea befüllen oder Banner anzeigen
    var ta2 = document.getElementById('svTextB') || document.getElementById('sek2-text') ||
              document.querySelector('[data-sektion="2"] textarea') ||
              document.querySelector('textarea[id*="Text"]');
    if (ta2 && !ta2.value.trim()) {
      ta2.value = bbBericht;
      if (typeof showToast === 'function') showToast('Baubegleitungs-Bericht in §2 eingefügt ✅', 'success');
    } else if (typeof showBanner === 'function') {
      showBanner('Baubegleitungs-Bericht verfügbar — manuell in §2 Befund einfügen', 'green', null, null, 6000);
      sessionStorage.setItem('prova_bb_bericht_pending', bbBericht);
    }
  }

  // 2. Kalk-Notizen in §4 einfügen wenn vorhanden
  var kalkNotizen = sessionStorage.getItem('prova_kalk_notizen');
  if (kalkNotizen) {
    sessionStorage.removeItem('prova_kalk_notizen');
    var ta4 = document.getElementById('svTextD') || document.querySelector('[data-sektion="4"] textarea') ||
              document.querySelectorAll('textarea')[3];
    if (ta4) {
      ta4.value = (ta4.value ? ta4.value + '\n' : '') + kalkNotizen;
      if (typeof showToast === 'function') showToast('Kostenberechnung in §4 eingefügt ✅', 'success');
    }
  }
})();




/* ── SLASH-COMMAND (Notion-Style) für §6 Editor ── */
(function() {
  var SLASH_ITEMS = [
    { icon: '⚖️', label: 'Konjunktiv-Phrase einfügen',  text: 'Die Ursache dürfte auf … zurückzuführen sein. ' },
    { icon: '📚', label: 'Norm einfügen',               fn: 'openNormenPanel' },
    { icon: '📝', label: 'Textbaustein einfügen',       fn: 'openTBPanel' },
    { icon: '🔍', label: 'Handlungsempfehlung',         text: 'Es wäre zu empfehlen, dass … umgehend … veranlasst wird. ' },
    { icon: '⚡', label: 'Beweislast-Phrase',           text: 'Die Beweislast für … dürfte beim … liegen. ' },
    { icon: '📐', label: 'Maßangabe einfügen',          text: 'Im Bereich … wurde ein Schadensbild von ca. [Maß] festgestellt. ' },
  ];

  var menu = null;
  var ta = null;

  function createMenu() {
    var el = document.createElement('div');
    el.id = 'slash-menu';
    el.style.cssText = 'position:fixed;z-index:9999;background:var(--bg2,#1a1d2e);border:1px solid var(--border2,rgba(255,255,255,.15));border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.4);padding:6px;min-width:240px;display:none;';
    el.innerHTML = '';
    SLASH_ITEMS.forEach(function(item, i) {
      var d = document.createElement('div');
      d.className = 'slash-item';
      d.setAttribute('data-idx', i);
      d.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;color:var(--text2,#c8d0e0);transition:background .1s;';
      d.innerHTML = '<span style="font-size:16px;width:20px;text-align:center;">' + item.icon + '</span><span>' + item.label + '</span>';
      d.addEventListener('mouseenter', function() { this.style.background = 'var(--surface2,rgba(255,255,255,.06))'; });
      d.addEventListener('mouseleave', function() { this.style.background = ''; });
      el.appendChild(d);
    });
    document.body.appendChild(el);
    return el;
  }

  function showMenu(x, y) {
    if (!menu) menu = createMenu();
    menu.style.left = Math.min(x, window.innerWidth - 260) + 'px';
    menu.style.top  = Math.min(y, window.innerHeight - 280) + 'px';
    menu.style.display = 'block';
    // Item-Klick
    menu.querySelectorAll('.slash-item').forEach(function(el) {
      el.onclick = function() {
        var idx = parseInt(el.dataset.idx);
        var item = SLASH_ITEMS[idx];
        hideMenu();
        // "/" entfernen
        if (ta) {
          var pos = ta.selectionStart;
          ta.value = ta.value.slice(0, pos-1) + ta.value.slice(pos);
          ta.selectionStart = ta.selectionEnd = pos-1;
        }
        if (item.text && ta) {
          var p = ta.selectionStart;
          ta.value = ta.value.slice(0,p) + item.text + ta.value.slice(p);
          ta.selectionStart = ta.selectionEnd = p + item.text.length;
          ta.dispatchEvent(new Event('input'));
        } else if (item.fn === 'openNormenPanel') {
          if (window.PROVA && window.PROVA.openPanel) PROVA.openPanel('normen');
        } else if (item.fn === 'openTBPanel') {
          if (window.PROVA && window.PROVA.openPanel) PROVA.openPanel('textbausteine');
        }
      };
    });
  }

  function hideMenu() {
    if (menu) menu.style.display = 'none';
  }

  // Hook in §6-Textarea
  document.addEventListener('DOMContentLoaded', function() {
    ta = document.getElementById('svTextA');
    if (!ta) return;
    ta.addEventListener('keyup', function(e) {
      var pos = ta.selectionStart;
      var lastChar = ta.value[pos-1];
      if (lastChar === '/') {
        var rect = ta.getBoundingClientRect();
        var lineH = parseInt(getComputedStyle(ta).lineHeight) || 22;
        var lines = ta.value.slice(0, pos).split('\n').length;
        showMenu(rect.left + 8, rect.top + Math.min(lines * lineH, rect.height - 10));
      } else if (e.key === 'Escape') {
        hideMenu();
      } else {
        hideMenu();
      }
    });
  });

  document.addEventListener('click', function(e) {
    if (menu && !menu.contains(e.target)) hideMenu();
  });
})();
/* ── END SLASH-COMMAND ── */


/* ── POSTMESSAGE LISTENER: Textbausteine aus Popup ── */
window.addEventListener('message', function(e) {
  if (!e.data || (e.data.type !== 'prova_baustein' && e.data.type !== 'prova_norm')) return;
  var text = e.data.text || '';
  if (!text) return;
  var ta = document.getElementById('svTextA');
  if (!ta) ta = document.getElementById('svB1');
  if (!ta) return;
  var pos = ta.selectionStart || ta.value.length;
  var prefix = pos > 0 && ta.value[pos-1] !== '\n' ? '\n' : '';
  ta.value = ta.value.slice(0,pos) + prefix + text + '\n' + ta.value.slice(pos);
  ta.selectionStart = ta.selectionEnd = pos + prefix.length + text.length + 1;
  ta.dispatchEvent(new Event('input'));
  if (typeof showToast === 'function') showToast('Textbaustein eingefügt ✅', 'success');
}, false);
/* ── END POSTMESSAGE ── */


/* ══════════════════════════════════════════════════════════
   FEATURE F: NORMEN-PINNWAND
   Lädt Normen aus Starter-Kit (E) und zeigt sie als Chips
   ══════════════════════════════════════════════════════════ */
(function() {
  var _npCollapsed = localStorage.getItem('prova_np_collapsed') === '1';

  function ladeNormenPinnwand() {
    var panel = document.getElementById('normen-pinnwand');
    if (!panel) return;

    // Daten laden: erst AZ-spezifisch, dann generisch
    var data = null;
    try {
      var az = sessionStorage.getItem('prova_current_az')
             || new URLSearchParams(window.location.search).get('az')
             || localStorage.getItem('prova_letztes_az')
             || '';

      if (az && az !== '—') {
        var azData = localStorage.getItem('prova_fall_normen_' + az);
        if (azData) data = JSON.parse(azData);
      }
      if (!data) {
        var generic = localStorage.getItem('prova_starter_kit_aktiv');
        if (generic) data = JSON.parse(generic);
      }
    } catch(e) {}

    if (!data || !data.normen || !data.normen.length) {
      panel.style.display = 'none';
      return;
    }

    // Label
    var label = document.getElementById('np-schadenart-label');
    var kitName = data.schadenart || (data.kit ? (window.STARTER_KITS && window.STARTER_KITS[data.kit] ? window.STARTER_KITS[data.kit].name : data.kit) : '');
    if (label) label.textContent = kitName ? kitName + ' — Referenz-Normen' : 'Referenz-Normen';

    // Count
    var countEl = document.getElementById('np-count');
    if (countEl) countEl.textContent = data.normen.length;

    // Chips
    var chipsEl = document.getElementById('np-chips');
    if (chipsEl) {
      chipsEl.innerHTML = '';
      data.normen.forEach(function(n) {
        var btn = document.createElement('button');
        btn.className = 'np-chip';
        btn.title = 'Klick: In Zwischenablage kopieren\n' + escNp(n.titel);
        btn.setAttribute('data-num', escNp(n.num));
        btn.setAttribute('data-titel', escNp(n.titel));
        btn.onclick = function() { npCopyNorm(this.getAttribute('data-num'), this.getAttribute('data-titel')); };
        btn.innerHTML = '<span>📌</span><span>' + escNp(n.num) + '</span><span class="np-chip-title">' + escNp(n.titel) + '</span>';
        chipsEl.appendChild(btn);
      });
    }

    // Hinweise
    var hinEl = document.getElementById('np-hinweise');
    if (hinEl && data.hinweise && data.hinweise.length) {
      hinEl.innerHTML = data.hinweise.map(function(h) {
        return '<span class="np-hinweis">💡 ' + escNp(h) + '</span>';
      }).join('');
    }

    // Panel anzeigen + Collapse-State
    panel.style.display = 'flex';
    if (_npCollapsed) {
      panel.classList.add('collapsed');
      var btn = document.getElementById('np-toggle-btn');
      if (btn) btn.textContent = '▼ Ausklappen';
    }
  }

  window.toggleNormenPinnwand = function() {
    var panel = document.getElementById('normen-pinnwand');
    var btn = document.getElementById('np-toggle-btn');
    if (!panel) return;
    _npCollapsed = !_npCollapsed;
    localStorage.setItem('prova_np_collapsed', _npCollapsed ? '1' : '0');
    panel.classList.toggle('collapsed', _npCollapsed);
    if (btn) btn.textContent = _npCollapsed ? '▼ Ausklappen' : '▲ Einklappen';
  };

  window.npCopyNorm = function(num, titel) {
    var text = num + ': ' + titel;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        _npToast('📋 ' + num + ' kopiert');
      }).catch(function() { _npToastFallback(text); });
    } else {
      _npToastFallback(text);
    }
  };

  function _npToastFallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); _npToast('📋 Kopiert'); } catch(e) {}
    ta.remove();
  }

  function _npToast(msg) {
    var t = document.getElementById('np-copy-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2000);
  }

  function escNp(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Init: nach DOM-Ready laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ladeNormenPinnwand);
  } else {
    ladeNormenPinnwand();
  }

})();


/* ══════════════════════════════════════════════════════════
   SLASH COMMANDS — Raycast/Notion-Style für §6 Textareas
   Trigger: '/' → floating Picker mit Normen + Textbausteinen
   ══════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var _menu = null;
  var _targetTA = null;
  var _slashPos = -1;
  var _activeIdx = -1;
  var _items = [];

  /* ── Standard-Phrasen für Sachverständige ── */
  var PHRASEN = [
    { title: 'Sichtbefund positiv',   text: 'Im Rahmen der Ortsinaugenscheinnahme wurden folgende Schäden festgestellt:', typ: 'phrase', icon: '📋' },
    { title: 'Kein Befund',            text: 'Im Bereich [Bereich] konnten keine relevanten Schäden festgestellt werden.', typ: 'phrase', icon: '✅' },
    { title: 'Messwert-Einleitung',    text: 'Die durchgeführten Feuchtemessungen ergaben folgende Werte:', typ: 'phrase', icon: '📊' },
    { title: 'Normbezug einleiten',    text: 'Gemäß [Norm] ist festzustellen, dass', typ: 'phrase', icon: '⚖️' },
    { title: 'Sanierung empfehlen',    text: 'Zur Behebung des Schadens wird folgende Sanierungsmaßnahme empfohlen:', typ: 'phrase', icon: '🔧' },
    { title: 'Kausalität Konjunktiv', text: 'Als Ursache für den festgestellten Schaden käme in Betracht:', typ: 'phrase', icon: '🔍' },
    { title: 'Fotoverweis',            text: 'Zur Dokumentation wird auf die beigefügte Foto-Anlage (Bild [Nr.]) verwiesen.', typ: 'phrase', icon: '📷' },
    { title: 'Dringlichkeit',          text: 'Aufgrund des fortgeschrittenen Schadensbildes wird eine umgehende Schadensbehebung empfohlen.', typ: 'phrase', icon: '⚠️' },
  ];

  /* ── Daten sammeln (Normen + Textbausteine + Phrasen) ── */
  function _getAllItems() {
    var all = [];

    // 1. Pinnwand-Normen zuerst (aus Starter-Kit — höchste Relevanz)
    try {
      var kitRaw = localStorage.getItem('prova_starter_kit_aktiv');
      if (kitRaw) {
        var kit = JSON.parse(kitRaw);
        if (kit.normen) {
          kit.normen.forEach(function(n) {
            all.push({ title: n.num, sub: n.titel, text: n.num + ': ' + n.titel, typ: 'norm', icon: '📌', pinned: true });
          });
        }
      }
    } catch(e) {}

    // 2. NORMEN_DB (falls verfügbar)
    if (window.NORMEN_DB && window.NORMEN_DB.length) {
      var added = all.map(function(i){return i.title;});
      window.NORMEN_DB.slice(0, 20).forEach(function(n) {
        var num = n.n || n.num || '';
        if (num && added.indexOf(num) === -1) {
          all.push({ title: num, sub: n.t || n.titel || '', text: num + ': ' + (n.t || n.titel || ''), typ: 'norm', icon: '📚' });
        }
      });
    }

    // 3. Textbausteine aus localStorage
    try {
      var tb = JSON.parse(localStorage.getItem('prova_textbausteine') || '[]');
      tb.slice(0, 30).forEach(function(b) {
        all.push({ title: b.titel || b.name || '—', sub: (b.text || '').slice(0, 60) + '…', text: b.text || '', typ: 'baustein', icon: '📝' });
      });
    } catch(e) {}

    // 4. Standard-Phrasen
    PHRASEN.forEach(function(p) {
      all.push({ title: p.title, sub: p.text.slice(0, 55) + '…', text: p.text, typ: 'phrase', icon: p.icon });
    });

    return all;
  }

  /* ── Filter nach Query ── */
  function _filter(q) {
    var all = _getAllItems();
    if (!q) return all.slice(0, 12);
    var ql = q.toLowerCase();
    return all.filter(function(i) {
      return (i.title + ' ' + i.sub).toLowerCase().indexOf(ql) !== -1;
    }).slice(0, 12);
  }

  /* ── Menu öffnen ── */
  function _open(ta) {
    _close();
    _targetTA = ta;
    _menu = document.createElement('div');
    _menu.className = 'slash-menu';
    _menu.id = 'slash-menu';
    _menu.innerHTML = '<div class="slash-search">'
      + '<span class="slash-search-icon">⌘</span>'
      + '<input class="slash-search-input" id="slash-input" placeholder="Norm, Baustein oder Phrase suchen…" autocomplete="off">'
      + '<span class="slash-search-kbd">ESC</span>'
      + '</div>'
      + '<div class="slash-body" id="slash-body"></div>'
      + '<div class="slash-footer">'
      +   '<div class="slash-footer-hint"><kbd>↑↓</kbd> Navigieren</div>'
      +   '<div class="slash-footer-hint"><kbd>↵</kbd> Einfügen</div>'
      +   '<div class="slash-footer-hint"><kbd>ESC</kbd> Schließen</div>'
      + '</div>';

    document.body.appendChild(_menu);
    _positionMenu(ta);
    _render('');

    var inp = document.getElementById('slash-input');
    if (inp) {
      inp.focus();
      inp.addEventListener('input', function() { _render(this.value); _activeIdx = 0; _updateActive(); });
      inp.addEventListener('keydown', _onMenuKey);
    }

    // Click outside schließt
    setTimeout(function() {
      document.addEventListener('click', _onOutsideClick, true);
    }, 50);
  }

  /* ── Menu positionieren (unter Caret) ── */
  function _positionMenu(ta) {
    if (!_menu || !ta) return;
    var rect = ta.getBoundingClientRect();
    var menuH = 360;
    var top = rect.bottom + 6;
    if (top + menuH > window.innerHeight - 20) top = rect.top - menuH - 6;
    var left = rect.left;
    if (left + 320 > window.innerWidth - 16) left = window.innerWidth - 336;
    _menu.style.top = top + 'px';
    _menu.style.left = Math.max(8, left) + 'px';
  }

  /* ── Items rendern ── */
  function _render(q) {
    _items = _filter(q);
    var body = document.getElementById('slash-body');
    if (!body) return;
    if (!_items.length) {
      body.innerHTML = '<div class="slash-empty">Nichts gefunden für „' + _esc(q) + '"</div>';
      return;
    }

    // Nach Typ gruppieren
    var pinned   = _items.filter(function(i){return i.pinned;});
    var normen   = _items.filter(function(i){return i.typ==='norm' && !i.pinned;});
    var bausteine= _items.filter(function(i){return i.typ==='baustein';});
    var phrasen  = _items.filter(function(i){return i.typ==='phrase';});

    var html = '';
    var idx = 0;
    function group(label, arr) {
      if (!arr.length) return;
      html += '<div class="slash-section-label">' + label + '</div>';
      arr.forEach(function(item) {
        var iconClass = item.typ === 'norm' ? 'norm' : item.typ === 'baustein' ? 'baustein' : 'phrase';
        html += '<div class="slash-item" data-idx="' + idx + '" onclick="slashInsert(' + idx + ')">'
          + '<div class="slash-item-icon ' + iconClass + '">' + item.icon + '</div>'
          + '<div class="slash-item-body">'
          +   '<div class="slash-item-title">' + _esc(item.title) + '</div>'
          +   '<div class="slash-item-sub">' + _esc(item.sub) + '</div>'
          + '</div>'
          + (item.pinned ? '<span class="slash-item-badge">📌 Kit</span>' : '')
          + '</div>';
        idx++;
      });
    }

    if (pinned.length)    group('📌 Starter-Kit Normen', pinned);
    if (normen.length)    group('📚 Normen', normen);
    if (bausteine.length) group('📝 Textbausteine', bausteine);
    if (phrasen.length)   group('💬 Phrasen', phrasen);

    body.innerHTML = html;
    _activeIdx = 0;
    _updateActive();
  }

  /* ── Aktives Item markieren ── */
  function _updateActive() {
    var items = document.querySelectorAll('.slash-item');
    items.forEach(function(el, i) { el.classList.toggle('slash-active', i === _activeIdx); });
    var active = document.querySelector('.slash-item.slash-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  /* ── Tastaturnavigation ── */
  function _onMenuKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); _activeIdx = Math.min(_activeIdx + 1, _items.length - 1); _updateActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); _activeIdx = Math.max(_activeIdx - 1, 0); _updateActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); _insertItem(_activeIdx); }
    else if (e.key === 'Escape') { e.preventDefault(); _close(); _restoreFocus(); }
  }

  /* ── Einfügen ── */
  window.slashInsert = function(idx) { _insertItem(idx); };

  function _insertItem(idx) {
    var item = _items[idx];
    if (!item || !_targetTA) { _close(); return; }

    var ta = _targetTA;
    var val = ta.value;
    var start = _slashPos;
    var end = ta.selectionStart;

    // Slash-Trigger + getippte Query ersetzen
    var before = val.slice(0, start);
    var after  = val.slice(end);
    ta.value = before + item.text + ' ' + after;
    ta.selectionStart = ta.selectionEnd = (before + item.text + ' ').length;

    // Event feuern damit PROVA den Inhalt registriert
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    _close();
    ta.focus();

    // Toast
    _showSlashToast('✅ ' + item.title + ' eingefügt');
  }

  function _restoreFocus() { if (_targetTA) _targetTA.focus(); }

  /* ── Schließen ── */
  function _close() {
    if (_menu) { _menu.remove(); _menu = null; }
    document.removeEventListener('click', _onOutsideClick, true);
    _items = [];
    _activeIdx = -1;
    _slashPos = -1;
  }

  function _onOutsideClick(e) {
    if (_menu && !_menu.contains(e.target)) _close();
  }

  /* ── Toast ── */
  function _showSlashToast(msg) {
    var t = document.getElementById('np-copy-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2000);
  }

  /* ── Escape ── */
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ── Textarea-Listener einrichten ── */
  function _attachSlash(ta) {
    ta.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && _menu) { _close(); return; }
    });

    ta.addEventListener('keyup', function(e) {
      if (_menu) return; // Menu schon offen

      // Slash nur am Zeilenanfang oder nach Whitespace
      var pos = ta.selectionStart;
      var val = ta.value;
      var before = val.slice(0, pos);

      if (e.key === '/' || (e.key !== 'Escape' && before.endsWith('/'))) {
        var charBefore = before.slice(0, -1);
        var isStart = charBefore.length === 0
                   || /[\s\S]$/.test(charBefore);

        if (isStart) {
          _slashPos = pos - 1; // Position des '/'
          _open(ta);
        }
      }
    });
  }

  /* ── Init: alle sv-textareas anbinden ── */
  function _init() {
    var ids = ['svTextA','svB1','svB2','svB3','svTextEdit'];
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) _attachSlash(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();


/* ══════════════════════════════════════════════════════════
   FOCUS MODE — iA Writer / Notion Style
   ══════════════════════════════════════════════════════════ */
(function() {
  var _focusActive = false;

  window.toggleFocusMode = function() {
    _focusActive = !_focusActive;
    document.body.classList.toggle('focus-mode', _focusActive);

    var btn    = document.getElementById('focus-btn');
    var icon   = document.getElementById('focus-btn-icon');
    var label  = document.getElementById('focus-btn-label');

    if (_focusActive) {
      if (icon)  icon.textContent  = '⛶';
      if (label) label.textContent = 'Beenden';
      // Fokus auf aktives Textarea
      var activeTA = _getActiveTA();
      if (activeTA) {
        setTimeout(function() {
          activeTA.focus();
          activeTA.setSelectionRange(activeTA.value.length, activeTA.value.length);
        }, 320);
      }
    } else {
      if (icon)  icon.textContent  = '⛶';
      if (label) label.textContent = 'Fokus';
    }

    // Zeichen in Focus-Bar aktualisieren
    _updateFocusBar();
  };

  function _getActiveTA() {
    var ids = ['svTextA','svB1','svB2','svB3','svTextEdit'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.offsetParent !== null) return el; // erstes sichtbares
    }
    return null;
  }

  function _updateFocusBar() {
    var charEl = document.getElementById('focus-char-count');
    if (!charEl) return;
    var ta = _getActiveTA();
    var len = ta ? ta.value.trim().length : 0;
    charEl.textContent = len + ' Zeichen' + (len >= 700 ? ' ✓' : ' (mind. 700)');
    charEl.classList.toggle('ok', len >= 700);
  }

  // Zeichenanzahl live in Focus-Bar aktualisieren
  ['svTextA','svB1','svB2','svB3','svTextEdit'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function() { if (_focusActive) _updateFocusBar(); });
  });

  // ESC beendet Focus Mode
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && _focusActive) {
      // Slash-Menu hat Vorrang — nur Focus beenden wenn Menu zu
      var menu = document.getElementById('slash-menu');
      if (!menu) toggleFocusMode();
    }
    // F-Taste als Shortcut (wenn kein Input fokussiert)
    if (e.key === 'F' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var tag = document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        toggleFocusMode();
      }
    }
  });

})();



/* ─────────────────────────────────────────── */

/* ── Auto-Grow Textareas (Notion-Stil) ── */
(function(){
  function grow(el){
    el.style.height='auto';
    el.style.height=Math.max(100,el.scrollHeight)+'px';
  }
  function attachGrow(el){
    if(el.dataset.ag)return;
    el.dataset.ag='1';
    el.style.overflow='hidden';
    el.style.resize='none';
    el.addEventListener('input',function(){grow(this);});
    grow(el);
  }
  function initAll(){
    document.querySelectorAll('textarea').forEach(attachGrow);
  }
  document.addEventListener('DOMContentLoaded',initAll);
  new MutationObserver(initAll).observe(document.body,{childList:true,subtree:true});
})();


/* ─────────────────────────────────────────── */

/* ── KI-Assist für §6 ── */
async function starteKIAssist(typ) {
  var btn = event.currentTarget;
  var origText = btn.innerHTML;
  btn.innerHTML = '⏳ KI denkt…';
  btn.disabled = true;
  
  try {
    var diktat = localStorage.getItem('prova_transkript') || '';
    var az = (new URLSearchParams(location.search)).get('az') || '';
    var schadenart = localStorage.getItem('prova_current_schadenart') || '';
    
    var resp = await fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        action: 'assistInline',
        feld: typ === 'freitext' ? 'fachurteil_freitext' : 'fachurteil_' + typ,
        diktat: diktat,
        schadenart: schadenart,
        az: az,
        kontext: 'Formulierungshilfe für §6 Fachurteil. Konjunktiv II Pflicht. Nicht kopierbar.'
      })
    });
    
    var data = await resp.json();
    if(data.text) {
      // Vorschlag in Overlay zeigen, nicht direkt einfügen
      var overlay = document.getElementById('ki-assist-overlay') || createAssistOverlay();
      document.getElementById('ki-assist-text').textContent = data.text;
      overlay.style.display = 'flex';
    }
  } catch(e) {
    if(window.showToast) showToast('KI-Assist nicht verfügbar', 'warn');
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

function createAssistOverlay() {
  var el = document.createElement('div');
  el.id = 'ki-assist-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9900;display:none;align-items:center;justify-content:center;';
  el.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;max-width:560px;width:90%;padding:20px;">'
    + '<div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">🤖 KI-Formulierungshilfe — Nicht kopierbar</div>'
    + '<div id="ki-assist-text" style="font-size:13px;line-height:1.8;color:var(--text2);user-select:none;-webkit-user-select:none;background:rgba(79,142,247,.05);border-radius:8px;padding:14px;margin-bottom:14px;"></div>'
    + '<div style="font-size:11px;color:var(--text3);margin-bottom:12px;">Nutzen Sie diese Orientierung — schreiben Sie §6 in Ihren eigenen Worten.</div>'
    + '<button onclick="(function(){var o=document.getElementById(\'ki-assist-overlay\');if(o)o.style.display=\'none\'})()"'
    + ' style="padding:8px 18px;border-radius:7px;border:none;background:var(--accent);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Schließen</button>'
    + '</div>';
  document.body.appendChild(el);
  return el;
}


/* ─────────────────────────────────────────── */

/* ════════════════════════════════════════════════
   KI-ASSIST — 5 Aktionen, PROVA-Vorschlag Box
   Direkt via ki-proxy (kein Make.com)
════════════════════════════════════════════════ */
var _kiAktiveTextarea = null;
var _kiVorschlag = null;

// Aktives Textarea verfolgen
document.addEventListener('focusin', function(e) {
  if (e.target.tagName === 'TEXTAREA') {
    _kiAktiveTextarea = e.target;
  }
});


/* ════════════════════════════════════════════════════════════════════
   PROVA KI_PROMPTS — Universell für alle Gutachtenarten
   Architektiert nach §407a ZPO, IHK, Verband-Standards
   Fachvokabular für 7 Schadenarten + 3 Auftragstypen
════════════════════════════════════════════════════════════════════ */

/* ── Fachkontext pro Schadenart ── */
function _fachkontext(schadenart) {
  var sa = (schadenart || '').toLowerCase();
  
  if (sa.includes('schimmel') || sa === 'sch') return {
    normen: 'WTA 6-1-01/D, DIN 4108-2 (Mindestwärmeschutz), DIN 4108-3, DIN EN ISO 13788 (Hygrothermik), DIN 68800-1 (Holzschutz), DIN 1946-6 (Lüftung), DIN EN ISO 16000-1 (Schimmelmessung), UBA-Leitfaden Schimmelpilze',
    grenzwerte: 'fRsi ≥ 0,70 (Schimmelvermeidung) · Materialfeuchte >20% = kritisch · Holzfeuchte >18% = Schimmelrisiko · rel. Luftfeuchte >80% an Oberflächen = schimmelkritisch · Taupunkt bei 15°C / 70% r.F. ≈ 9,4°C',
    fachbegriffe: 'Taupunktunterschreitung, Kondensatbildung, Wärmebrückeneffekt, Sorptionsisotherme, kapillarer Feuchtetransport, Diffusionswiderstandszahl μ, interstitielle Kondensation, Desorptionsfeuchte, Materialfeuchte nach CM-Methode'
  };
  
  if (sa.includes('wasser') || sa === 'was') return {
    normen: 'DIN 18533 (Abdichtung erdberührt), DIN 18534 (Nassraum), DIN 18535, VdS 3151 (Trocknung), DIN 18353 (Estrich-CM), DIN EN 13564 (Rückstauschutz), DIN EN 805 (Druckprüfung), DIN 1986-100 (Grundstücksentwässerung)',
    grenzwerte: 'CM-Messung: Zementestrich ≤ 2,0%, Anhydritestrich ≤ 0,5% · Holzfeuchte Zielwert ≤ 15% · Mauerwerk KMG ≤ 3% · Rückstauebene = Straßenoberkante · Druckprüfung 1,5-facher Betriebsdruck',
    fachbegriffe: 'CM-Messung (Calciumcarbid-Methode), Estrichrestfeuchte, Kapillarwirkung, Leckageortung, Sanierputzsystem, Trocknungsmonitoring, Wandfeuchtemessung elektrisch/gravimetrisch, Abdichtungsnachweis'
  };
  
  if (sa.includes('brand') || sa === 'bra') return {
    normen: 'DIN 4102-4 (Feuerwiderstandsklassen), DIN EN 13501-2 (Klassifizierung Feuerwiderstand), TRGS 519 (Asbest), GefStoffV §14 (Schadstoffmessung), DIN EN 1991-1-2 (Naturbrandmodell), AVV 17 06 01* (Asbesthaltige Bauabfälle)',
    grenzwerte: 'Stahl verliert Tragfähigkeit ab 500°C · Holz Pyrolyse ab 270°C, Entzündung ab 350°C · Beton Gefügeschäden ab 300°C · Ziegelstein Gefügeschäden ab 600°C',
    fachbegriffe: 'Verkohlungstiefe, Rußablagerung, Rauchgaskorrosion, HCl-Bildung (PVC), Brandlast, Brandausbreitungsgeschwindigkeit, thermische Dehnung, Rekristallisationstemperatur Stahl, Asbest-Grenzwert'
  };
  
  if (sa.includes('sturm') || sa === 'stu') return {
    normen: 'DIN EN 1991-1-4 (Windlasten), DIN 18338 (Dachdeckung VOB/ATV), ZVDH Regelwerk, DIN EN 1991-1-3 (Schneelasten), DIN 4108-3 (Schlagregen), Fachregel Dachdeckerhandwerk',
    grenzwerte: 'Windzone 1–4 (Böengeschwindigkeit 22,5–30 m/s) · Mindestdachneigung Tonziegel 22°, Betondachstein 18° · Schneelastzone 1–3 (0,65–2,10 kN/m²) · Windsogsicherung: 2-fache Sicherheit',
    fachbegriffe: 'Windlastzone, Böengeschwindigkeit, Windsogsicherung, Firstanschluss, Traufausbildung, Unterspannbahn, Konterlattung, Lattung, Dachneigungsminimum, Verdübelung, Wellenspitzengeschwindigkeit'
  };
  
  if (sa.includes('bau') || sa.includes('mängel') || sa === 'bau') return {
    normen: 'VOB/B §13 (Gewährleistung 4 Jahre), DIN 18202 (Toleranzen Hochbau), DIN 55699 (WDVS), DIN EN 206 (Beton Expositionsklassen), §633 BGB (Sachmangel), §634 BGB (Rechte), §648a BGB (Bauhandwerkersicherung)',
    grenzwerte: 'Ebenheit Boden: max. 5 mm auf 4 m · Hohllagen Fliesen ≤ 5% · WDVS Haftfestigkeit ≥ 0,25 N/mm² · Beton Expositionsklasse XC1–XF4 · Rissbreite Beton: zul. 0,1–0,4 mm je Exposition',
    fachbegriffe: 'Soll-Ist-Abweichung, Ebenheitstoleranz DIN 18202, verdeckter Mangel, anerkannte Regeln der Technik, Gebrauchstauglichkeit, Standsicherheit, Dauerhaftigkeit, Hohllagenklopfprobe, Bewehrungsüberdeckung'
  };
  
  if (sa.includes('elementar') || sa === 'ele') return {
    normen: 'DIN EN 13564 (Rückstauschutz), DIN 4095 (Drainage), DIN EN 1997-1 (Geotechnik), DIN 4020 (Baugrunduntersuchungen), DIN EN 1991-1-3 (Schneelasten), DIN EN 1991-1-4 (Windlasten), WHG (Wasserhaushaltsgesetz)',
    grenzwerte: 'Rückstauebene = Straßenoberkante · Erddruckbelastung nach DIN EN 1997-1 · Hochwassermarke HQ100 (100-jährliches Hochwasser) · Grundwasserstand als Bemessungsgrundlage',
    fachbegriffe: 'Hochwassermarke, Erddruckbelastung, Rückstausicherung, Drainagesystem, hydraulischer Grundbruch, kapillare Saugzone, Bodensenkung, Setzungsriss, Auftriebssicherung'
  };
  
  if (sa.includes('beweis') || sa === 'bws') return {
    normen: '§485 ZPO (Selbständiges Beweisverfahren), §487 ZPO (Inhalt des Antrags), §492 ZPO (Durchführung), DIN 18202 (Toleranzen), DIN EN ISO 17123 (Messverfahren), §407a ZPO (Pflichten des SV)',
    grenzwerte: 'Rissbreite in mm (Messloupe, Rissmaßstab) · Feuchte nach CM-Methode · Schallschutz nach DIN 4109 · Wärmedurchgangskoeffizient U-Wert',
    fachbegriffe: 'Ist-Zustand-Dokumentation, bewertungsfreie Dokumentation, Beweisaufnahme nach §492 ZPO, Messprotokolle, Fotodokumentation, Rissmonitoring, Beweisfragen aus Beweisbeschluss'
  };
  
  // Universal-Fallback
  return {
    normen: 'VOB/B §13, DIN 18202, BGB §633 ff., §407a ZPO, DIN 276 (Kosten im Bauwesen), §823 BGB',
    grenzwerte: 'Anerkannte Regeln der Technik gemäß aktueller DIN-Normen',
    fachbegriffe: 'Gebrauchstauglichkeit, Standsicherheit, Dauerhaftigkeit, Mitursächlichkeit, Beweisführungslast, Kausalitätsprüfung'
  };
}

/* ── Typ-spezifische Normen (Gericht / Versicherung / Privat) ── */
function _typNormen(typ) {
  if (typ === 'gericht') return '§407a ZPO (Persönliche Erstattungspflicht), §411 ZPO (Schriftliches Gutachten), §412 ZPO (Neues Gutachten), §404 ZPO (Auswahl ö.b.u.v.), §287 ZPO (Schadensschätzung), JVEG';
  if (typ === 'versicherung') return 'VdS 2021 (Leitlinien Sachverständige), GDV AFB 2010 (Feuer), GDV AWB 2010 (Wasser/Gebäude), VdS 3151 (Trocknung), Allgemeine Bedingungen des Versicherungsscheins';
  return '§633 BGB (Sachmangel), §634 BGB (Rechte bei Mängeln), §637 BGB (Selbstvornahme), §438 BGB (Verjährung 5 Jahre Bauwerk), §444 BGB (Arglistige Täuschung), VOB/B §13';
}

/* ── KI_PROMPTS — 5 Aufgaben, vollständig fachkontextualisiert ── */
var KI_PROMPTS = {

  assist: function(schadenart, typ) {
    var fk = _fachkontext(schadenart);
    var tn = _typNormen(typ || 'privat');
    return [
      'Du bist ö.b.u.v. Bausachverständiger mit 30 Jahren Gerichtserfahrung.',
      'RECHTSRAHMEN: §407a ZPO — persönliche Erstattungspflicht. NIEMALS Indikativ bei Kausal- oder Bewertungsaussagen.',
      'SCHADENART: ' + (schadenart || 'Baumängel'),
      'RELEVANTE NORMEN: ' + fk.normen,
      'TYP-SPEZIFISCH: ' + tn,
      'GRENZWERTE: ' + fk.grenzwerte,
      'FACHVOKABULAR: ' + fk.fachbegriffe,
      'KONJUNKTIV II für alle Kausal- und Schlussfolgerungsaussagen: ist→dürfte sein | liegt→dürfte liegen | führt→dürfte führen | verursacht→dürfte verursacht haben.',
      'VERBOTEN: Indikativ bei Ursachenaussagen. ERLAUBT im Indikativ: Messwerte, Sichtbefunde.',
      'Formuliere 3-4 fachlich fundierte Sätze auf Gerichtsgutachten-Niveau. Nur den Text zurückgeben.'
    ].join('\n');
  },

  konjunktiv: function(schadenart) {
    return [
      'Wandle den folgenden Text vollständig in korrekten Konjunktiv II um.',
      'Fachwissen Schadenart: ' + (schadenart || 'Baumängel') + ' einbeziehen.',
      'Regeln: ist→dürfte sein | liegt→dürfte liegen | führt→dürfte führen | verursacht→dürfte verursacht haben.',
      'VERBOTEN: Indikativ bei Kausal- und Bewertungsaussagen.',
      'ERLAUBT im Indikativ: Messwerte, Sichtbefunde, Laborergebnisse.',
      'Nur den korrigierten Text zurückgeben, keine Erklärungen.'
    ].join('\n');
  },

  qualitaet: function(schadenart) {
    var fk = _fachkontext(schadenart);
    return [
      'Du bist Qualitätsprüfer für Gerichtsgutachten nach §407a ZPO.',
      'PRÜFKRITERIEN: Konjunktiv II bei allen Kausalaussagen | Keine Spekulation | Fachterminologie korrekt.',
      'SCHADENART: ' + (schadenart || 'Baumängel'),
      'NORMEN: ' + fk.normen,
      'Bewerte den Text: Konjunktiv II korrekt verwendet? Alle Fakten belegt? Empfehlung: Freigeben/Überarbeiten.',
      'Antwort: JSON {qualitaet: 0-100, konjunktiv_ok: bool, empfehlung: string, hinweise: [string]}'
    ].join('\n');
  }

}

window.kiAssist = async function(typ) {
  window._kjAktivTa = null; // Reset nach Aufruf
  var ta = (_kiAktiveTextarea && document.contains(_kiAktiveTextarea)) ? _kiAktiveTextarea : null;
  if (!ta) ta = document.getElementById('svTextA') || document.querySelector('textarea');
  var currentText = ta ? ta.value.trim() : '';
  
  var btn = event && event.currentTarget;
  if (btn) btn.style.opacity = '.5';
  
  var diktat = localStorage.getItem('prova_transkript') || '';
  var schadenart = localStorage.getItem('prova_current_schadenart')
                || localStorage.getItem('prova_schadenart') || '';
  var az = (new URLSearchParams(location.search)).get('az') || '';
  
  // Diktat aus allen 3 Quellen
  var diktatNachtrag = localStorage.getItem('prova_diktat_nachtrag') || '';
  var manuellText = localStorage.getItem('prova_manuell_text') || '';
  var vollDiktat = [diktat, manuellText, diktatNachtrag].filter(Boolean).join('\n\n');
  
  // Typ für kontextspezifische Normen
  var typ = localStorage.getItem('prova_stellungnahme_typ') || localStorage.getItem('prova_auftragstyp') || 'privat';
  
  // Prompt aus KI_PROMPTS mit Fachkontext
  var promptFn = KI_PROMPTS[typ === 'assist' ? 'assist' : typ] || KI_PROMPTS[typ];
  if (!promptFn && KI_PROMPTS[typ + '']) promptFn = KI_PROMPTS[typ];
  
  var aufgabeFnMap = {assist: KI_PROMPTS.assist, konjunktiv: KI_PROMPTS.konjunktiv, neutral: KI_PROMPTS.neutral, ausformulieren: KI_PROMPTS.ausformulieren, kuerzen: KI_PROMPTS.kuerzen};
  var aufgabeFn = aufgabeFnMap[typ] || aufgabeFnMap.assist;
  var aufgabe = typeof aufgabeFn === 'function' ? aufgabeFn(schadenart, typ) : aufgabeFn;
  
  var kontext = 'Schadenfall: ' + schadenart + ' · AZ: ' + az;
  if (vollDiktat) kontext += '\nBefund-Diktat (alle Quellen):\n' + vollDiktat.substring(0, 800);
  
  var prompt = aufgabe + '\n\nKontext:\n' + kontext
             + '\n\nText des Sachverständigen:\n'
             + (currentText || '[noch leer — bitte kurze Stichpunkte eingeben]');
  
  try {
    var res = await fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        aufgabe: 'assist_inline',
        prompt: prompt,
        schadenart: schadenart,
        max_tokens: 400
      })
    });
    var data = await res.json();
    var vorschlag = data.vorschlag || data.text || data.result
                 || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
                 || '';
    if (vorschlag) {
      var box = document.getElementById('ki-vorschlag-box');
      var txt = document.getElementById('ki-vorschlag-text');
      if (txt) txt.textContent = vorschlag;
      if (box) box.style.display = 'block';
      _kiVorschlag = { text: vorschlag, ta: ta };
      if (window.showToast) showToast('KI-Vorschlag bereit — prüfen und entscheiden', 'default', 3000);
    }
  } catch(e) {
    console.warn('KI-Assist:', e);
    if (window.showToast) showToast('KI-Assist momentan nicht verfügbar', 'warn');
  } finally {
    if (btn) btn.style.opacity = '1';
  }
};

window.kiVorschlagUebernehmen = function() {
  if (!_kiVorschlag || !_kiVorschlag.ta) return;
  var ta = _kiVorschlag.ta;
  // Am Cursor einfügen oder als Ersatz wenn Selektion
  var start = ta.selectionStart !== undefined ? ta.selectionStart : ta.value.length;
  var end = ta.selectionEnd !== undefined ? ta.selectionEnd : start;
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(end);
  var sep = (before && !before.endsWith(' ') && !before.endsWith('\n')) ? ' ' : '';
  ta.value = before + sep + _kiVorschlag.text + (after ? ' ' + after.trimStart() : '');
  ta.dispatchEvent(new Event('input', {bubbles:true}));
  // KJ-Recheck nach Insertion (Bug-Fix aus Session 22)
  setTimeout(function() {
    ta.dispatchEvent(new Event('input', {bubbles:true}));
    if (typeof onInputA === 'function' && ta.id === 'svTextA') onInputA();
    if (typeof onInputB === 'function') onInputB();
  }, 100);
  ta.focus();
  schliesseVorschlag();
  if (window.showToast) showToast('Text eingefügt — bitte fachlich überprüfen', 'success', 3000);
};

window.schliesseVorschlag = function() {
  var box = document.getElementById('ki-vorschlag-box');
  if (box) box.style.display = 'none';
  _kiVorschlag = null;
};

// Strg+Enter = KI-Assist im aktiven Feld
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (_kiAktiveTextarea) {
      e.preventDefault();
      window.kiAssist('assist');
    }
  }
});

/* ── Auto-Save Indikator ── */
var _autoSaveTimer = null;
function zeigeAutoSave() {
  var hint = document.getElementById('autosaveHint');
  if (!hint) return;
  hint.style.display = 'flex';
  var txt = document.getElementById('autosaveText');
  if (txt) txt.textContent = 'Gespeichert · gerade eben';
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(function() {
    hint.style.display = 'none';
  }, 4000);
}
// Hooks in vorhandene Speicher-Funktionen
var _origSpeichern = window.speichern;
window.speichern = function() {
  if (_origSpeichern) _origSpeichern.apply(this, arguments);
  zeigeAutoSave();
};

/* ── speichereUndWeiter — Stellungnahme speichern und zu Freigabe ── */
window.speichereUndWeiter = async function() {
  // Erst speichern
  if (typeof speichereStellungnahme === 'function') {
    var ok = await speichereStellungnahme();
    if (ok === false) return; // Fehler beim Speichern
  }
  // Dann weiter zur Freigabe
  var recId = localStorage.getItem('prova_current_record_id') || '';
  var az    = localStorage.getItem('prova_letztes_az') || localStorage.getItem('prova_current_az') || '';
  if (recId) window.location.href = 'freigabe.html?id=' + recId;
  else if (az) window.location.href = 'freigabe.html?az=' + encodeURIComponent(az);
  else window.location.href = 'freigabe.html';
};
