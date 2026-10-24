// Shorten failing command output before Claude reads it: every line it reads costs tokens,
// and the noise (colors, runtime-internal stack frames, repeats) never helps a fix.
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const NOISE = [
  /^\s*at .*[(\s](node:[\w/]+|internal\/[\w/]+|[^()]*node_modules[\\/][^()]*):\d+:\d+\)?$/, // stack frames inside Node or dependencies
  /^ℹ (suites|cancelled|skipped|todo|duration_ms)\b/ // node:test counters that carry no failure detail
];

export function trimFailure(text, { maxLines = 40, maxChars = 2000 } = {}) {
  const lines = [];
  let dropped = 0;
  for (const raw of String(text ?? '').replace(ANSI, '').split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (NOISE.some(re => re.test(line)) || (line === '' && lines.at(-1) === '') || line === lines.at(-1) && line !== '') { dropped++; continue; }
    lines.push(line);
  }
  let kept = lines.slice(-maxLines);
  dropped += lines.length - kept.length;
  while (kept.join('\n').length > maxChars && kept.length > 1) { kept = kept.slice(1); dropped++; }
  const body = kept.join('\n').trim();
  return dropped ? `(${dropped} noise or earlier lines trimmed)\n${body}` : body;
}
