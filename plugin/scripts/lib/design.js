// Design system checks: token structure, WCAG contrast of declared pairs, DESIGN.md sections,
// and hard-coded colors in UI source. Used by `pilot.js design-check` and by `pilot.js check` / pilot-check CI.
import path from 'node:path';
import { read, walk } from './fsutil.js';

const LEAF_TYPES = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'number', 'duration', 'shadow', 'cubicBezier', 'border', 'typography', 'gradient', 'strokeStyle', 'transition']);
const REQUIRED_SECTIONS = ['Principles', 'Layout', 'Typography', 'Color', 'Components', 'Accessibility', 'How to verify a UI change'];
const UI_FILE = /\.(tsx|jsx|vue|svelte|css|scss|sass|less|html)$/;

/** Flatten tokens into [path, leaf] pairs; skips $-prefixed metadata keys. */
export function flattenTokens(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k.startsWith('$')) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && '$value' in v) out.push([p, v]);
    else if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenTokens(v, p));
    else out.push([p, { invalid: v }]);
  }
  return out;
}

export function parseColor(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = value.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

const luminance = ([r, g, b]) => {
  const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** WCAG 2.x contrast ratio between two colors, 1..21. */
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function checkDesign(dir) {
  const errors = [];
  const warnings = [];
  const tokensText = read(path.join(dir, 'docs/design/tokens.json'));
  const designMd = read(path.join(dir, 'docs/design/DESIGN.md'));
  if (tokensText === null && designMd === null) return { id: 'design', errors, warnings };

  if (tokensText === null) errors.push('docs/design/DESIGN.md exists but docs/design/tokens.json does not. Values belong in tokens.json.');
  let tokens = null;
  if (tokensText !== null) {
    try { tokens = JSON.parse(tokensText); } catch (e) { errors.push(`docs/design/tokens.json is not valid JSON: ${e.message}`); }
  }
  if (tokens) {
    const leaves = flattenTokens(tokens);
    const byPath = Object.fromEntries(leaves);
    for (const [p, leaf] of leaves) {
      if ('invalid' in leaf) { errors.push(`token ${p} has no $value (every leaf needs { "$type", "$value" }).`); continue; }
      if (!leaf.$type) errors.push(`token ${p} has no $type.`);
      else if (!LEAF_TYPES.has(leaf.$type)) warnings.push(`token ${p} has an unusual $type "${leaf.$type}".`);
      if (leaf.$type === 'color' && !parseColor(leaf.$value)) errors.push(`token ${p} is a color but "${leaf.$value}" is not #rgb, #rrggbb or rgb().`);
    }
    const pairs = tokens.$pilot?.contrastPairs ?? [];
    if (!pairs.length) warnings.push('tokens.json lists no $pilot.contrastPairs, so text contrast is not checked.');
    for (const { fg, bg, min = 4.5 } of pairs) {
      const a = parseColor(byPath[fg]?.$value);
      const b = parseColor(byPath[bg]?.$value);
      if (!a || !b) { errors.push(`contrast pair ${fg} on ${bg}: ${!a ? fg : bg} is not a defined color token.`); continue; }
      const ratio = contrast(a, b);
      if (ratio + 1e-9 < min) errors.push(`contrast ${fg} on ${bg} is ${ratio.toFixed(2)}:1; it must be at least ${min}:1 (WCAG 2.2 AA).`);
    }
  }

  if (designMd === null) errors.push('docs/design/tokens.json exists but docs/design/DESIGN.md does not. Rules belong in DESIGN.md.');
  else {
    for (const s of REQUIRED_SECTIONS) if (!new RegExp(`^##\\s+${s.replace(/ /g, '\\s+')}`, 'mi').test(designMd)) errors.push(`DESIGN.md is missing the section "## ${s}".`);
  }

  // Hard-coded colors in UI source files: a warning, because some are legitimate (for example SVG assets).
  const hits = [];
  for (const f of walk(dir).filter(f => UI_FILE.test(f) && !f.startsWith('docs/'))) {
    const text = read(path.join(dir, f)) ?? '';
    // "(#12)" is an issue reference, not a color.
    const m = text.match(/(?<![(\w&])#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
    if (m) hits.push(`${f} (${[...new Set(m)].slice(0, 3).join(', ')})`);
  }
  if (hits.length) warnings.push(`hard-coded colors in UI files; use tokens instead: ${hits.slice(0, 8).join('; ')}${hits.length > 8 ? '; …' : ''}`);
  return { id: 'design', errors, warnings };
}
