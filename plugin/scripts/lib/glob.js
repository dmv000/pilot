// Minimal glob shared by the pilot.js libraries. Same semantics as hooks/lib/project.js.
/** Minimal glob: **, *, ?, {a,b}. Matches against a POSIX relative path. */
export function globToRegExp(glob) {
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // "**/" matches zero or more directories; "**" at the end matches anything.
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 3; continue; }
        re += '.*'; i += 2; continue;
      }
      re += '[^/]*'; i += 1; continue;
    }
    if (c === '?') { re += '[^/]'; i += 1; continue; }
    if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end > i) {
        const alts = glob.slice(i + 1, end).split(',').map(a => a.replace(/[.+^$()|[\]\\]/g, '\\$&'));
        re += '(?:' + alts.join('|') + ')';
        i = end + 1;
        continue;
      }
    }
    re += /[.+^$()|[\]\\]/.test(c) ? '\\' + c : c;
    i += 1;
  }
  return new RegExp('^' + re + '$');
}
