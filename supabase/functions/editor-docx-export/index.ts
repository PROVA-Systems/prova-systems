import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prova-workspace'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

function esc(s: any): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function runProps(marks: any[]): string {
  if (!Array.isArray(marks) || marks.length === 0) return '';
  let out = '<w:rPr>';
  for (const m of marks) {
    switch (m.type) {
      case 'bold': out += '<w:b/>'; break;
      case 'italic': out += '<w:i/>'; break;
      case 'underline': out += '<w:u w:val="single"/>'; break;
      case 'strike': out += '<w:strike/>'; break;
      case 'code': out += '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>'; break;
      case 'highlight': out += '<w:highlight w:val="yellow"/>'; break;
      case 'textStyle':
        if (m.attrs?.color) {
          const hex = String(m.attrs.color).replace(/^#/, '').toUpperCase();
          if (/^[0-9A-F]{6}$/.test(hex)) out += '<w:color w:val="' + hex + '"/>';
        }
        break;
    }
  }
  out += '</w:rPr>';
  return out;
}

function renderNode(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    return '<w:r>' + runProps(node.marks ?? []) + '<w:t xml:space="preserve">' + esc(node.text ?? '') + '</w:t></w:r>';
  }
  if (node.type === 'hardBreak') return '<w:r><w:br/></w:r>';
  const inner = (node.content ?? []).map(renderNode).join('');
  if (node.type === 'paragraph' || node.type === 'doc') {
    if (node.type === 'doc') return inner;
    return '<w:p>' + inner + '</w:p>';
  }
  if (node.type === 'heading') {
    const lvl = node.attrs?.level || 1;
    return '<w:p><w:pPr><w:pStyle w:val="Heading' + lvl + '"/></w:pPr>' + inner + '</w:p>';
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return (node.content ?? []).map((item: any) => {
      const itemInner = (item.content ?? []).map(renderNode).join('');
      return '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr>' + itemInner + '</w:p>';
    }).join('');
  }
  if (node.type === 'blockquote') {
    return '<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>' + inner + '</w:p>';
  }
  return inner;
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
  if (!body.content_json) return J({ error: 'content_json pflicht' }, 400);

  const titel = String(body.titel || 'Dokument');
  const docContent = renderNode(body.content_json);
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<?mso-application progid="Word.Document"?>\n'
    + '<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">\n'
    + '<w:body>' + docContent + '</w:body></w:wordDocument>';
  const bytes = new TextEncoder().encode(xml);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const base64 = btoa(bin);

  return J({
    success: true,
    filename: titel.replace(/[^a-zA-Z0-9_-]/g, '_') + '.xml',
    content_base64: base64,
    content_type: 'application/vnd.ms-word'
  });
});
