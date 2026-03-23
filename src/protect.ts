import type { ProtectedRegion } from './types';

export function findProtectedRegions(text: string): ProtectedRegion[] {
  const regions: ProtectedRegion[] = [];
  let m: RegExpExecArray | null;

  // 1. Triple-backtick fenced code blocks
  const fenceRe = /```[\s\S]*?```/g;
  while ((m = fenceRe.exec(text)) !== null) {
    regions.push({ start: m.index, end: m.index + m[0].length, reason: 'code-block' });
  }

  // 2. Inline code (not already inside a fence)
  const inlineRe = /`[^`\n]+`/g;
  while ((m = inlineRe.exec(text)) !== null) {
    if (!isProtected(m.index, regions)) {
      regions.push({ start: m.index, end: m.index + m[0].length, reason: 'inline-code' });
    }
  }

  // 3. Template variables: {{var}}, {var}, ${var}, %(var)s
  const templateRe = /\{\{[^}]+\}\}|\{[^}]+\}|\$\{[^}]+\}|%\([^)]+\)s/g;
  while ((m = templateRe.exec(text)) !== null) {
    if (!isProtected(m.index, regions)) {
      regions.push({ start: m.index, end: m.index + m[0].length, reason: 'template-var' });
    }
  }

  // 4. URLs
  const urlRe = /https?:\/\/[^\s]+/g;
  while ((m = urlRe.exec(text)) !== null) {
    if (!isProtected(m.index, regions)) {
      regions.push({ start: m.index, end: m.index + m[0].length, reason: 'url' });
    }
  }

  // 5. Quoted strings (single-line only)
  const quotedRe = /"[^"\n]*"|'[^'\n]*'/g;
  while ((m = quotedRe.exec(text)) !== null) {
    if (!isProtected(m.index, regions)) {
      regions.push({ start: m.index, end: m.index + m[0].length, reason: 'quoted-string' });
    }
  }

  // 6. HTML tags
  const htmlRe = /<[a-zA-Z][^>]*>/g;
  while ((m = htmlRe.exec(text)) !== null) {
    if (!isProtected(m.index, regions)) {
      regions.push({ start: m.index, end: m.index + m[0].length, reason: 'html-tag' });
    }
  }

  // 7. Negation context: sentences containing negation words (includes smart quotes)
  const negationRe = /\b(not|never|don['\u2019]t|must not|do not|cannot|shouldn['\u2019]t|won['\u2019]t|no)\b/gi;
  const sentenceRe = /[^.!?\n]+[.!?\n]?/g;
  let sentMatch: RegExpExecArray | null;
  while ((sentMatch = sentenceRe.exec(text)) !== null) {
    const start = sentMatch.index;
    const end = start + sentMatch[0].length;
    negationRe.lastIndex = 0;
    if (negationRe.test(sentMatch[0])) {
      if (!isProtected(start, regions)) {
        regions.push({ start, end, reason: 'negation-context' });
      }
    }
  }

  return regions;
}

export function isProtected(offset: number, regions: ProtectedRegion[]): boolean {
  for (const r of regions) {
    if (offset >= r.start && offset < r.end) return true;
  }
  return false;
}

export function applyWithProtection(
  text: string,
  regions: ProtectedRegion[],
  replacer: (segment: string, offset: number) => string,
): string {
  if (regions.length === 0) return replacer(text, 0);

  const sorted = [...regions].sort((a, b) => a.start - b.start);
  const merged: ProtectedRegion[] = [];
  for (const r of sorted) {
    if (merged.length > 0 && r.start < merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  let result = '';
  let pos = 0;
  for (const region of merged) {
    if (pos < region.start) {
      result += replacer(text.slice(pos, region.start), pos);
    }
    result += text.slice(region.start, region.end);
    pos = region.end;
  }
  if (pos < text.length) {
    result += replacer(text.slice(pos), pos);
  }
  return result;
}
