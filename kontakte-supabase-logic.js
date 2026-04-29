/* ════════════════════════════════════════════════════════════════════
   PROVA — kontakte-supabase-logic.js (ESM)
   Sprint K-UI Item 2 — Kontakte-Page (CRUD)

   K-UI/X2-Korr (Marcel-Direktive): Kontakte-Tabelle ist STAMMDATEN-
   Adressbuch. Vorgangsdaten (Schadennummer, Versicherungs-Nr,
   Behoerden-Az) gehoeren in den Auftrag (Sprint 06b Conditional
   Forms im Auftrags-Wizard), NICHT in den Kontakt.

   Beispiel: "Allianz Versicherung AG" ist EIN Kontakt — kommt fuer
   viele Auftraege als Auftraggeber vor, jeder hat andere Schaden-Nr.

   Schema-Map: Frontend ↔ DB
     - 1 UI-Feld "Strasse / Nr / Zusatz" -> 3 DB-Spalten
       (adresse_strasse, adresse_nr, adresse_zusatz)
     - "Firma / Institution"-Label switcht zu "Kanzlei" bei typ=anwalt
       — Daten gehen aber in dieselbe firma-DB-Spalte (kanzlei ≡ firma)

   Pattern: ESM, lib/auth-guard, lib/data-store.kontakte
═══════════════════════════════════════════════════════════════════════ */

import { kontakte as kontakteStore } from '/lib/data-store.js';
import { requireWorkspace, watchAuthState, bindLogoutButtons } from '/lib/auth-guard.js';

const $ = (id) => document.getElementById(id);

// ─── Typ-Klassifikation (mirror DB-ENUM kontakt_typ) ────────
// Welche Sections fuer welchen typ:
//   'firma' visible: alle ausser privat — firma-Pflicht (Label switcht
//                    zu "Kanzlei" bei typ=anwalt)
//   'vorgangshinweis' visible: typ in {versicherung,gericht,behoerde}
//                    — informativer Hinweis dass Schaden-Nr/Az im
//                      Auftrag, nicht hier
const TYPS_MIT_FIRMA = new Set(['firma','anwalt','versicherung','gericht','behoerde','handwerker','sv_kollege']);

let _currentList = [];
let _editingId = null;
let _searchTimer = null;

