/* ════════════════════════════════════════════════════════════════════
   PROVA — briefe-logic.js (ESM)
   Sprint K-UI Item 3 — Briefe-Page (11 Korrespondenz-Templates)

   Flow:
     1. Card waehlen → Form-Panel rendert template-spezifisches Form
     2. Auftrag/Empfaenger optional aus Datenbank picken
     3. "Generieren" → briefe.generate(...) (Wrapper um brief-generate Edge Fn)
     4. Response: PDF-URL → in Result-Card anzeigen + Akte-Link
     5. URL-Params: ?template=KEY&auftrag=AZ → Pre-Select + Pre-Fill

   Letterhead (sv_name, sv_logo_url, sv_stempel_url, ...) wird Server-Side
   in brief-generate via _shared/letterhead-resolver gemerged → KEINE
   manuelle Eingabe der SV-Daten hier noetig.
═══════════════════════════════════════════════════════════════════════ */

import { auftraege, kontakte, briefe } from '/lib/data-store.js';
import { requireWorkspace, watchAuthState, bindLogoutButtons } from '/lib/auth-guard.js';

const $ = (id) => document.getElementById(id);

// ─── Template-Registry (mirror von KORRESPONDENZ_TEMPLATES) ───
// Pro Template: label, icon, group, plus benoetigte Felder.
// Gemeinsame Felder (immer): empfaenger_*, datum, anrede_text
const TEMPLATES = [
    {
        key: 'auftragsbestaetigung', code: 'K-01', label: 'Auftragsbestätigung',
        icon: '✅', group: 'Auftrag',
        fields: [
            { name: 'auftrag_az',          label: 'Aktenzeichen', required: true },
            { name: 'auftrag_betreff',     label: 'Betreff',      required: true, placeholder: 'Schaden Wasserrohrbruch' },
            { name: 'auftragsdatum',       label: 'Auftragsdatum', type: 'date', required: true },
            { name: 'leistung_beschreibung', label: 'Leistungsumfang', type: 'textarea', placeholder: 'Was wird beauftragt?', required: true }
        ]
    },
    {
        key: 'termin-ag', code: 'K-02', label: 'Terminbestätigung Auftraggeber',
        icon: '📅', group: 'Termin',
        fields: [
            { name: 'auftrag_az',         label: 'Aktenzeichen', required: true },
            { name: 'ortstermin_datum',   label: 'Datum', type: 'date', required: true },
            { name: 'ortstermin_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
            { name: 'ortstermin_adresse', label: 'Adresse', placeholder: 'Musterstraße 12, 50667 Köln', required: true },
            { name: 'hinweis_text',       label: 'Hinweis (optional)', type: 'textarea' }
        ]
    },
    {
        key: 'termin-mehrparteien', code: 'K-03', label: 'Termin (Mehrparteien)',
        icon: '👥', group: 'Termin',
        fields: [
            { name: 'auftrag_az',         label: 'Aktenzeichen', required: true },
            { name: 'ortstermin_datum',   label: 'Datum', type: 'date', required: true },
            { name: 'ortstermin_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
            { name: 'ortstermin_adresse', label: 'Adresse', required: true },
            { name: 'parteien_liste',     label: 'Beteiligte (jede in eigene Zeile)', type: 'textarea', required: true,
              placeholder: 'Klägerin: Frau Müller\nBeklagter: Herr Schmidt\nVersicherung: HUK-Coburg' }
        ]
    },
    {
        key: 'anforderung-unterlagen', code: 'K-04', label: 'Anforderung Unterlagen',
        icon: '📄', group: 'Auftrag',
        fields: [
            { name: 'auftrag_az',     label: 'Aktenzeichen', required: true },
            { name: 'unterlagen_liste', label: 'Benötigte Unterlagen (jede in eigene Zeile)', type: 'textarea', required: true,
              placeholder: 'Bauunterlagen / Pläne\nVorgutachten\nFotos vom Schaden' },
            { name: 'frist_datum',    label: 'Frist bis', type: 'date' }
        ]
    },
    {
        key: 'uebergabe-gutachten', code: 'K-05', label: 'Übergabe Gutachten',
        icon: '📦', group: 'Auftrag',
        fields: [
            { name: 'auftrag_az',         label: 'Aktenzeichen', required: true },
            { name: 'gutachten_titel',    label: 'Gutachten-Titel', required: true },
            { name: 'gutachten_seitenzahl', label: 'Seitenzahl', type: 'number' },
            { name: 'rechnung_betrag',    label: 'Rechnungs-Betrag (EUR)', type: 'number', step: '0.01' }
        ]
    },
    {
        key: 'mahnung-1', code: 'K-06A', label: '1. Mahnung (höflich)',
        icon: '💸', group: 'Mahnung',
        fields: [
            { name: 'rechnungs_nr',          label: 'Rechnungs-Nr.', required: true },
            { name: 'rechnung_betrag',       label: 'Betrag (EUR)', type: 'number', step: '0.01', required: true },
            { name: 'rechnung_faelligkeit',  label: 'Fälligkeit war', type: 'date', required: true }
        ]
    },
    {
        key: 'mahnung-2', code: 'K-06B', label: '2. Mahnung (Zinsen)',
        icon: '💸', group: 'Mahnung',
        fields: [
            { name: 'rechnungs_nr',          label: 'Rechnungs-Nr.', required: true },
            { name: 'rechnung_betrag',       label: 'Betrag (EUR)', type: 'number', step: '0.01', required: true },
            { name: 'rechnung_faelligkeit',  label: 'Fälligkeit war', type: 'date', required: true },
            { name: 'mahngebuehr',           label: 'Mahngebühr (EUR)', type: 'number', step: '0.01', placeholder: '5.00' }
        ]
    },
    {
        key: 'mahnung-3', code: 'K-06C', label: '3. Mahnung (Anwalt droht)',
        icon: '⚠️', group: 'Mahnung',
        fields: [
            { name: 'rechnungs_nr',          label: 'Rechnungs-Nr.', required: true },
            { name: 'rechnung_betrag',       label: 'Betrag (EUR)', type: 'number', step: '0.01', required: true },
            { name: 'rechnung_faelligkeit',  label: 'Fälligkeit war', type: 'date', required: true },
            { name: 'mahngebuehr',           label: 'Mahngebühr (EUR)', type: 'number', step: '0.01' },
            { name: 'frist_anwalt',          label: 'Frist bis Anwaltsbeauftragung', type: 'date', required: true }
        ]
    },
    {
        key: 'akteneinsicht', code: 'K-07', label: 'Akteneinsicht (Gericht)',
        icon: '⚖️', group: 'Justiz',
        fields: [
            { name: 'gericht_az',  label: 'Gerichts-Aktenzeichen', required: true },
            { name: 'parteien',    label: 'Parteien (Kläger ./. Beklagter)', required: true,
              placeholder: 'Müller ./. Schmidt' },
            { name: 'begruendung', label: 'Begründung (warum benötigt)', type: 'textarea' }
        ]
    },
    {
        key: 'befangenheit', code: 'K-08', label: 'Befangenheits-Anzeige',
        icon: '🚫', group: 'Justiz',
        fields: [
            { name: 'gericht_az',           label: 'Gerichts-Aktenzeichen', required: true },
            { name: 'befangenheits_gruende', label: 'Gründe (§406 ZPO)', type: 'textarea', required: true,
              placeholder: 'Persönliche Verbindung zur Beklagten-Partei aus früherer Tätigkeit ...' }
        ]
    },
    {
        key: 'auftragsablehnung', code: 'K-09', label: 'Auftragsablehnung',
        icon: '🛑', group: 'Auftrag',
        fields: [
            { name: 'anfrage_az',      label: 'Anfrage-Aktenzeichen', required: true },
            { name: 'anfrage_datum',   label: 'Anfrage vom', type: 'date', required: true },
            { name: 'anfrage_betreff', label: 'Anfrage-Betreff' },
            { name: 'ablehnungsgrund', label: 'Ablehnungsgrund', type: 'textarea', required: true,
              placeholder: 'Aktuelle Auftragslage / fehlende Spezialqualifikation / ...' }
        ]
    }
];

let _activeTemplate = null;
let _generating = false;

// ─── UI-Helpers ──────────────────────────────────────────────
function toast(kind, text, ms = 3500) {
    const el = $('toast');
    el.className = 'toast ' + kind;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, ms);
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function todayIso() { return new Date().toISOString().slice(0,10); }

// ─── Sidebar: Brief-Cards rendern ────────────────────────────
function renderCards() {
    const root = $('brief-cards');
    const groups = {};
    TEMPLATES.forEach(t => {
        groups[t.group] = groups[t.group] || [];
        groups[t.group].push(t);
    });

    let html = '';
    for (const [grp, items] of Object.entries(groups)) {
        html += `<div class="brief-card-group">${escapeHtml(grp)}</div>`;
        items.forEach(t => {
            html += `
              <button class="brief-card" data-key="${escapeHtml(t.key)}" type="button">
                <div class="icon">${t.icon}</div>
                <div class="brief-card-text">
                  <div class="brief-card-title">${escapeHtml(t.label)}</div>
                  <div class="brief-card-key">${escapeHtml(t.code)} · ${escapeHtml(t.key)}</div>
                </div>
              </button>`;
        });
    }
    root.innerHTML = html;
    root.querySelectorAll('.brief-card').forEach(b => {
        b.addEventListener('click', () => selectTemplate(b.dataset.key));
    });
}

// ─── Form-Panel rendern ─────────────────────────────────────
function renderForm(template) {
    _activeTemplate = template;
    document.querySelectorAll('.brief-card').forEach(b => {
        b.classList.toggle('active', b.dataset.key === template.key);
    });

    const panel = $('form-panel');

    // Zusatzfelder aus template.fields
    const extraFieldsHtml = template.fields.map(f => {
        const id = `f-${f.name}`;
        const req = f.required ? ' <span class="req">*</span>' : '';
        const ph = f.placeholder ? ` placeholder="${escapeHtml(f.placeholder)}"` : '';
        if (f.type === 'textarea') {
            return `<div class="form-grid single"><div>
              <label class="form-label" for="${id}">${escapeHtml(f.label)}${req}</label>
              <textarea id="${id}" class="form-textarea" data-fname="${escapeHtml(f.name)}" data-required="${f.required ? '1' : ''}"${ph}></textarea>
            </div></div>`;
        }
        const t = f.type || 'text';
        const stepAttr = f.step ? ` step="${escapeHtml(f.step)}"` : '';
        return `<div>
          <label class="form-label" for="${id}">${escapeHtml(f.label)}${req}</label>
          <input id="${id}" type="${t}" class="form-input" data-fname="${escapeHtml(f.name)}" data-required="${f.required ? '1' : ''}"${stepAttr}${ph}>
        </div>`;
    });

    // Pack Single-Inputs in 2-col grids (Pairs)
    let extraHtml = '';
    let buf = [];
    extraFieldsHtml.forEach(snippet => {
        if (snippet.startsWith('<div class="form-grid single">')) {
            if (buf.length) { extraHtml += `<div class="form-grid">${buf.join('')}</div>`; buf = []; }
            extraHtml += snippet;
        } else {
            buf.push(snippet);
            if (buf.length === 2) { extraHtml += `<div class="form-grid">${buf.join('')}</div>`; buf = []; }
        }
    });
    if (buf.length) extraHtml += `<div class="form-grid">${buf.join('')}</div>`;

    panel.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
        <div style="font-size:22px;">${template.icon}</div>
        <div>
          <div style="font-size:15px; font-weight:600;">${escapeHtml(template.label)}</div>
          <div style="font-size:11px; color:var(--text3); font-family:'JetBrains Mono', monospace;">${escapeHtml(template.code)} · ${escapeHtml(template.key)}</div>
        </div>
      </div>

      <div id="result-zone"></div>

      <!-- ── BEZUG ── -->
      <div class="form-section">
        <div class="form-section-title">Bezug</div>
        <div class="form-grid">
          <div>
            <label class="form-label" for="f-auftrag-id">Auftrag verknüpfen (optional)</label>
            <select id="f-auftrag-id" class="form-select"><option value="">— kein Auftrag —</option></select>
          </div>
          <div>
            <label class="form-label" for="f-datum">Brief-Datum</label>
            <input id="f-datum" type="date" class="form-input" value="${todayIso()}">
          </div>
        </div>
      </div>

      <!-- ── EMPFÄNGER ── -->
      <div class="form-section">
        <div class="form-section-title">Empfänger</div>
        <div class="form-grid">
          <div>
            <label class="form-label" for="f-kontakt-id">Aus Kontakten wählen (optional)</label>
            <select id="f-kontakt-id" class="form-select"><option value="">— oder manuell unten —</option></select>
          </div>
          <div>
            <label class="form-label" for="f-empfaenger-anrede">Anrede</label>
            <select id="f-empfaenger-anrede" class="form-select">
              <option value="">—</option>
              <option value="Sehr geehrte Damen und Herren,">Sehr geehrte Damen und Herren,</option>
              <option value="Sehr geehrter Herr">Sehr geehrter Herr</option>
              <option value="Sehr geehrte Frau">Sehr geehrte Frau</option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div><label class="form-label" for="f-empfaenger-name">Name</label><input id="f-empfaenger-name" type="text" class="form-input" placeholder="Vor- und Nachname"></div>
          <div><label class="form-label" for="f-empfaenger-firma">Firma (optional)</label><input id="f-empfaenger-firma" type="text" class="form-input"></div>
        </div>
        <div class="form-grid">
          <div><label class="form-label" for="f-empfaenger-strasse">Straße</label><input id="f-empfaenger-strasse" type="text" class="form-input"></div>
          <div class="form-grid" style="margin:0; grid-template-columns: 90px 1fr;">
            <div><label class="form-label" for="f-empfaenger-plz">PLZ</label><input id="f-empfaenger-plz" type="text" class="form-input" maxlength="10"></div>
            <div><label class="form-label" for="f-empfaenger-ort">Ort</label><input id="f-empfaenger-ort" type="text" class="form-input"></div>
          </div>
        </div>
      </div>

      <!-- ── TEMPLATE-SPEZIFISCH ── -->
      <div class="form-section">
        <div class="form-section-title">Inhalt</div>
        ${extraHtml}
      </div>

      <div class="form-actions">
        <button class="btn-secondary" id="btn-reset" type="button">Zurücksetzen</button>
        <button class="btn-primary" id="btn-generate" type="button">PDF generieren</button>
      </div>
    `;

    // Auftraege + Kontakte fuer Picker laden
    populateAuftraege();
    populateKontakte();

    $('btn-generate').addEventListener('click', generate);
    $('btn-reset').addEventListener('click', () => renderForm(template));

    // Empfaenger-Autofill aus kontakt-Wahl
    $('f-kontakt-id').addEventListener('change', applyKontaktAutofill);
    // Auftraege-Autofill (auftrag_az ergaenzen wenn Field existiert)
    $('f-auftrag-id').addEventListener('change', applyAuftragAutofill);
}

// ─── Auftraege/Kontakte fuer Picker laden ───────────────────
async function populateAuftraege() {
    const sel = $('f-auftrag-id');
    if (!sel) return;
    const { data, error } = await auftraege.list({ status: null, limit: 100 });
    if (error) { console.warn('Auftraege-Load:', error.message); return; }
    (data || []).forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.dataset.az = a.az || '';
        opt.dataset.titel = a.titel || '';
        opt.dataset.betreff = a.titel || a.zweck || '';
        opt.dataset.objekt = a.objekt || '';
        opt.textContent = `${a.az || '?'} — ${a.titel || a.zweck || '(ohne Titel)'}`;
        sel.appendChild(opt);
    });
    // URL-Param ?auftrag=AZ
    const azParam = new URLSearchParams(location.search).get('auftrag');
    if (azParam) {
        const match = (data || []).find(a => a.az === azParam);
        if (match) { sel.value = match.id; applyAuftragAutofill(); }
    }
}

async function populateKontakte() {
    const sel = $('f-kontakt-id');
    if (!sel) return;
    const { data, error } = await kontakte.list({ limit: 200 });
    if (error) { console.warn('Kontakte-Load:', error.message); return; }
    (data || []).forEach(k => {
        const display = k.firma || [k.titel, k.vorname, k.nachname].filter(Boolean).join(' ') || k.name || '(unbenannt)';
        const opt = document.createElement('option');
        opt.value = k.id;
        opt.dataset.k = JSON.stringify(k);
        opt.textContent = `${display}${k.ort ? ' · ' + k.ort : ''}`;
        sel.appendChild(opt);
    });
}

function applyKontaktAutofill() {
    const sel = $('f-kontakt-id');
    const opt = sel.selectedOptions[0];
    if (!opt || !opt.value) return;
    let k;
    try { k = JSON.parse(opt.dataset.k); } catch { return; }

    const name = k.firma || [k.titel, k.vorname, k.nachname].filter(Boolean).join(' ') || k.name || '';
    if ($('f-empfaenger-name'))    $('f-empfaenger-name').value    = name;
    if ($('f-empfaenger-firma'))   $('f-empfaenger-firma').value   = (k.firma && name !== k.firma) ? k.firma : '';
    if ($('f-empfaenger-strasse')) $('f-empfaenger-strasse').value = k.anschrift || '';
    if ($('f-empfaenger-plz'))     $('f-empfaenger-plz').value     = k.plz || '';
    if ($('f-empfaenger-ort'))     $('f-empfaenger-ort').value     = k.ort || '';
    if ($('f-empfaenger-anrede') && k.anrede) {
        const v = k.anrede === 'Frau' ? 'Sehr geehrte Frau' : k.anrede === 'Herr' ? 'Sehr geehrter Herr' : '';
        if (v) $('f-empfaenger-anrede').value = v;
    }
}

function applyAuftragAutofill() {
    const sel = $('f-auftrag-id');
    const opt = sel.selectedOptions[0];
    if (!opt || !opt.value) return;
    // Auto-fill nur wenn Template-Feld auftrag_az existiert + leer ist
    const azFld = document.querySelector('[data-fname="auftrag_az"]');
    if (azFld && !azFld.value) azFld.value = opt.dataset.az || '';
    const betreffFld = document.querySelector('[data-fname="auftrag_betreff"]');
    if (betreffFld && !betreffFld.value) betreffFld.value = opt.dataset.betreff || '';
}

// ─── Brief generieren ───────────────────────────────────────
async function generate() {
    if (_generating) return;
    if (!_activeTemplate) return;

    // Sammle Variables
    const variables = {
        datum: $('f-datum')?.value || todayIso(),
        anrede_text: $('f-empfaenger-anrede')?.value || 'Sehr geehrte Damen und Herren,',
        empfaenger_anrede: $('f-empfaenger-anrede')?.value?.replace(/(^Sehr geehrte[r]?|,$)/g, '').trim() || '',
        empfaenger_name:    $('f-empfaenger-name')?.value || '',
        empfaenger_firma:   $('f-empfaenger-firma')?.value || '',
        empfaenger_strasse: $('f-empfaenger-strasse')?.value || '',
        empfaenger_plz:     $('f-empfaenger-plz')?.value || '',
        empfaenger_ort:     $('f-empfaenger-ort')?.value || ''
    };

    // Template-spezifische Felder einsammeln
    const missing = [];
    document.querySelectorAll('[data-fname]').forEach(el => {
        const k = el.dataset.fname;
        const v = (el.value || '').trim();
        if (el.dataset.required === '1' && !v) missing.push(k);
        if (v) variables[k] = v;
    });
    if (missing.length) {
        toast('error', 'Pflichtfelder fehlen: ' + missing.join(', '));
        return;
    }

    // Konvertiere parteien_liste / unterlagen_liste textarea -> array (eine pro Zeile)
    if (variables.parteien_liste) {
        variables.parteien_liste = variables.parteien_liste.split(/\r?\n/).filter(Boolean);
    }
    if (variables.unterlagen_liste) {
        variables.unterlagen_liste = variables.unterlagen_liste.split(/\r?\n/).filter(Boolean);
    }

    const auftragId = $('f-auftrag-id')?.value || null;
    const auftragOpt = $('f-auftrag-id')?.selectedOptions[0];
    const az = auftragOpt?.dataset.az || variables.auftrag_az || null;
    const contactId = $('f-kontakt-id')?.value || null;

    _generating = true;
    const btn = $('btn-generate');
    btn.disabled = true; btn.textContent = 'Generiere PDF …';

    try {
        const { data, error } = await briefe.generate({
            template_key: _activeTemplate.key,
            variables,
            contact_id: contactId,
            auftrag_id: auftragId,
            az
        });

        if (error) throw error;
        if (!data?.pdf_url) throw new Error('Keine PDF-URL in Response');

        $('result-zone').innerHTML = `
          <div class="result-card">
            <div style="font-weight:600; margin-bottom:6px;">✅ Brief generiert</div>
            <div style="font-size:12px; color:var(--text2); margin-bottom:8px;">${escapeHtml(data.bytes ? Math.round(data.bytes/1024) + ' KB' : '')} · gespeichert in Akte</div>
            <div style="display:flex; gap:10px;">
              <a href="${data.pdf_url}" target="_blank" rel="noopener">📎 PDF öffnen</a>
              ${az ? `<a href="akte.html?az=${encodeURIComponent(az)}">→ Akte ${escapeHtml(az)}</a>` : ''}
            </div>
          </div>
        `;
        toast('success', 'PDF generiert');
    } catch (e) {
        console.error('brief-generate:', e);
        const msg = e?.message || e?.error || JSON.stringify(e);
        toast('error', 'Fehler: ' + msg, 6000);
    } finally {
        _generating = false;
        btn.disabled = false; btn.textContent = 'PDF generieren';
    }
}

// ─── Init ───────────────────────────────────────────────────
function selectTemplate(key) {
    const t = TEMPLATES.find(x => x.key === key);
    if (t) renderForm(t);
}

async function init() {
    try {
        await requireWorkspace();
    } catch (e) {
        console.error('Auth:', e);
        return;
    }

    renderCards();

    // URL-Param ?template=KEY → Pre-Select
    const tplParam = new URLSearchParams(location.search).get('template');
    if (tplParam && TEMPLATES.find(t => t.key === tplParam)) {
        selectTemplate(tplParam);
    }

    watchAuthState();
    bindLogoutButtons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
