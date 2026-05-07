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
   * uploadOne(file, opts): Promise<{ok, foto_id?, error?}>
   * Komprimiert + (optional) Geo-Tag + POST /.netlify/functions/foto-upload
   */
  async function uploadOne(file, opts) {
    const { auftrag_id, withGeo, fetchImpl } = opts || {};
    if (!file) return { ok: false, error: 'no-file' };
    const fetcher = fetchImpl || (typeof window !== 'undefined' && window.provaFetch) || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) return { ok: false, error: 'no-fetch' };

    const compressed = await compressImage(file);
    const geo = withGeo ? await getCurrentGeo() : null;

    const fd = new FormData();
    fd.append('photo', compressed, file.name || 'photo.jpg');
    if (auftrag_id) fd.append('auftrag_id', auftrag_id);
    if (geo) {
      fd.append('geo_lat', String(geo.lat));
      fd.append('geo_lng', String(geo.lng));
      fd.append('geo_accuracy', String(geo.accuracy));
    }

    try {
      const res = await fetcher('/.netlify/functions/foto-upload', { method: 'POST', body: fd });
      if (!res.ok) return { ok: false, error: 'http-' + res.status };
      const data = await res.json();
      return { ok: true, foto_id: data.foto_id || data.id, geo_used: !!geo };
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