// ─── UI-Helpers ──────────────────────────────────────────────
function toast(kind, text, ms = 2400) {
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

function getVal(id) { return ($(id)?.value ?? '').trim(); }
function setVal(id, v) { const el = $(id); if (el) el.value = v ?? ''; }

function buildDisplayName(k) {
    if (k.firma && k.typ !== 'privat') return k.firma;
    const parts = [k.titel, k.vorname, k.nachname].filter(Boolean);
    if (parts.length) return parts.join(' ');
    return k.firma || k.name || '(unbenannt)';
}

function buildAdresseLine(k) {
    // DIN-5008-konforme Anschrift in einer Zeile fuer Liste
    const street = [k.adresse_strasse, k.adresse_nr].filter(Boolean).join(' ');
    const ortPart = [k.plz, k.ort].filter(Boolean).join(' ');
    const both = [street, ortPart].filter(Boolean).join(', ');
    if (k.adresse_zusatz) return both ? `${both} (${k.adresse_zusatz})` : k.adresse_zusatz;
    return both;
}

function buildSubInfo(k) {
    // K-UI/X2-Korrektur (Marcel): Stammdaten zeigen keine Vorgangsdaten an.
    // Schadennummer / Vers-Nr / Behoerden-Az sind Auftragsdaten, nicht Kontakt.
    // Sub-Info nur fuer abteilung (informativ, nicht typ-spezifisch).
    if (k.abteilung) return k.abteilung;
    return '';
}

function formatTags(tags) {
    if (!tags) return '';
    if (Array.isArray(tags)) return tags.join(', ');
    return String(tags);
}

function parseTags(s) {
    if (!s) return null;
    const arr = s.split(',').map(t => t.trim()).filter(Boolean);
    return arr.length ? arr : null;
}

// ─── Conditional Sections ────────────────────────────────────
function updateConditionalSections() {
    const typ = getVal('k-typ') || 'privat';

    document.querySelectorAll('[data-section]').forEach(el => {
        const section = el.dataset.section;
        let show = false;
        switch (section) {
            case 'person':           show = true; break;  // immer (Ansprechpartner-Felder)
            case 'firma':            show = TYPS_MIT_FIRMA.has(typ); break;
            case 'vorgangshinweis':  show = (typ === 'versicherung' || typ === 'gericht' || typ === 'behoerde');
                                     break;
            default:                 show = true;
        }
        el.style.display = show ? '' : 'none';
    });

    // K-UI/X2-Korr (Marcel): firma-Label dynamisch — bei Anwalt heisst's "Kanzlei",
    // sonst "Firma / Institution". Daten gehen in dieselbe DB-Spalte (firma).
    const firmaLabel = $('k-firma-label');
    if (firmaLabel) {
        const text = (typ === 'anwalt') ? 'Kanzlei' : 'Firma / Institution';
        firmaLabel.innerHTML = `${text} <span style="color:var(--danger);">*</span>`;
    }
    const firmaInput = $('k-firma');
    if (firmaInput) {
        firmaInput.placeholder = (typ === 'anwalt')
            ? 'z. B. Müller & Partner Rechtsanwälte'
            : 'z. B. Müller GmbH';
    }
}

function toggleMehrFelder() {
    const box = $('mehr-felder');
    const icon = $('toggle-mehr-felder-icon');
    const visible = box.style.display !== 'none';
    box.style.display = visible ? 'none' : '';
    if (icon) icon.textContent = visible ? '▾' : '▴';
}

// ─── Liste rendern ──────────────────────────────────────────
function renderList(list) {
    const root = $('kontakte-list');
    if (!list || list.length === 0) {
        root.innerHTML = `
          <div class="empty-state">
            <div class="icon">👥</div>
            <div style="font-weight:600; margin-bottom:4px; color:var(--text2);">Noch keine Kontakte</div>
            <div style="font-size:12px;">Lege deinen ersten Kontakt an — Auftraggeber, Gerichte, Versicherungen oder Rechtsanwälte.</div>
            <button class="btn-primary" style="margin-top:14px;" onclick="document.getElementById('btn-new').click()">+ Ersten Kontakt anlegen</button>
          </div>`;
        return;
    }

    root.innerHTML = list.map(k => {
        const name = escapeHtml(buildDisplayName(k));
        const typ = escapeHtml(k.typ || 'privat');
        const adresse = escapeHtml(buildAdresseLine(k) || '—');
        const subInfo = escapeHtml(buildSubInfo(k));
        const email = k.email ? `<a href="mailto:${escapeHtml(k.email)}" onclick="event.stopPropagation()">${escapeHtml(k.email)}</a>` : '';
        const tel = k.telefon || k.mobil || '';
        return `
          <div class="kontakt-row" data-id="${escapeHtml(k.id)}">
            <div><span class="typ-badge ${typ}">${typ}</span></div>
            <div>
              <div class="kontakt-name">${name}</div>
              <div class="kontakt-meta">${adresse}${subInfo ? ' · ' + subInfo : ''}</div>
            </div>
            <div class="kontakt-info">
              ${email}${email && tel ? '<br>' : ''}${escapeHtml(tel)}
            </div>
            <div class="kontakt-actions">
              <button class="btn-icon" data-edit="${escapeHtml(k.id)}" type="button">Bearbeiten</button>
            </div>
          </div>`;
    }).join('');

    root.querySelectorAll('.kontakt-row').forEach(row => {
        row.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                e.stopPropagation();
                openEdit(editBtn.dataset.edit);
                return;
            }
            openEdit(row.dataset.id);
        });
    });
}

