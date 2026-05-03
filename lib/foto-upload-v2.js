/**
 * PROVA Systems — Foto-Upload v2 (MEGA⁹ W1)
 * ════════════════════════════════════════════════════════════════════
 *
 * Modern ES6+ Foto-Upload-Pipeline mit:
 *  - Drag-Drop + Multi-File + Paste-Support (Clipboard-Screenshots)
 *  - EXIF-Strip (DSGVO-Pflicht)
 *  - Image-Optimization (Resize, WebP-Conversion)
 *  - Magic-Bytes File-Type-Validation
 *  - Multi-File-Progress mit Pause/Resume/Cancel
 *  - Upload-Resume bei Connection-Loss (Chunk-Upload)
 *  - Plugin-Architektur (Pre-Upload-Hooks, Post-Upload-Hooks)
 *
 * USAGE:
 *   const uploader = new ProvaUpload({
 *     endpoint: '/.netlify/functions/foto-upload',
 *     stripExif: true,
 *     optimize: { maxWidth: 2048, quality: 0.85, prefer: 'webp' },
 *     allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
 *     maxFileSize: 25 * 1024 * 1024,  // 25MB
 *     chunkSize: 1 * 1024 * 1024       // 1MB
 *   });
 *
 *   uploader.on('progress', (file, percent) => { ... });
 *   uploader.on('success', (file, response) => { ... });
 *   uploader.on('error', (file, error) => { ... });
 *   uploader.on('cancel', (file) => { ... });
 *
 *   uploader.bindDropZone(document.getElementById('drop-zone'));
 *   uploader.bindFileInput(document.getElementById('file-input'));
 *   uploader.bindPaste(document);
 *
 *   uploader.add(fileList);  // Programmatic
 *   uploader.cancel(file);
 *   uploader.cancelAll();
 *
 * ════════════════════════════════════════════════════════════════════
 */
'use strict';

