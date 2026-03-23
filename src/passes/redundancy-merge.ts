import type { SafetyLevel, ProtectedRegion } from '../types';
import { isProtected } from '../protect';

export const id = 'redundancy-merge';
export const name = 'Redundancy Merge';
export const safetyLevel: SafetyLevel = 'moderate';

function tokenize(sentence: string): Set<string> {
  return new Set(
    sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function splitSentences(text: string): Array<{ sentence: string; start: number; end: number }> {
  const result: Array<{ sentence: string; start: number; end: number }> = [];
  const re = /[^.!?\n]+[.!?\n]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const trimmed = m[0].trim();
    if (trimmed.length > 0) {
      result.push({ sentence: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  return result;
}

export function run(text: string, regions: ProtectedRegion[]): string {
  const sentences = splitSentences(text);
  if (sentences.length < 2) return text;

  const redundant = new Set<number>();
  const tokenSets = sentences.map((s) => tokenize(s.sentence));

  for (let i = 0; i < sentences.length; i++) {
    if (redundant.has(i)) continue;
    if (isProtected(sentences[i].start, regions)) continue;
    for (let j = i + 1; j < sentences.length; j++) {
      if (redundant.has(j)) continue;
      if (isProtected(sentences[j].start, regions)) continue;
      const sim = jaccardSimilarity(tokenSets[i], tokenSets[j]);
      if (sim > 0.85) {
        redundant.add(j);
      }
    }
  }

  if (redundant.size === 0) return text;

  let result = '';
  for (let i = 0; i < sentences.length; i++) {
    if (!redundant.has(i)) {
      result += sentences[i].sentence;
    }
  }
  return result;
}