// ─── Liste laden ────────────────────────────────────────────
async function loadList() {
    const search = getVal('search');
    const typ = getVal('filter-typ') || null;

    $('kontakte-list').innerHTML = '<div class="empty-state"><div class="icon">⏳</div><div>Lade Kontakte …</div></div>';

    const { data, error } = await kontakteStore.list({ search: search || null, typ, limit: 200 });
    if (error) {
        $('kontakte-list').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><div>Fehler: ${escapeHtml(error.message)}</div></div>`;
        return;
    }
    _currentList = data || [];
    renderList(_currentList);
}

// ─── Modal: Reset / Open / Close ────────────────────────────
const RESET_FIELDS = [
    'k-titel','k-vorname','k-nachname','k-firma','k-abteilung',
    'k-strasse','k-hausnr','k-zusatz','k-plz','k-ort',
    'k-email','k-telefon','k-mobil','k-tags',
    'k-email-2','k-fax','k-website',
    'k-ust-id','k-steuernummer','k-iban','k-bic','k-notizen'
];

function openCreate() {
    _editingId = null;
    $('modal-title').textContent = 'Neuer Kontakt';
    $('btn-delete').style.visibility = 'hidden';
    RESET_FIELDS.forEach(id => setVal(id, ''));
    setVal('k-typ', 'privat');
    setVal('k-anrede', '');
    setVal('k-land', 'DE');
    // Mehr-Felder zugeklappt starten
    if ($('mehr-felder')) $('mehr-felder').style.display = 'none';
    if ($('toggle-mehr-felder-icon')) $('toggle-mehr-felder-icon').textContent = '▾';
    updateConditionalSections();
    $('modal-edit').classList.add('visible');
    setTimeout(() => $('k-vorname').focus(), 50);
}

function openEdit(id) {
    const k = _currentList.find(x => x.id === id);
    if (!k) { toast('error', 'Kontakt nicht gefunden'); return; }

    _editingId = id;
    $('modal-title').textContent = 'Kontakt bearbeiten';
    $('btn-delete').style.visibility = 'visible';

    setVal('k-typ',           k.typ || 'privat');
    setVal('k-anrede',        k.anrede || '');
    setVal('k-titel',         k.titel || '');
    setVal('k-vorname',       k.vorname || '');
    setVal('k-nachname',      k.nachname || '');
    setVal('k-firma',         k.firma || '');
    setVal('k-abteilung',     k.abteilung || '');

    // K-UI/X2-Korr: kanzlei/versicherungs_nr/schaden_nr/behoerden_az
    // sind Vorgangsdaten — werden hier nicht angezeigt. Pre-X2-Daten in
    // diesen Spalten bleiben in der DB unangetastet.

    // Adresse (3 Felder)
    setVal('k-strasse', k.adresse_strasse || '');
    setVal('k-hausnr',  k.adresse_nr || '');
    setVal('k-zusatz',  k.adresse_zusatz || '');
    setVal('k-plz',     k.plz || '');
    setVal('k-ort',     k.ort || '');
    setVal('k-land',    k.land || 'DE');

    // Kommunikation
    setVal('k-email',   k.email || '');
    setVal('k-telefon', k.telefon || '');
    setVal('k-mobil',   k.mobil || '');
    setVal('k-tags',    formatTags(k.tags));

    // Mehr-Felder
    setVal('k-email-2',     k.email_2 || '');
    setVal('k-fax',         k.fax || '');
    setVal('k-website',     k.website || '');
    setVal('k-ust-id',      k.ust_id || '');
    setVal('k-steuernummer', k.steuernummer || '');
    setVal('k-iban',        k.iban || '');
    setVal('k-bic',         k.bic || '');
    setVal('k-notizen',     k.notizen || '');

    // Auto-Open Mehr-Felder wenn etwas befuellt ist
    const mehrBefuellt = k.email_2 || k.fax || k.website || k.ust_id || k.steuernummer || k.iban || k.bic || k.notizen;
    if ($('mehr-felder')) $('mehr-felder').style.display = mehrBefuellt ? '' : 'none';
    if ($('toggle-mehr-felder-icon')) $('toggle-mehr-felder-icon').textContent = mehrBefuellt ? '▴' : '▾';

    updateConditionalSections();
    $('modal-edit').classList.add('visible');
}

function closeModal() {
    $('modal-edit').classList.remove('visible');
    _editingId = null;
}

// ─── Read Form -> Insert/Update Payload ─────────────────────
function readModal() {
    const typ      = getVal('k-typ') || 'privat';
    const vorname  = getVal('k-vorname');
    const nachname = getVal('k-nachname');
    const firma    = getVal('k-firma');

    // Computed name (DB-Trigger compute_kontakt_name pflegt es eigentlich,
    // aber NOT NULL — wir liefern Fallback um Insert-Fehler zu vermeiden)
    let computedName = null;
    if (TYPS_MIT_FIRMA.has(typ) && firma) {
        computedName = firma;
    } else {
        const parts = [getVal('k-anrede'), getVal('k-titel'), vorname, nachname].filter(Boolean);
        computedName = parts.join(' ').trim() || firma || null;
    }

    const payload = {
        typ,
        anrede:    getVal('k-anrede') || null,
        titel:     getVal('k-titel') || null,
        vorname:   vorname || null,
        nachname:  nachname || null,
        firma:     firma || null,
        abteilung: getVal('k-abteilung') || null,
        name:      computedName,

        // Adresse
        adresse_strasse: getVal('k-strasse') || null,
        adresse_nr:      getVal('k-hausnr')  || null,
        adresse_zusatz:  getVal('k-zusatz')  || null,
        plz:             getVal('k-plz')     || null,
        ort:             getVal('k-ort')     || null,
        land:            (getVal('k-land') || 'DE').toUpperCase(),

        // Kommunikation
        email:   getVal('k-email')   || null,
        email_2: getVal('k-email-2') || null,
        telefon: getVal('k-telefon') || null,
        mobil:   getVal('k-mobil')   || null,
        fax:     getVal('k-fax')     || null,
        website: getVal('k-website') || null,

        // Geschaeftsdaten
        ust_id:       getVal('k-ust-id')       || null,
        steuernummer: getVal('k-steuernummer') || null,
        iban:         getVal('k-iban')         || null,
        bic:          getVal('k-bic')          || null,

        // K-UI/X2-Korr: Vorgangsdaten (kanzlei/versicherungs_nr/schaden_nr/
        // behoerden_az) werden NICHT mitgesendet. DB-Spalten bleiben
        // unangetastet — bestehende Werte ueberleben Update durch
        // Supabase Partial-Update-Semantik (nur explizit gesetzte Felder).

        // Notizen + Tags
        notizen: getVal('k-notizen') || null,
        tags:    parseTags(getVal('k-tags'))
    };

    return payload;
}

function validatePayload(p) {
    // K-UI/X2-Korr: nur Stammdaten-Pflichtfelder. Vorgangsdaten
    // (kanzlei/vers_nr/schaden_nr/behoerden_az) sind in Sprint 06b
    // im Auftrags-Wizard zu validieren.
    if (p.typ === 'privat') {
        if (!p.vorname && !p.nachname) {
            return 'Bei Privatperson: Vorname oder Nachname Pflicht.';
        }
    } else {
        // alle anderen Typen: firma Pflicht (bei Anwalt heisst's "Kanzlei",
        // gleiche DB-Spalte — Marcel-Korrektur "kanzlei ≡ firma fuer Anwaelte")
        if (!p.firma) {
            const label = (p.typ === 'anwalt') ? 'Kanzlei' : 'Firma/Institution';
            return `Bei Typ "${p.typ}": ${label} ist Pflicht.`;
        }
    }
    return null;
}

async function saveModal() {
    const data = readModal();
    const validationError = validatePayload(data);
    if (validationError) { toast('error', validationError, 4000); return; }

    const btn = $('btn-save');
    btn.disabled = true; btn.textContent = 'Speichere…';

    let res;
    if (_editingId) {
        res = await kontakteStore.update(_editingId, data);
    } else {
        res = await kontakteStore.create(data);
    }

    btn.disabled = false; btn.textContent = 'Speichern';
    if (res.error) {
        toast('error', 'Fehler: ' + res.error.message, 5000);
        console.error('[kontakte] save:', res.error);
        return;
    }
    toast('success', _editingId ? 'Kontakt aktualisiert' : 'Kontakt angelegt');
    closeModal();
    await loadList();
}

async function deleteCurrent() {
    if (!_editingId) return;
    if (!confirm('Diesen Kontakt wirklich löschen? (Soft-Delete — Auftraege bleiben verlinkt)')) return;

    const { error } = await kontakteStore.softDelete(_editingId);
    if (error) { toast('error', error.message, 4000); return; }
    toast('success', 'Kontakt gelöscht');
    closeModal();
    await loadList();
}

// ─── Init ───────────────────────────────────────────────────
async function init() {
    try {
        await requireWorkspace();
    } catch (e) {
        console.error('Auth:', e);
        return;
    }

    // Toolbar
    $('btn-new').addEventListener('click', openCreate);
    $('search').addEventListener('input', () => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(loadList, 250);
    });
    $('filter-typ').addEventListener('change', loadList);

    // Modal
    $('modal-cancel').addEventListener('click', closeModal);
    $('modal-cancel-2').addEventListener('click', closeModal);
    $('btn-save').addEventListener('click', saveModal);
    $('btn-delete').addEventListener('click', deleteCurrent);
    $('modal-edit').addEventListener('click', (e) => {
        if (e.target.id === 'modal-edit') closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && $('modal-edit').classList.contains('visible')) closeModal();
    });

    // Conditional Sections: typ-Wechsel triggert re-render
    $('k-typ').addEventListener('change', updateConditionalSections);

    // Mehr-Felder-Toggle
    if ($('toggle-mehr-felder')) {
        $('toggle-mehr-felder').addEventListener('click', toggleMehrFelder);
    }

    await loadList();
    watchAuthState();
    bindLogoutButtons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
