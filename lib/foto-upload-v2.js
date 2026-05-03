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
  // MEGA¹⁰ W4: KRITISCHER BUGFIX + Erweiterung
  // Bug pre-MEGA¹⁰: HEIC-sig wurde an Offset 0 gepruefft, aber echte HEIC-Files
  // haben 'ftyp' an Offset 4 (nach 4-byte Box-Size-Header). Production-Files
  // vom iPhone wurden NICHT erkannt!
  // Fix: Neues sig_offset-Feld (Default 0). HEIC-Sigs jetzt mit sig_offset=4.
  // Plus erweitert: HEIC-Brand-Variants (mif1=iOS 14+/msf1/heix/hevc) +
  // TIFF (II/MM byte-order) + BMP.
  const MAGIC_BYTES = [
    { ext: 'jpg',  mime: 'image/jpeg', sig: [0xFF, 0xD8, 0xFF] },
    { ext: 'png',  mime: 'image/png',  sig: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    { ext: 'webp', mime: 'image/webp', sig: [0x52, 0x49, 0x46, 0x46], offset_check: 8, additional: [0x57, 0x45, 0x42, 0x50] },
    { ext: 'gif',  mime: 'image/gif',  sig: [0x47, 0x49, 0x46, 0x38] },
    // HEIC/HEIF: ftyp-Box (sig_offset=4 nach Box-Size) + Brand an offset 8.
    // iPhone schreibt je nach iOS-Version unterschiedliche Brands.
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x63] }, // 'heic'
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x78] }, // 'heix'
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x6D] }, // 'heim'
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x73] }, // 'heis'
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x76, 0x63] }, // 'hevc'
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x76, 0x78] }, // 'hevx'
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x6D, 0x69, 0x66, 0x31] }, // 'mif1' (iOS 14+)
    { ext: 'heic', mime: 'image/heic', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x6D, 0x73, 0x66, 0x31] }, // 'msf1'
    { ext: 'heif', mime: 'image/heif', sig: [0x66, 0x74, 0x79, 0x70], sig_offset: 4, offset_check: 8, additional: [0x68, 0x65, 0x69, 0x66] }, // 'heif'
    // TIFF: 'II' = Little-endian (Intel), 'MM' = Big-endian (Motorola). Multifunktionsdrucker scannen oft als TIFF.
    { ext: 'tiff', mime: 'image/tiff', sig: [0x49, 0x49, 0x2A, 0x00] }, // II*\0
    { ext: 'tiff', mime: 'image/tiff', sig: [0x4D, 0x4D, 0x00, 0x2A] }, // MM\0*
    // BMP: 'BM' (Windows-Workflows)
    { ext: 'bmp',  mime: 'image/bmp',  sig: [0x42, 0x4D] },
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
      // MEGA¹⁰ W4: sig_offset support — primary signature kann an offset > 0 stehen
      // (z.B. HEIC 'ftyp' an Offset 4 nach Box-Size).
      const primaryOffset = sig.sig_offset || 0;

      // Primary signature
      let matches = true;
      for (let i = 0; i < sig.sig.length; i++) {
        if (head[primaryOffset + i] !== sig.sig[i]) { matches = false; break; }
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

  // ─── EXIF-ORIENTATION-READER (MEGA¹⁰ W4) ─────────────────────────────
  /**
   * Liest EXIF-Orientation-Tag (0x0112) aus JPEG-Header.
   * MUSS aufgerufen werden VOR stripExif, damit Orientation in Canvas-
   * Transform angewendet werden kann (sonst landet iPhone-Hochformat
   * quer im Output).
   *
   * Returns: 1 (none) bis 8 (90° CCW + flip). Default 1 wenn nicht gefunden.
   *
   * EXIF-Layout: APP1 [4 byte length] "Exif\0\0" TIFF-Header IFD0 ...
   *   TIFF-Header: 'II' (LE) oder 'MM' (BE) + 0x002A + IFD0-Offset (4 byte)
   *   IFD0-Entry: tag(2) + type(2) + count(4) + value(4)
   *   Orientation-Tag = 0x0112, type = SHORT (3), value-pos = entry+8 (2 byte)
   *
   * @param {Blob} blob
   * @returns {Promise<number>} 1..8, default 1
   */
  async function readExifOrientation(blob) {
    if (blob.type !== 'image/jpeg' && !(blob.name && blob.name.match(/\.jpe?g$/i))) {
      return 1;
    }

    // Read first 64KB — ausreichend fuer EXIF-IFD0 (Orientation steht immer vorne)
    const buf = await blob.slice(0, 65536).arrayBuffer();
    const view = new DataView(buf);

    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return 1;

    let offset = 2;
    while (offset < view.byteLength - 4) {
      if (view.getUint8(offset) !== 0xFF) break;

      const marker = view.getUint16(offset);

      // SOS / EOI: Bilddaten ab hier — kein EXIF mehr
      if (marker === 0xFFD9 || marker === 0xFFDA) return 1;

      const segLen = view.getUint16(offset + 2);

      if (marker === 0xFFE1) {
        // APP1 — pruefen ob "Exif\0\0"
        if (offset + 4 + 6 > view.byteLength) return 1;
        const exifMarker = view.getUint32(offset + 4);
        if (exifMarker !== 0x45786966) {
          // not EXIF (could be XMP) — skip segment
          offset += 2 + segLen;
          continue;
        }

        // TIFF-Header startet nach "Exif\0\0" = offset+10
        const tiffStart = offset + 10;
        if (tiffStart + 8 > view.byteLength) return 1;

        const byteOrder = view.getUint16(tiffStart);
        const littleEndian = (byteOrder === 0x4949);

        if (!littleEndian && byteOrder !== 0x4D4D) return 1;

        // IFD0-Offset
        const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
        const ifdStart = tiffStart + ifd0Offset;
        if (ifdStart + 2 > view.byteLength) return 1;

        const tagCount = view.getUint16(ifdStart, littleEndian);
        if (ifdStart + 2 + tagCount * 12 > view.byteLength) return 1;

        for (let i = 0; i < tagCount; i++) {
          const entryStart = ifdStart + 2 + i * 12;
          const tag = view.getUint16(entryStart, littleEndian);
          if (tag === 0x0112) {
            // Orientation-Tag found
            const orientation = view.getUint16(entryStart + 8, littleEndian);
            if (orientation >= 1 && orientation <= 8) return orientation;
            return 1;
          }
        }
        return 1;
      }

      offset += 2 + segLen;
    }
    return 1;
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

  // ─── ORIENTATION-TRANSFORM (MEGA¹⁰ W4) ───────────────────────────────
  /**
   * EXIF-Orientation auf Canvas-Context anwenden.
   *
   * Werte (EXIF-Spec):
   *  1 = TopLeft (default, no rotation)
   *  2 = TopRight (horizontal flip)
   *  3 = BottomRight (180° rotation)
   *  4 = BottomLeft (vertical flip)
   *  5 = LeftTop (90° CW + horizontal flip)
   *  6 = RightTop (90° CW)               <- iPhone-Hochformat
   *  7 = RightBottom (90° CCW + horizontal flip)
   *  8 = LeftBottom (90° CCW)
   *
   * Bei Werten 5-8 sind die finalen Canvas-Dimensionen (height, width)
   * statt (width, height) — Caller muss das beruecksichtigen.
   */
  function applyOrientationTransform(ctx, orientation, w, h) {
    switch (orientation) {
      case 2: ctx.transform(-1,  0, 0,  1,  w,  0); break;
      case 3: ctx.transform(-1,  0, 0, -1,  w,  h); break;
      case 4: ctx.transform( 1,  0, 0, -1,  0,  h); break;
      case 5: ctx.transform( 0,  1, 1,  0,  0,  0); break;
      case 6: ctx.transform( 0,  1,-1,  0,  h,  0); break;
      case 7: ctx.transform( 0, -1,-1,  0,  h,  w); break;
      case 8: ctx.transform( 0, -1, 1,  0,  0,  w); break;
      default: break;  // 1 = identity
    }
  }

  // Canvas-Size-Limit. iOS-Safari: 4096, Chrome-Mobile: 8192, Desktop: 16384+.
  // Konservativ 4096 fuer iOS-Safari-Kompatibilitaet (groesste SV-Mobile-Plattform).
  const MAX_CANVAS_DIM = 4096;

  // ─── IMAGE OPTIMIZATION (MEGA¹⁰ W4: Orientation-aware + Memory-safe) ─
  /**
   * Verkleinert ein Bild auf maxWidth (proportional) mit:
   * - EXIF-Orientation-Korrektur (iPhone-Hochformat-Bug-Fix)
   * - URL.revokeObjectURL (Memory-Leak-Fix)
   * - Canvas-Size-Limit (iOS-Safari 4096px-Begrenzung)
   * - WebP-Conversion bei Browser-Support
   *
   * @param {Blob} blob
   * @param {object} opts { maxWidth, maxHeight, quality, prefer, orientation }
   * @returns {Promise<Blob>}
   */
  async function optimizeImage(blob, opts) {
    opts = Object.assign({ maxWidth: 2048, maxHeight: 2048, quality: 0.85, prefer: 'webp' }, opts || {});

    if (!blob.type.startsWith('image/')) return blob;
    if (blob.type === 'image/heic' || blob.type === 'image/heif') return blob;  // Browser-Canvas kann HEIC nicht decoden

    // Orientation lesen BEFORE Image-Load (vor stripExif!)
    // Caller kann opts.orientation explicit setzen wenn schon bekannt
    const orientation = opts.orientation || (blob.type === 'image/jpeg' ? await readExifOrientation(blob) : 1);

    const img = await loadImage(blob);
    const imgUrl = img.src;  // fuer revokeObjectURL

    try {
      // Orientation 5-8 = 90°-Rotation → Dimensionen swappen fuer "logische" Groesse
      let logicalWidth = img.width, logicalHeight = img.height;
      if (orientation >= 5 && orientation <= 8) {
        [logicalWidth, logicalHeight] = [img.height, img.width];
      }

      // Resize-Skalierung berechnen (proportional, nie hochskalieren)
      const scale = Math.min(opts.maxWidth / logicalWidth, opts.maxHeight / logicalHeight, 1);
      let outWidth = Math.round(logicalWidth * scale);
      let outHeight = Math.round(logicalHeight * scale);

      // Canvas-Limit-Defense (iOS-Safari)
      if (outWidth > MAX_CANVAS_DIM || outHeight > MAX_CANVAS_DIM) {
        const limitScale = MAX_CANVAS_DIM / Math.max(outWidth, outHeight);
        outWidth = Math.round(outWidth * limitScale);
        outHeight = Math.round(outHeight * limitScale);
        console.warn('[ProvaUpload] target dims exceeded MAX_CANVAS_DIM, clamped to', outWidth, 'x', outHeight);
      }

      // Schon klein UND keine Orientation-Korrektur UND keine Format-Conversion noetig → Original
      const needsTransform = (orientation > 1) || (outWidth !== img.width) || (outHeight !== img.height);
      const needsFormatConv = (opts.prefer === 'webp' && supportsWebPEncode() && blob.type !== 'image/webp');
      if (!needsTransform && !needsFormatConv) {
        return blob;
      }

      // Canvas: Output-Dimensionen sind die LOGISCHEN (post-rotation)
      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');

      if (orientation > 1) {
        // Transform anwenden — bei rotierten Orientations (5-8) sind drawImage-Source-Dims
        // PHYSISCH (img.width/height) — nicht logisch
        applyOrientationTransform(ctx, orientation, outWidth, outHeight);
      }

      // drawImage: Source = ganzes Bild, Dest = canvas-Dims
      // Bei Rotation 5-8 sind die canvas-Dims gegenueber dem Img-Aspect gedreht — also
      // muessen wir die Dest-Dims im "physischen" Koordinatensystem (post-Transform) angeben.
      // Vereinfachung: bei 5-8 zeichnen wir auf (outHeight, outWidth) im transformed-coord-system.
      if (orientation >= 5 && orientation <= 8) {
        ctx.drawImage(img, 0, 0, outHeight, outWidth);
      } else {
        ctx.drawImage(img, 0, 0, outWidth, outHeight);
      }

      const targetType = (opts.prefer === 'webp' && supportsWebPEncode()) ? 'image/webp' : 'image/jpeg';

      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          (out) => out ? resolve(out) : reject(new Error('canvas.toBlob failed (size or format limit)')),
          targetType, opts.quality
        );
      });
    } finally {
      // Memory-Leak-Fix (CRITICAL): Mobile-Browser haben begrenzten Heap
      try { URL.revokeObjectURL(imgUrl); } catch (e) {}
    }
  }

  // ─── loadImage (MEGA¹⁰ W4: Memory-safe error path) ───────────────────
  function loadImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        try { URL.revokeObjectURL(url); } catch (_) {}
        reject(new Error('Image-Decode failed: ' + (blob.type || 'unknown')));
      };
      img.src = url;
    });
  }

  // canvasToBlob: Legacy-Helper, weiterhin exposed fuer simple Use-Cases.
  // optimizeImage() inlined diesen Helper jetzt fuer Orientation-Awareness.
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
        // MEGA¹⁰ W4: Orientation MUSS vor stripExif gelesen werden,
        // sonst ist Tag 0x0112 weg und Hochformat-Fotos landen quer.
        item.status = 'processing';
        this.emit('progress', item, 15);
        let blob = item.file;
        let exifStripped = false;
        let orientation = 1;
        if (blob.type === 'image/jpeg') {
          try { orientation = await readExifOrientation(blob); } catch (e) { /* default 1 */ }
        }
        item.orientation = orientation;
        if (this.config.stripExif) {
          const before = blob.size;
          blob = await stripExif(blob);
          exifStripped = (blob.size !== before);
        }

        // 4. Image-Optimization (mit Orientation aus pre-strip-Phase)
        if (this.config.optimize && blob.type.startsWith('image/')) {
          this.emit('progress', item, 25);
          const optOpts = Object.assign({}, this.config.optimize, { orientation: orientation });
          blob = await optimizeImage(blob, optOpts);
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
    readExifOrientation: readExifOrientation,        // MEGA¹⁰ W4
    applyOrientationTransform: applyOrientationTransform,  // MEGA¹⁰ W4
    supportsWebPEncode: supportsWebPEncode,
    MAGIC_BYTES: MAGIC_BYTES,
    MAX_CANVAS_DIM: MAX_CANVAS_DIM                   // MEGA¹⁰ W4
  };

})();
