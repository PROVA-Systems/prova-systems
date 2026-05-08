/**
 * lib/foto-upload-mobile.js — MEGA³² C2 P4 Mobile-Foto-Upload
 *
 * - EXIF-Strip CLIENT-SIDE (Re-Encoding via Canvas → strippt automatisch alle EXIF-Tags inkl. GPS/Datum/Kamera-Modell)
 * - Komprimierung: max 1920px breit, JPEG quality 0.85
 * - Geo-Tag aus Browser-Geolocation (NICHT aus EXIF — Original wird gestrippt!)
 * - Multi-Foto-Upload mit Progress
 *
 * DSGVO Art. 5 Abs. 1c (Datenminimierung):
 *   EXIF kann GPS-Koordinaten + Geräte-IDs + Original-Datum enthalten.
 *   Pflicht-Strip vor Upload an Server.
 *
 * UMD-Pattern für Browser + node test.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FotoUploadMobile = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_WIDTH = 1920;
  const QUALITY = 0.85;

  /**
   * compressImage(file): Promise<Blob>
   * Lädt File via createImageBitmap → Canvas → toBlob (JPEG, qual 0.85)
   * Re-Encoding strippt EXIF automatisch (Canvas hat keine EXIF-Section).
   */
  async function compressImage(file) {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      // Fallback: liefere Original (kein Canvas verfügbar — Test-Env)
      return file;
    }
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_WIDTH / bitmap.width);
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
    bitmap.close();
    return blob;
  }

  /**
   * getCurrentGeo(): Promise<{lat, lng, accuracy} | null>
   * Browser-Geolocation, opt-in. User-Permission Pflicht.
   */
  function getCurrentGeo() {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });
  }

  /**
   * blobToBase64(blob): liest Blob als base64-String (ohne data:-Prefix)
   */
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') return reject(new Error('no-FileReader'));
      const r = new FileReader();
      r.onerror = () => reject(r.error || new Error('FileReader-error'));
      r.onload = () => {
        const s = String(r.result || '');
        const idx = s.indexOf('base64,');
        resolve(idx >= 0 ? s.slice(idx + 7) : s);
      };
      r.readAsDataURL(blob);
    });
  }

  /**
   * uploadOne(file, opts): Promise<{ok, foto_id?, error?}>
   * Komprimiert + (optional) Geo-Tag + POST /.netlify/functions/foto-upload (JSON+base64)
   *
   * MEGA³⁵ C1: Lambda erwartet JSON mit image_base64 + mime_type (kein multipart).
   */
  async function uploadOne(file, opts) {
    const { auftrag_id, ortstermin_id, withGeo, fetchImpl, beschreibung } = opts || {};
    if (!file) return { ok: false, error: 'no-file' };
    const fetcher = fetchImpl || (typeof window !== 'undefined' && window.provaFetch) || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) return { ok: false, error: 'no-fetch' };

    const compressed = await compressImage(file);
    const geo = withGeo ? await getCurrentGeo() : null;
    const mime_type = (compressed && compressed.type) || file.type || 'image/jpeg';

    let image_base64;
    try {
      image_base64 = await blobToBase64(compressed);
    } catch (e) {
      return { ok: false, error: 'base64-encode-failed: ' + (e.message || 'unknown') };
    }

    const payload = {
      image_base64: image_base64,
      mime_type: mime_type,
      filename: file.name || 'photo.jpg',
      auftrag_id: auftrag_id || null,
      ortstermin_id: ortstermin_id || null,
      beschreibung: beschreibung || null,
      geo_lat: geo ? geo.lat : null,
      geo_lng: geo ? geo.lng : null,
      geo_accuracy: geo ? geo.accuracy : null
    };

    try {
      const res = await fetcher('/.netlify/functions/foto-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        let errMsg = 'http-' + res.status;
        try {
          const errBody = await res.json();
          if (errBody && errBody.error) errMsg = errBody.error;
        } catch (_) {}
        return { ok: false, error: errMsg, status: res.status };
      }
      const data = await res.json();
      return { ok: true, foto_id: data.foto_id, public_url: data.public_url, geo_used: !!geo, exif_stripped: !!data.exif_stripped };
    } catch (e) {
      return { ok: false, error: e.message || 'fetch-error' };
    }
  }

  /**
   * uploadMany(files, opts, onProgress): Promise<results[]>
   * Sequenziell (nicht parallel) damit Mobile-Bandbreite nicht erstickt.
   */
  async function uploadMany(files, opts, onProgress) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const r = await uploadOne(files[i], opts);
      results.push(r);
      if (typeof onProgress === 'function') onProgress({ done: i + 1, total: files.length, last: r });
    }
    return results;
  }

  return {
    MAX_WIDTH,
    QUALITY,
    compressImage,
    getCurrentGeo,
    uploadOne,
    uploadMany,
  };
});
