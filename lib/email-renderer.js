/**
 * PROVA — email-renderer.js (MEGA²⁷.5 Block 2)
 *
 * Mustache-light Template-Rendering + XSS-Escape + Plain-Text-Auto-Generation.
 * Keine externen Dependencies (keine handlebars/mustache npm-Pakete).
 *
 * Public API:
 *   render(template, vars) → string  (Mustache-Replacement)
 *   renderHtml(template, vars) → string  (mit XSS-Escape pro Variable)
 *   stripHtml(html) → string  (HTML → Plain-Text-Fallback)
 *   loadTemplate(name) → string  (liest aus lib/email-templates/{name}.html)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TEMPLATES_DIR = path.join(__dirname, 'email-templates');

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Mustache-light Replacement:
 *   {{VAR}} → value (escaped)
 *   {{{VAR}}} → value (raw, NICHT escaped)
 *   {{#KEY}}...{{/KEY}} → block-render wenn truthy
 *   {{^KEY}}...{{/KEY}} → block-render wenn falsy
 */
function render(template, vars, options) {
  if (typeof template !== 'string') return '';
  vars = vars || {};
  options = options || {};
  const escapeFn = options.escape || ((s) => String(s === null || s === undefined ? '' : s));

  let result = template;

  // Inverted-Sections: {{^KEY}}...{{/KEY}}
  result = result.replace(/\{\{\^([A-Z_][A-Z0-9_]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => {
    const v = vars[key];
    return (!v || (Array.isArray(v) && v.length === 0)) ? body : '';
  });

  // Sections: {{#KEY}}...{{/KEY}}
  result = result.replace(/\{\{#([A-Z_][A-Z0-9_]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => {
    const v = vars[key];
    if (!v) return '';
    if (Array.isArray(v)) return v.map(item => render(body, Object.assign({}, vars, item), options)).join('');
    return body;
  });

  // Triple-mustache (raw, nicht escaped): {{{KEY}}}
  result = result.replace(/\{\{\{([A-Z_][A-Z0-9_]*)\}\}\}/g, (_, key) => {
    const v = vars[key];
    return v === null || v === undefined ? '' : String(v);
  });

  // Standard-mustache (escaped): {{KEY}}
  result = result.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (_, key) => {
    const v = vars[key];
    return escapeFn(v === null || v === undefined ? '' : v);
  });

  return result;
}

function renderHtml(template, vars) {
  return render(template, vars, { escape: escapeHtml });
}

/**
 * HTML → Plain-Text (basic).
 */
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function loadTemplate(name) {
  const p = path.join(TEMPLATES_DIR, name);
  return fs.readFileSync(p, 'utf8');
}

/**
 * Convenience: renderTemplate(name, vars) → { html, text }
 */
function renderTemplate(name, vars) {
  const html = renderHtml(loadTemplate(name + '.html'), vars);
  let text;
  try {
    text = render(loadTemplate(name + '.txt'), vars);
  } catch (_) {
    text = stripHtml(html);
  }
  return { html, text };
}

module.exports = {
  render,
  renderHtml,
  stripHtml,
  loadTemplate,
  renderTemplate,
  escapeHtml,
  TEMPLATES_DIR
};
