/**
 * PROVA Version-Diff (MEGA⁶⁸ Item 6.10 + MEGA⁶⁹-FINAL-3 Item 8.3 Myers-Upgrade)
 *
 * Wort-Level-Diff via LCS-Algorithmus (Myers-ähnlich, vanilla JS, kein Foreign-Dep).
 * Vergleicht 2 documents_versions JSON-Snapshots auf Block-Level + innerhalb Block auf Wort-Level.
 *
 * Verbesserung ggü. MEGA⁶⁸-Beta:
 *   - alt: Set-Intersect, "ganze Zeile add/del" — keine Wort-Level
 *   - neu: per Block-Pair LCS-Wort-Diff → inline Hervorhebung
 *
 * API:
 *   ProvaVersionDiff.compare(jsonA, jsonB) → HTML mit Highlights
 *   ProvaVersionDiff.attachToHistory()     → erweitert ProvaVersionHistory
 */
'use strict';

(function (global) {

  function _injectStyle() {
    if (document.getElementById('prova-version-diff-style')) return;
    const style = document.createElement('style');
    style.id = 'prova-version-diff-style';
    style.textContent = `
      .vd-diff { padding: 16px 24px; background: #fff; max-height: 500px; overflow-y: auto; }
      .vd-diff h3 { margin: 0 0 8px; font: 600 13px/1.4 system-ui; }
      .vd-block { padding: 4px 6px; margin: 2px 0; font: 13px/1.6 system-ui; border-radius: 3px; white-space: pre-wrap; word-break: break-word; }
      .vd-block--add { background: #d1fae5; }
      .vd-block--del { background: #fee2e2; text-decoration: line-through; opacity: .85; }
      .vd-block--mod { background: rgba(245, 158, 11, 0.08); }
      .vd-word--add { background: #6ee7b7; color: #064e3b; border-radius: 2px; padding: 0 2px; }
      .vd-word--del { background: #fca5a5; color: #7f1d1d; border-radius: 2px; padding: 0 2px; text-decoration: line-through; }
      .vd-word--same { color: #475569; }
      .vd-stats { margin: 8px 24px; padding: 8px 12px; background: #f4f8fa; border-radius: 6px; font-size: 12px; color: #4a5e63; display: flex; gap: 16px; }
      .vd-stats .vd-add { color: #14532d; font-weight: 700; }
      .vd-stats .vd-del { color: #7f1d1d; font-weight: 700; }
      .vd-stats .vd-mod { color: #92400e; font-weight: 700; }
    `;
    document.head.appendChild(style);
  }

  function _jsonToBlocks(json) {
    if (!json?.content) return [];
    const blocks = [];
    function walk(node) {
      if (!node) return;
      if (node.type === 'text') return;
      const isBlock = ['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type);
      if (isBlock) {
        const text = (node.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('');
        if (text.trim()) {
          const prefix = node.type === 'heading' ? '#'.repeat(node.attrs?.level || 1) + ' ' : '';
          blocks.push({ key: node.type + ':' + (prefix + text).slice(0, 80), text: prefix + text, type: node.type });
        }
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    }
    walk(json);
    return blocks;
  }

  function _esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

  // Tokenize: split by Whitespace + Satzzeichen-Awareness
  function _tokenize(s) {
    if (!s) return [];
    return String(s).split(/(\s+)/).filter(t => t.length > 0);
  }

  // LCS-Matrix (Myers-Variante O(n*m), für Pilot-Texte schnell genug)
  function _lcsTable(a, b) {
    const m = a.length, n = b.length;
    const t = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) t[i][j] = t[i - 1][j - 1] + 1;
        else t[i][j] = t[i][j - 1] >= t[i - 1][j] ? t[i][j - 1] : t[i - 1][j];
      }
    }
    return t;
  }

  function _diffTokens(aTokens, bTokens) {
    const t = _lcsTable(aTokens, bTokens);
    const ops = [];
    let i = aTokens.length, j = bTokens.length;
    while (i > 0 && j > 0) {
      if (aTokens[i - 1] === bTokens[j - 1]) {
        ops.unshift({ type: 'same', text: aTokens[i - 1] });
        i--; j--;
      } else if (t[i - 1][j] >= t[i][j - 1]) {
        ops.unshift({ type: 'del', text: aTokens[i - 1] });
        i--;
      } else {
        ops.unshift({ type: 'add', text: bTokens[j - 1] });
        j--;
      }
    }
    while (i > 0) { ops.unshift({ type: 'del', text: aTokens[i - 1] }); i--; }
    while (j > 0) { ops.unshift({ type: 'add', text: bTokens[j - 1] }); j--; }
    // Merge consecutive same-type ops
    const merged = [];
    for (const op of ops) {
      const last = merged[merged.length - 1];
      if (last && last.type === op.type) last.text += op.text;
      else merged.push({ ...op });
    }
    return merged;
  }

  // Block-Level-LCS: paart Blocks 1:1 wenn identisch, sonst markiert mod/add/del
  function _diffBlocks(aBlocks, bBlocks) {
    const aKeys = aBlocks.map(b => b.key);
    const bKeys = bBlocks.map(b => b.key);
    const t = _lcsTable(aKeys, bKeys);
    const out = [];
    let i = aBlocks.length, j = bBlocks.length;
    while (i > 0 && j > 0) {
      if (aKeys[i - 1] === bKeys[j - 1]) {
        out.unshift({ type: 'same', a: aBlocks[i - 1], b: bBlocks[j - 1] });
        i--; j--;
      } else if (t[i - 1][j] >= t[i][j - 1]) {
        out.unshift({ type: 'del', a: aBlocks[i - 1] });
        i--;
      } else {
        out.unshift({ type: 'add', b: bBlocks[j - 1] });
        j--;
      }
    }
    while (i > 0) { out.unshift({ type: 'del', a: aBlocks[i - 1] }); i--; }
    while (j > 0) { out.unshift({ type: 'add', b: bBlocks[j - 1] }); j--; }
    // Post-process: paire benachbarte add+del als "mod" (wahrscheinlich Editierung)
    const merged = [];
    for (let k = 0; k < out.length; k++) {
      const cur = out[k], next = out[k + 1];
      if (cur && next && cur.type === 'del' && next.type === 'add') {
        merged.push({ type: 'mod', a: cur.a, b: next.b });
        k++; // skip next
      } else {
        merged.push(cur);
      }
    }
    return merged;
  }

  function _renderBlockWordDiff(aText, bText) {
    const aTok = _tokenize(aText);
    const bTok = _tokenize(bText);
    const ops = _diffTokens(aTok, bTok);
    return ops.map(op =>
      op.type === 'same'
        ? `<span class="vd-word--same">${_esc(op.text)}</span>`
        : op.type === 'add'
          ? `<span class="vd-word--add">${_esc(op.text)}</span>`
          : `<span class="vd-word--del">${_esc(op.text)}</span>`
    ).join('');
  }

  const ProvaVersionDiff = {
    compare(jsonA, jsonB) {
      _injectStyle();
      const aBlocks = _jsonToBlocks(jsonA);
      const bBlocks = _jsonToBlocks(jsonB);
      const diff = _diffBlocks(aBlocks, bBlocks);
      let adds = 0, dels = 0, mods = 0;
      const blocksHtml = diff.map(d => {
        if (d.type === 'same') {
          return `<div class="vd-block">${_esc(d.b.text)}</div>`;
        }
        if (d.type === 'add') {
          adds++;
          return `<div class="vd-block vd-block--add">${_esc(d.b.text)}</div>`;
        }
        if (d.type === 'del') {
          dels++;
          return `<div class="vd-block vd-block--del">${_esc(d.a.text)}</div>`;
        }
        if (d.type === 'mod') {
          mods++;
          return `<div class="vd-block vd-block--mod">${_renderBlockWordDiff(d.a.text, d.b.text)}</div>`;
        }
        return '';
      }).join('');
      return `
        <div class="vd-stats">
          <span class="vd-add">+ ${adds} hinzugefügt</span>
          <span class="vd-del">- ${dels} entfernt</span>
          <span class="vd-mod">~ ${mods} geändert</span>
          <span style="margin-left:auto;color:#94a3b8;">Wort-Level Myers-Diff</span>
        </div>
        <div class="vd-diff">${blocksHtml}</div>
      `;
    },

    // Public-API für Tests
    _diffTokens,
    _diffBlocks,
    _jsonToBlocks,

    attachToHistory() {
      if (!global.ProvaVersionHistory || global.ProvaVersionHistory._diffAttached) return;
      global.ProvaVersionHistory._diffAttached = true;
      const obs = new MutationObserver(() => {
        document.querySelectorAll('.prova-version-modal .vh-detail').forEach(detail => {
          if (detail.querySelector('.vd-diff-toggle')) return;
          const restore = detail.querySelector('.vh-restore');
          if (!restore) return;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'vd-diff-toggle';
          btn.textContent = '⇆ Diff anzeigen';
          btn.style.cssText = 'margin-right:8px;padding:8px 16px;background:#fff;border:1px solid #d4dde0;color:#0b2228;border-radius:6px;cursor:pointer;font:13px system-ui';
          restore.parentNode.insertBefore(btn, restore);
          btn.addEventListener('click', () => {
            // ProvaVersionHistory speichert ausgewählte+aktuelle Versionen in dataset oder _state
            const modal = detail.closest('.prova-version-modal');
            const selectedJson = modal?._selectedVersionJson || null;
            const currentJson = modal?._currentVersionJson || null;
            if (!selectedJson || !currentJson) {
              alert('Keine Versions-Daten verfügbar. Bitte zwei Versionen aus der Liste auswählen.');
              return;
            }
            const html = ProvaVersionDiff.compare(selectedJson, currentJson);
            const diffWrap = document.createElement('div');
            diffWrap.className = 'vd-diff-result';
            diffWrap.innerHTML = html;
            detail.appendChild(diffWrap);
            btn.disabled = true;
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  };

  global.ProvaVersionDiff = ProvaVersionDiff;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => ProvaVersionDiff.attachToHistory());
    else ProvaVersionDiff.attachToHistory();
  }
})(typeof window !== 'undefined' ? window : globalThis);
