import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const STORAGE_BUCKET = 'sv-files';
const MAX_BYTES = 5 * 1024 * 1024;

const SUPPORTED_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png' };
const REJECT_MIME: Record<string, string> = {
  'image/heic': 'HEIC nicht unterstützt — bitte als JPEG/PNG hochladen.',
  'image/heif': 'HEIF nicht unterstützt — bitte als JPEG/PNG hochladen.',
  'image/webp': 'WebP nicht unterstützt — bitte als JPEG/PNG hochladen.'
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const r = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { r.set(c, o); o += c.length; }
  return r;
}

function stripJpegExif(buf: Uint8Array): Uint8Array {
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return buf;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out: Uint8Array[] = [new Uint8Array([0xFF, 0xD8])];
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xFF) break;
    const marker = buf[i + 1];
    if (marker === 0xD9) { out.push(new Uint8Array([0xFF, 0xD9])); break; }
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { out.push(buf.slice(i, i + 2)); i += 2; continue; }
    if (i + 4 > buf.length) break;
    const segLen = view.getUint16(i + 2);
    const segEnd = i + 2 + segLen;
    if (marker === 0xE1) { i = segEnd; continue; }
    if (marker === 0xDA) { out.push(buf.slice(i, buf.length)); break; }
    out.push(buf.slice(i, segEnd));
    i = segEnd;
  }
  return concatBytes(out);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return J({ error: 'Method Not Allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
  const sb = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await sb.auth.getUser(auth.slice(7));
  if (!user) return J({ error: 'UNAUTHORIZED' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'Invalid JSON' }, 400); }
  if (!body.image_base64 || typeof body.image_base64 !== 'string') return J({ error: 'image_base64 pflicht' }, 400);

  const mime = String(body.mime_type || '').toLowerCase();
  if (REJECT_MIME[mime]) return J({ error: REJECT_MIME[mime] }, 415);
  if (!SUPPORTED_MIME[mime]) return J({ error: 'mime_type nicht unterstützt', supported: Object.keys(SUPPORTED_MIME) }, 400);

  const { data: ms } = await sb.from('workspace_memberships').select('workspace_id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
  if (!ms) return J({ error: 'Kein Workspace' }, 404);

  let bytes: Uint8Array;
  try { bytes = base64ToBytes(body.image_base64.replace(/^data:[^;]+;base64,/, '')); }
  catch { return J({ error: 'image_base64 invalid' }, 400); }
  if (bytes.length > MAX_BYTES) return J({ error: 'image too large (max 5MB)', size: bytes.length }, 413);
  if (mime === 'image/jpeg' || mime === 'image/jpg') bytes = stripJpegExif(bytes);

  const ext = SUPPORTED_MIME[mime];
  const fotoId = crypto.randomUUID();
  const path = `fotos/${ms.workspace_id}/${body.auftrag_id || 'unzugeordnet'}/${fotoId}.${ext}`;
  const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (upErr) return J({ error: 'Upload fehlgeschlagen: ' + upErr.message }, 502);

  const { data: pub } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl ?? null;

  const { data: ins, error: insErr } = await sb.from('fotos').insert({
    id: fotoId, workspace_id: ms.workspace_id, auftrag_id: body.auftrag_id ?? null,
    ortstermin_id: body.ortstermin_id ?? null, typ: body.typ ?? 'standard',
    beschreibung: body.beschreibung ?? null, storage_path: path, mime_type: mime,
    original_filename: body.filename ?? null, exif_stripped: true, captured_at: body.captured_at ?? null,
    geo_lat: body.geo_lat ?? null, geo_lng: body.geo_lng ?? null, byte_size: bytes.length,
    uploaded_by_user_id: user.id
  }).select('id').maybeSingle();
  if (insErr) return J({ error: 'DB-Insert fehlgeschlagen: ' + insErr.message }, 500);

  return J({
    foto_id: ins?.id ?? fotoId, storage_bucket: STORAGE_BUCKET, storage_path: path,
    public_url: publicUrl, exif_stripped: true
  });
});
