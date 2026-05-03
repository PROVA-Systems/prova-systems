/**
 * PROVA Foto-Upload v2 — UI Helper (MEGA⁹ W1)
 * ════════════════════════════════════════════════════════════════════
 *
 * Bindet ProvaUpload an Drop-Zone + List-Container und rendert
 * Upload-Items mit Progress-Bars, Cancel/Retry-Buttons.
 *
 * USAGE:
 *   const ui = new ProvaUploadUI({
 *     uploader: provaUploadInstance,
 *     dropZone: '#drop-zone',
 *     listContainer: '#upload-list',
 *     totalBar: '#upload-total',  // optional
 *     showThumbnails: true
 *   });
 */
'use strict';

(function () {
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    if (text != null) e.textContent = text;
    return e;
  }

  function fmtBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function buildDropZone(zoneEl, opts) {
    if (!zoneEl) return;
    if (zoneEl.querySelector('.prova-dropzone__icon')) return;  // already built
    zoneEl.classList.add('prova-dropzone');
    zoneEl.appendChild(el('div', { class: 'prova-dropzone__icon', 'aria-hidden': 'true' }, '📤'));
    zoneEl.appendChild(el('div', { class: 'prova-dropzone__title' }, opts.title || 'Fotos hierher ziehen oder klicken'));
    zoneEl.appendChild(el('div', { class: 'prova-dropzone__hint' },
      opts.hint || 'JPG, PNG, WebP, HEIC · max 25MB · EXIF-Daten werden automatisch entfernt (DSGVO)'));

    // Hidden file-input fuer Click-Auswahl
    const input = el('input', { type: 'file', multiple: 'multiple', accept: 'image/*', style: 'display:none' });
    zoneEl.appendChild(input);
    zoneEl.addEventListener('click', (e) => {
      if (e.target === zoneEl || e.target.closest('.prova-dropzone__icon, .prova-dropzone__title, .prova-dropzone__hint')) {
        input.click();
      }
    });
    return input;
  }

  function buildItemCard(item) {
    const card = el('div', { class: 'prova-upload-item', 'data-item-id': item.id });

    const thumb = el('div', { class: 'prova-upload-item__thumb' });
    if (item.file && item.file.type.startsWith('image/')) {
      const img = el('img', { alt: item.name });
      img.src = URL.createObjectURL(item.file);
      img.onload = () => URL.revokeObjectURL(img.src);
      thumb.appendChild(img);
    } else {
      thumb.textContent = item.file && item.file.type === 'application/pdf' ? '📄' : '📁';
    }
    card.appendChild(thumb);

    const info = el('div', { class: 'prova-upload-item__info' });
    info.appendChild(el('div', { class: 'prova-upload-item__name' }, item.name));
    info.appendChild(el('div', { class: 'prova-upload-item__meta' }, fmtBytes(item.size) + ' · queued'));
    const bar = el('div', { class: 'prova-upload-item__progress-bar' });
    const fill = el('div', { class: 'prova-upload-item__progress-fill', style: 'width:0%' });
    bar.appendChild(fill);
    info.appendChild(bar);
    card.appendChild(info);

    const actions = el('div', { class: 'prova-upload-item__actions' });
    const cancelBtn = el('button', { class: 'prova-upload-item__btn', type: 'button', 'aria-label': 'Abbrechen' }, '✕');
    actions.appendChild(cancelBtn);
    card.appendChild(actions);

    return { card, fill, meta: info.querySelector('.prova-upload-item__meta'), cancelBtn };
  }

  class ProvaUploadUI {
    constructor(config) {
      this.uploader = config.uploader;
      this.dropZoneEl = typeof config.dropZone === 'string' ? document.querySelector(config.dropZone) : config.dropZone;
      this.listEl = typeof config.listContainer === 'string' ? document.querySelector(config.listContainer) : config.listContainer;
      this.totalEl = typeof config.totalBar === 'string' ? document.querySelector(config.totalBar) : config.totalBar;
      this.showThumbnails = config.showThumbnails !== false;
      this.dropZoneOpts = { title: config.dropZoneTitle, hint: config.dropZoneHint };
      this.itemRefs = new Map();  // id -> {card, fill, meta, cancelBtn}

      this._init();
    }

    _init() {
      // Dropzone
      if (this.dropZoneEl) {
        const input = buildDropZone(this.dropZoneEl, this.dropZoneOpts);
        this.uploader.bindDropZone(this.dropZoneEl);
        if (input) this.uploader.bindFileInput(input);
      }

      // Subscribe Events
      this.uploader.on('queued', (item) => this._onQueued(item));
      this.uploader.on('progress', (item, pct) => this._onProgress(item, pct));
      this.uploader.on('success', (item) => this._onSuccess(item));
      this.uploader.on('error', (item, err) => this._onError(item, err));
      this.uploader.on('cancel', (item) => this._onCancel(item));
    }

    _onQueued(item) {
      if (!this.listEl) return;
      const refs = buildItemCard(item);
      this.itemRefs.set(item.id, refs);
      this.listEl.appendChild(refs.card);

      refs.cancelBtn.addEventListener('click', () => {
        this.uploader.cancel(item);
      });

      this._updateTotal();
    }

    _onProgress(item, pct) {
      const refs = this.itemRefs.get(item.id);
      if (!refs) return;
      refs.fill.style.width = pct + '%';
      refs.meta.textContent = fmtBytes(item.size) + ' · ' + (item.status || 'uploading') + ' · ' + pct + '%';
      this._updateTotal();
    }

    _onSuccess(item) {
      const refs = this.itemRefs.get(item.id);
      if (!refs) return;
      refs.card.classList.add('prova-upload-item--done');
      refs.fill.style.width = '100%';
      const sizeText = item.processedSize && item.processedSize !== item.size
        ? fmtBytes(item.size) + ' → ' + fmtBytes(item.processedSize)
        : fmtBytes(item.size);
      const exifText = item.exifStripped ? ' · EXIF entfernt' : '';
      refs.meta.textContent = sizeText + exifText + ' · ✓ fertig';
      refs.cancelBtn.textContent = '✓';
      refs.cancelBtn.disabled = true;
      this._updateTotal();
    }

    _onError(item, err) {
      const refs = this.itemRefs.get(item.id);
      if (!refs) return;
      refs.card.classList.add('prova-upload-item--error');
      refs.meta.textContent = fmtBytes(item.size) + ' · ✕ Fehler';
      const errMsg = el('div', { class: 'prova-upload-item__error-msg' }, item.error || err.message || 'Unbekannter Fehler');
      const info = refs.card.querySelector('.prova-upload-item__info');
      info.appendChild(errMsg);
      // Retry-Button
      refs.cancelBtn.textContent = '↻';
      refs.cancelBtn.title = 'Erneut versuchen';
      refs.cancelBtn.onclick = () => {
        // Reset + re-queue
        item.status = 'queued';
        item.error = null;
        item.progress = 0;
        refs.card.classList.remove('prova-upload-item--error');
        if (errMsg.parentNode) errMsg.parentNode.removeChild(errMsg);
        refs.cancelBtn.textContent = '✕';
        refs.cancelBtn.onclick = () => this.uploader.cancel(item);
        this.uploader._tick();
      };
      this._updateTotal();
    }

    _onCancel(item) {
      const refs = this.itemRefs.get(item.id);
      if (!refs) return;
      // Animation: fade out
      refs.card.style.opacity = '0.4';
      refs.meta.textContent = fmtBytes(item.size) + ' · abgebrochen';
      refs.cancelBtn.disabled = true;
      this._updateTotal();
    }

    _updateTotal() {
      if (!this.totalEl) return;
      const items = Array.from(this.itemRefs.keys()).map(id => this.uploader.queue.find(q => q.id === id)).filter(Boolean);
      const totalBytes = items.reduce((a, i) => a + i.size, 0);
      const uploadedBytes = items.reduce((a, i) => a + (i.uploadedBytes || (i.status === 'done' ? i.size : 0)), 0);
      const pct = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;

      this.totalEl.classList.add('prova-upload-total');
      this.totalEl.innerHTML = '';
      const text = el('div', { class: 'prova-upload-total__text' },
        items.filter(i => i.status === 'done').length + ' / ' + items.length + ' fertig · ' +
        fmtBytes(uploadedBytes) + ' / ' + fmtBytes(totalBytes));
      const bar = el('div', { class: 'prova-upload-total__bar' });
      const fill = el('div', { class: 'prova-upload-total__fill', style: 'width:' + pct + '%' });
      bar.appendChild(fill);
      this.totalEl.appendChild(text);
      this.totalEl.appendChild(bar);
    }
  }

  window.ProvaUploadUI = ProvaUploadUI;
})();
