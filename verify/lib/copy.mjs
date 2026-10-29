// Forbidden product copy: engineering provenance must not be painted on the product surface.
//
// Patterns live in verify/thresholds.json (one place), never inline in a script. Matching is
// whitespace-normalised and case-insensitive, because innerText breaks on layout ("Backdrop\n
// asset pending") and RTL/LTR mixing can reorder neighbours. Only pattern ids are returned:
// a failure names what leaked, not the page's text.

/** Collapse whitespace (including ZWNJ/ZWJ and non-breaking spaces) and lowercase. */
export function normalizeText(s) {
  return String(s ?? '')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[\s\u00a0\u202f]+/g, ' ')
    .trim()
    .toLowerCase();
}

const isWordChar = (c) => /[a-z0-9_]/.test(c);

function containsWholeWord(hay, needle) {
  let i = hay.indexOf(needle);
  while (i !== -1) {
    const before = i > 0 ? hay[i - 1] : '';
    const after = hay[i + needle.length] ?? '';
    if (!isWordChar(before) && !isWordChar(after)) return true;
    i = hay.indexOf(needle, i + 1);
  }
  return false;
}

/**
 * Returns the sorted, de-duplicated ids of every pattern that matched `text`.
 * `cfg` is `thresholds.copy`: { patterns: [{ id, match: string|string[], wholeWord? }] }.
 */
export function findForbiddenCopy(text, cfg) {
  const hay = normalizeText(text);
  const ids = new Set();
  for (const p of cfg?.patterns ?? []) {
    const needles = Array.isArray(p.match) ? p.match : [p.match];
    const hit = needles.some((n) => {
      const needle = normalizeText(n);
      if (!needle) return false;
      return p.wholeWord ? containsWholeWord(hay, needle) : hay.includes(needle);
    });
    if (hit) ids.add(p.id);
  }
  return [...ids].sort();
}
