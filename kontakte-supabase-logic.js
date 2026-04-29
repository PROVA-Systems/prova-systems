/* ════════════════════════════════════════════════════════════════════
   PROVA — kontakte-supabase-logic.js (ESM)
   Sprint K-UI Item 2 — Kontakte-Page (CRUD)

   Liest/schreibt:
     - kontakte-Tabelle (workspace-scoped via RLS)
     - Soft-Delete via deleted_at-Timestamp

   Pattern: ESM, lib/auth-guard, lib/data-store.kontakte
   Modal: Create + Edit, Liste mit Suche + Typ-Filter
═══════════════════════════════════════════════════════════════════════ */

import { kontakte as kontakteStore } from '/lib/data-store.js';
import { requireWorkspace, watchAuthState, bindLogoutButtons } from '/lib/auth-guard.js';

const $ = (id) => document.getElementById(id);

let _currentList = [];
let _editingId = null;            // null = create, sonst UUID
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
    if (k.firma && k.typ !== 'person') return k.firma;
    const parts = [k.titel, k.vorname, k.nachname].filter(Boolean);
    if (parts.length) return parts.join(' ');
    return k.firma || k.name || '(unbenannt)';
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
        const typ = escapeHtml(k.typ || 'person');
        const meta = [k.plz, k.ort].filter(Boolean).join(' ');
        const email = k.email ? `<a href="mailto:${escapeHtml(k.email)}" onclick="event.stopPropagation()">${escapeHtml(k.email)}</a>` : '';
        const tel = k.telefon || k.mobil || '';
        return `
          <div class="kontakt-row" data-id="${escapeHtml(k.id)}">
            <div><span class="typ-badge ${typ}">${typ}</span></div>
            <div>
              <div class="kontakt-name">${name}</div>
              <div class="kontakt-meta">${escapeHtml(meta || '—')}</div>
            </div>
            <div class="kontakt-info">
              ${email}${email && tel ? '<br>' : ''}${escapeHtml(tel)}
            </div>
            <div class="kontakt-actions">
              <button class="btn-icon" data-edit="${escapeHtml(k.id)}" type="button">Bearbeiten</button>
            </div>
          </div>`;
    }).join('');

    // Event-Delegation
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

// ─── Modal (Create/Edit) ────────────────────────────────────
function openCreate() {
    _editingId = null;
    $('modal-title').textContent = 'Neuer Kontakt';
    $('btn-delete').style.visibility = 'hidden';
    // Reset
    ['k-titel','k-vorname','k-nachname','k-firma','k-email','k-telefon','k-mobil','k-anschrift','k-plz','k-ort','k-tags']
        .forEach(id => setVal(id, ''));
    setVal('k-typ', 'person');
    setVal('k-anrede', '');
    $('modal-edit').classList.add('visible');
    setTimeout(() => $('k-vorname').focus(), 50);
}

function openEdit(id) {
    const k = _currentList.find(x => x.id === id);
    if (!k) { toast('error', 'Kontakt nicht gefunden'); return; }

    _editingId = id;
    $('modal-title').textContent = 'Kontakt bearbeiten';
    $('btn-delete').style.visibility = 'visible';

    setVal('k-typ', k.typ || 'person');
    setVal('k-anrede', k.anrede || '');
    setVal('k-titel', k.titel || '');
    setVal('k-vorname', k.vorname || '');
    setVal('k-nachname', k.nachname || '');
    setVal('k-firma', k.firma || '');
    setVal('k-email', k.email || '');
    setVal('k-telefon', k.telefon || '');
    setVal('k-mobil', k.mobil || '');
    setVal('k-anschrift', k.anschrift || '');
    setVal('k-plz', k.plz || '');
    setVal('k-ort', k.ort || '');
    setVal('k-tags', formatTags(k.tags));

    $('modal-edit').classList.add('visible');
}

function closeModal() {
    $('modal-edit').classList.remove('visible');
    _editingId = null;
}

function readModal() {
    const vorname = getVal('k-vorname');
    const nachname = getVal('k-nachname');
    const firma = getVal('k-firma');
    // Anzeigename — fuer search_vector + Listen-Anzeige
    const nameParts = [vorname, nachname].filter(Boolean).join(' ');
    const computedName = nameParts || firma || null;

    return {
        typ: getVal('k-typ') || 'person',
        anrede: getVal('k-anrede') || null,
        titel: getVal('k-titel') || null,
        vorname: vorname || null,
        nachname: nachname || null,
        firma: firma || null,
        name: computedName,
        email: getVal('k-email') || null,
        telefon: getVal('k-telefon') || null,
        mobil: getVal('k-mobil') || null,
        anschrift: getVal('k-anschrift') || null,
        plz: getVal('k-plz') || null,
        ort: getVal('k-ort') || null,
        tags: parseTags(getVal('k-tags'))
    };
}

async function saveModal() {
    const data = readModal();

    // Mindestvalidierung
    if (!data.name && !data.firma) {
        toast('error', 'Mindestens Vorname/Nachname oder Firma angeben');
        return;
    }

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
        toast('error', 'Fehler: ' + res.error.message, 4000);
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

    await loadList();
    watchAuthState();
    bindLogoutButtons();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