(function () {

  // ─── MAGIC BYTES (File-Type-Detection) ───────────────────────────────
  const MAGIC_BYTES = [
    { ext: 'jpg',  mime: 'image/jpeg', sig: [0xFF, 0xD8, 0xFF] },
    { ext: 'png',  mime: 'image/png',  sig: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    { ext: 'webp', mime: 'image/webp', sig: [0x52, 0x49, 0x46, 0x46], offset_check: 8, additional: [0x57, 0x45, 0x42, 0x50] },
    { ext: 'gif',  mime: 'image/gif',  sig: [0x47, 0x49, 0x46, 0x38] },
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], offset_check: 4, additional: [0x68, 0x65, 0x69, 0x63] },
    { ext: 'heif', mime: 'image/heif', sig: [0x66, 0x74, 0x79, 0x70], offset_check: 4, additional: [0x68, 0x65, 0x69, 0x66] },
    { ext: 'pdf',  mime: 'application/pdf', sig: [0x25, 0x50, 0x44, 0x46] }
  ];

  /**
   * Liest die ersten 16 Bytes einer Datei und prueft gegen Magic-Bytes-Signaturen.
   * Verhindert, dass User .exe als image/jpeg uploaden via MIME-Spoofing.
   *
   * @param {File} file
   * @returns {Promise<{ok: boolean, detected: ?string, mimeMatches: ?boolean}>}
   */
  async function validateFileType(file, allowedMimes) {
    const head = await readFileHead(file, 16);
    let detected = null;

    for (const sig of MAGIC_BYTES) {
      // Primary signature
      let matches = true;
      for (let i = 0; i < sig.sig.length; i++) {
        if (head[i] !== sig.sig[i]) { matches = false; break; }
      }
      if (!matches) continue;

      // Additional offset check (WebP/HEIC)
      if (sig.offset_check && sig.additional) {
        for (let i = 0; i < sig.additional.length; i++) {
          if (head[sig.offset_check + i] !== sig.additional[i]) { matches = false; break; }
        }
      }
      if (matches) { detected = sig; break; }
    }

    if (!detected) {
      return { ok: false, detected: null, reason: 'unknown_magic_bytes' };
    }

    const allowed = !allowedMimes || allowedMimes.includes(detected.mime);
    if (!allowed) {
      return { ok: false, detected: detected.mime, reason: 'not_in_whitelist' };
    }

    // MIME-Spoofing-Detection
    const mimeMatches = !file.type || file.type === detected.mime;

    return { ok: true, detected: detected.mime, mimeMatches };
  }

  function readFileHead(file, bytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const slice = file.slice(0, bytes);
      reader.onload = () => {
        const arr = new Uint8Array(reader.result);
        resolve(arr);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(slice);
    });
  }

  // ─── EXIF-STRIP (DSGVO Art. 25) ──────────────────────────────────────
  /**
   * Entfernt EXIF-Metadaten aus JPEG via Marker-Parsing.
   * Funktioniert nur fuer JPEG (PNG hat keine EXIF, WebP minimal).
   *
   * EXIF-Marker im JPEG: 0xFFE1 (APP1) — wird komplett entfernt.
   * Kein 3rd-Party-Library noetig (keine deps).
   *
   * @param {Blob} blob
   * @returns {Promise<Blob>} clean blob ohne EXIF (oder Original wenn nicht JPEG)
   */
  async function stripExif(blob) {
    if (blob.type !== 'image/jpeg' && !blob.name?.match(/\.jpe?g$/i)) {
      return blob;
    }

    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);

    // JPEG-Start-Marker: 0xFFD8
    if (view.getUint16(0) !== 0xFFD8) return blob;

    let offset = 2;
    const segments = [];

    while (offset < view.byteLength) {
      if (view.getUint8(offset) !== 0xFF) break;
      const marker = view.getUint16(offset);

      // EOI / SOS reached: keep rest as-is
      if (marker === 0xFFD9 || marker === 0xFFDA) {
        segments.push(new Uint8Array(buf, offset));
        break;
      }

      const segmentLength = view.getUint16(offset + 2);

      // Skip APP1 (EXIF), APP2 (FlashPix), APP13 (IPTC) — alle Metadata-Marker
      if (marker === 0xFFE1 || marker === 0xFFE2 || marker === 0xFFED) {
        offset += 2 + segmentLength;
        continue;
      }

      // Keep other segments
      segments.push(new Uint8Array(buf, offset, 2 + segmentLength));
      offset += 2 + segmentLength;
    }

    // Rebuild blob: SOI + clean segments
    const totalLen = 2 + segments.reduce((a, s) => a + s.byteLength, 0);
    const out = new Uint8Array(totalLen);
    out[0] = 0xFF; out[1] = 0xD8;
    let pos = 2;
    for (const s of segments) { out.set(s, pos); pos += s.byteLength; }

    return new Blob([out], { type: 'image/jpeg' });
  }

  // ─── IMAGE OPTIMIZATION (Canvas Resize + WebP-Conversion) ────────────
  /**
   * Verkleinert ein Bild auf maxWidth (proportional) + ggf. WebP-Conversion.
   *
   * @param {Blob} blob
   * @param {object} opts { maxWidth, maxHeight, quality, prefer }
   * @returns {Promise<Blob>}
   */
  async function optimizeImage(blob, opts) {
    opts = Object.assign({ maxWidth: 2048, maxHeight: 2048, quality: 0.85, prefer: 'webp' }, opts || {});

    if (!blob.type.startsWith('image/')) return blob;
    if (blob.type === 'image/heic' || blob.type === 'image/heif') return blob;  // Browser-Support fehlt fuer Canvas

    const img = await loadImage(blob);

    // Resize bei Bedarf
    let { width, height } = img;
    if (width <= opts.maxWidth && height <= opts.maxHeight) {
      // Schon klein — nur ggf. Format-Conversion
      if (opts.prefer === 'webp' && supportsWebPEncode() && blob.type !== 'image/webp') {
        return canvasToBlob(img, width, height, 'image/webp', opts.quality);
      }
      return blob;
    }

    // Calculate new size proportional
    const scale = Math.min(opts.maxWidth / width, opts.maxHeight / height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    const targetType = (opts.prefer === 'webp' && supportsWebPEncode()) ? 'image/webp' : 'image/jpeg';
    return canvasToBlob(img, newWidth, newHeight, targetType, opts.quality);
  }

  function loadImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  function canvasToBlob(img, width, height, type, quality) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob failed')),
        type,
        quality
      );
    });
  }

  let _webpSupport = null;
  function supportsWebPEncode() {
    if (_webpSupport !== null) return _webpSupport;
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    try {
      _webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    } catch (e) {
      _webpSupport = false;
    }
    return _webpSupport;
  }

  // ─── EVENT-EMITTER ──────────────────────────────────────────────────
  class EventEmitter {
    constructor() { this._handlers = {}; }
    on(event, fn) { (this._handlers[event] = this._handlers[event] || []).push(fn); return this; }
    off(event, fn) {
      if (!this._handlers[event]) return this;
      this._handlers[event] = this._handlers[event].filter(h => h !== fn);
      return this;
    }
    emit(event, ...args) {
      (this._handlers[event] || []).forEach(fn => {
        try { fn(...args); } catch (e) { console.error('[ProvaUpload] handler error', e); }
      });
    }
  }

  // ─── UPLOAD-ITEM (pro File ein State-Objekt) ─────────────────────────
  class UploadItem {
    constructor(file, opts) {
      this.id = 'up-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      this.file = file;
      this.name = file.name;
      this.size = file.size;
      this.type = file.type;
      this.processedBlob = null;          // nach EXIF-Strip + Optimize
      this.processedSize = null;
      this.status = 'queued';             // queued|validating|processing|uploading|paused|done|error|cancelled
      this.progress = 0;
      this.error = null;
      this.response = null;
      this.uploadedBytes = 0;
      this.resumeToken = null;
      this.controller = null;             // AbortController fuer Cancel
      this.opts = opts;
    }

    cancel() {
      if (this.controller) { try { this.controller.abort(); } catch (e) {} }
      this.status = 'cancelled';
    }
  }

  // ─── HAUPT-CLASS ────────────────────────────────────────────────────
  class ProvaUpload extends EventEmitter {
    /**
     * @param {object} config
     * @param {string} config.endpoint POST endpoint (default: /.netlify/functions/foto-upload)
     * @param {boolean} config.stripExif (default: true)
     * @param {object} config.optimize { maxWidth, quality, prefer }
     * @param {Array<string>} config.allowedTypes (MIME-Whitelist)
     * @param {number} config.maxFileSize (Bytes, default 25MB)
     * @param {number} config.chunkSize (default 1MB, 0 = no chunking)
     * @param {number} config.concurrency (parallel uploads, default 2)
     */
    constructor(config) {
      super();
      this.config = Object.assign({
        endpoint: '/.netlify/functions/foto-upload',
        stripExif: true,
        optimize: { maxWidth: 2048, maxHeight: 2048, quality: 0.85, prefer: 'webp' },
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
        maxFileSize: 25 * 1024 * 1024,
        chunkSize: 0,                      // Default: kein chunking (einfacher Upload)
        concurrency: 2
      }, config || {});

      this.queue = [];                     // Array<UploadItem>
      this.activeCount = 0;
      this._paused = false;

      // Auto-Resume bei Online-Event (Chunk-Upload-Mode)
      this._onlineHandler = this._onOnline.bind(this);
      window.addEventListener('online', this._onlineHandler);
    }

    /**
     * Fuegt Files in die Queue. Returns Promise<UploadItem[]>.
     */
    async add(files) {
      const fileList = Array.isArray(files) ? files : Array.from(files);
      const items = [];
      for (const f of fileList) {
        if (!(f instanceof File) && !(f instanceof Blob)) continue;
        const item = new UploadItem(f, this.config);
        items.push(item);
        this.queue.push(item);
        this.emit('queued', item);
      }
      this._tick();
      return items;
    }

    /**
     * Single-File-Upload (Promise-API).
     */
    async upload(file) {
      const items = await this.add([file]);
      return new Promise((resolve, reject) => {
        const item = items[0];
        const successHandler = (it, response) => { if (it === item) { cleanup(); resolve(response); } };
        const errorHandler   = (it, err) => { if (it === item) { cleanup(); reject(err); } };
        const cancelHandler  = (it) => { if (it === item) { cleanup(); reject(new Error('cancelled')); } };
        const cleanup = () => {
          this.off('success', successHandler);
          this.off('error', errorHandler);
          this.off('cancel', cancelHandler);
        };
        this.on('success', successHandler);
        this.on('error', errorHandler);
        this.on('cancel', cancelHandler);
      });
    }

    cancel(item) {
      if (typeof item === 'string') item = this.queue.find(q => q.id === item);
      if (!item) return;
      item.cancel();
      this.emit('cancel', item);
    }

    cancelAll() {
      this.queue.filter(q => q.status !== 'done').forEach(item => this.cancel(item));
    }

    pause() { this._paused = true; }
    resume() { this._paused = false; this._tick(); }

    destroy() {
      this.cancelAll();
      window.removeEventListener('online', this._onlineHandler);
    }

    // ─── INTERNAL ─────────────────────────────────────────────────────
    _tick() {
      if (this._paused) return;
      while (this.activeCount < this.config.concurrency) {
        const next = this.queue.find(q => q.status === 'queued');
        if (!next) return;
        this.activeCount++;
        this._processItem(next).finally(() => {
          this.activeCount--;
          this._tick();
        });
      }
    }

    async _processItem(item) {
      try {
        // 1. Size-Check
        if (item.size > this.config.maxFileSize) {
          throw new Error('Datei zu gross: ' + Math.round(item.size / 1024 / 1024) + 'MB > ' + Math.round(this.config.maxFileSize / 1024 / 1024) + 'MB');
        }

        // 2. Magic-Bytes-Validation
        item.status = 'validating';
        this.emit('progress', item, 5);
        const v = await validateFileType(item.file, this.config.allowedTypes);
        if (!v.ok) {
          throw new Error('Datei-Typ ungueltig: ' + (v.reason || 'unknown'));
        }
        if (!v.mimeMatches) {
          // MIME-Spoofing detection — log but allow
          console.warn('[ProvaUpload] MIME-Spoofing detected:', item.name, item.type, '->', v.detected);
        }
        item.detectedMime = v.detected;

        // 3. EXIF-Strip
        item.status = 'processing';
        this.emit('progress', item, 15);
        let blob = item.file;
        let exifStripped = false;
        if (this.config.stripExif) {
          const before = blob.size;
          blob = await stripExif(blob);
          exifStripped = (blob.size !== before);
        }

        // 4. Image-Optimization
        if (this.config.optimize && blob.type.startsWith('image/')) {
          this.emit('progress', item, 25);
          blob = await optimizeImage(blob, this.config.optimize);
        }

        item.processedBlob = blob;
        item.processedSize = blob.size;
        item.exifStripped = exifStripped;

        // 5. Plugin-Hook: pre-upload
        if (this.config.preUpload) {
          await this.config.preUpload(item);
        }

        // 6. Upload (mit Chunk oder direkt)
        item.status = 'uploading';
        item.controller = new AbortController();

        if (this.config.chunkSize > 0 && blob.size > this.config.chunkSize) {
          await this._uploadChunked(item, blob);
        } else {
          await this._uploadSimple(item, blob);
        }

        item.status = 'done';
        item.progress = 100;
        this.emit('progress', item, 100);
        this.emit('success', item, item.response);

        // 7. Plugin-Hook: post-upload
        if (this.config.postUpload) {
          try { await this.config.postUpload(item); } catch (e) { console.warn('postUpload hook fail', e); }
        }
      } catch (err) {
        if (item.status === 'cancelled') return;  // explicit cancel: keine error-event
        item.status = 'error';
        item.error = err.message || String(err);
        this.emit('error', item, err);
      }
    }

    async _uploadSimple(item, blob) {
      const fd = new FormData();
      fd.append('file', blob, item.name);
      fd.append('original_size', String(item.size));
      fd.append('processed_size', String(item.processedSize || 0));
      fd.append('exif_stripped', String(!!item.exifStripped));
      if (this.config.metadata) {
        fd.append('metadata', JSON.stringify(this.config.metadata));
      }

      // XHR fuer Progress-Events (fetch hat keine native upload progress)
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 70) + 25;  // 25-95%
            item.progress = pct;
            item.uploadedBytes = e.loaded;
            this.emit('progress', item, pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { item.response = JSON.parse(xhr.responseText); }
            catch (e) { item.response = { ok: true, raw: xhr.responseText }; }
            resolve();
          } else {
            reject(new Error('Upload fehlgeschlagen: HTTP ' + xhr.status + ' ' + (xhr.responseText || '').slice(0, 200)));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('cancelled'));
        item.controller.signal.addEventListener('abort', () => xhr.abort());
        xhr.open('POST', this.config.endpoint);
        // Auth-Token aus localStorage falls vorhanden
        const token = localStorage.getItem('prova_jwt') || localStorage.getItem('prova_token');
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.send(fd);
      });
    }

    async _uploadChunked(item, blob) {
      const chunkSize = this.config.chunkSize;
      const total = blob.size;
      const chunks = Math.ceil(total / chunkSize);

      // Resume-Token-Pattern: bestehenden State aus localStorage laden
      const resumeKey = 'prova-upload-resume-' + item.id;
      let startChunk = 0;
      try {
        const saved = localStorage.getItem(resumeKey);
        if (saved) {
          const state = JSON.parse(saved);
          if (state.name === item.name && state.size === item.size) {
            startChunk = state.lastCompletedChunk + 1;
            item.resumeToken = state.token;
          }
        }
      } catch (e) {}

      for (let i = startChunk; i < chunks; i++) {
        if (item.status === 'cancelled') throw new Error('cancelled');

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, total);
        const chunk = blob.slice(start, end);

        const fd = new FormData();
        fd.append('chunk', chunk, item.name + '.part' + i);
        fd.append('chunk_index', String(i));
        fd.append('chunk_total', String(chunks));
        fd.append('upload_id', item.id);
        if (item.resumeToken) fd.append('resume_token', item.resumeToken);
        if (this.config.metadata) fd.append('metadata', JSON.stringify(this.config.metadata));

        const res = await fetch(this.config.endpoint, {
          method: 'POST',
          body: fd,
          signal: item.controller.signal,
          headers: this._authHeaders()
        }).catch(err => {
          if (err.name === 'AbortError') throw new Error('cancelled');
          // Connection lost: save resume-state, throw
          this._saveResumeState(resumeKey, item, i - 1);
          throw new Error('Network error: ' + err.message);
        });

        if (!res.ok) throw new Error('Chunk-Upload fehlgeschlagen: HTTP ' + res.status);

        const json = await res.json().catch(() => ({}));
        if (json.resume_token) item.resumeToken = json.resume_token;

        // Save progress
        this._saveResumeState(resumeKey, item, i);

        item.uploadedBytes = end;
        item.progress = Math.round((end / total) * 70) + 25;  // 25-95%
        this.emit('progress', item, item.progress);

        if (i === chunks - 1) {
          // Final chunk
          item.response = json;
          // Cleanup resume-state
          try { localStorage.removeItem(resumeKey); } catch (e) {}
        }
      }
    }

    _saveResumeState(key, item, lastCompletedChunk) {
      try {
        localStorage.setItem(key, JSON.stringify({
          name: item.name,
          size: item.size,
          lastCompletedChunk: lastCompletedChunk,
          token: item.resumeToken,
          ts: Date.now()
        }));
      } catch (e) {}
    }

    _onOnline() {
      if (this._paused) return;
      // Retry items that errored due to network
      for (const item of this.queue) {
        if (item.status === 'error' && /Network error/i.test(item.error || '')) {
          item.status = 'queued';
          item.error = null;
        }
      }
      this._tick();
    }

    _authHeaders() {
      const token = localStorage.getItem('prova_jwt') || localStorage.getItem('prova_token');
      return token ? { 'Authorization': 'Bearer ' + token } : {};
    }

    // ─── BINDING-HELPERS ──────────────────────────────────────────────
    bindFileInput(inputEl) {
      if (!inputEl) return;
      inputEl.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          this.add(e.target.files);
          inputEl.value = '';  // reset for re-select
        }
      });
    }

    bindDropZone(zoneEl) {
      if (!zoneEl) return;
      ['dragover', 'dragenter'].forEach(ev => zoneEl.addEventListener(ev, (e) => {
        e.preventDefault();
        zoneEl.classList.add('prova-dropzone-active');
      }));
      ['dragleave', 'drop'].forEach(ev => zoneEl.addEventListener(ev, (e) => {
        if (ev === 'drop') {
          e.preventDefault();
          if (e.dataTransfer && e.dataTransfer.files.length) {
            this.add(e.dataTransfer.files);
          }
        }
        if (ev !== 'dragleave' || e.target === zoneEl) {
          zoneEl.classList.remove('prova-dropzone-active');
        }
      }));
    }

    bindPaste(target) {
      target = target || document;
      target.addEventListener('paste', (e) => {
        if (!e.clipboardData) return;
        const files = [];
        for (const item of e.clipboardData.items) {
          if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
        if (files.length) {
          e.preventDefault();
          this.add(files);
        }
      });
    }
  }

  // Public API
  window.ProvaUpload = ProvaUpload;
  window.ProvaUploadHelpers = {
    validateFileType: validateFileType,
    stripExif: stripExif,
    optimizeImage: optimizeImage,
    supportsWebPEncode: supportsWebPEncode,
    MAGIC_BYTES: MAGIC_BYTES
  };

})();
