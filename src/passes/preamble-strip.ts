import type { SafetyLevel, ProtectedRegion } from '../types';
import { applyWithProtection } from '../protect';

export const id = 'preamble-strip';
export const name = 'Preamble Strip';
export const safetyLevel: SafetyLevel = 'moderate';

const PREAMBLES = [
  /^Certainly!\s+Here\s+is[^.!?]*[.!?]?\s*/i,
  /^Certainly!\s+I['\u2019]ll[^.!?]*[.!?]?\s*/i,
  /^Certainly!\s*/i,
  /^Of\s+course!\s+I['\u2019]ll[^.!?]*[.!?]?\s*/i,
  /^Of\s+course!\s*/i,
  /^Sure!\s+Let\s+me[^.!?]*[.!?]?\s*/i,
  /^Sure!\s*/i,
  /^I['\u2019]d\s+be\s+happy\s+to[^.!?]*[.!?]?\s*/i,
  /^You\s+are\s+a\s+helpful\s+assistant\.\s*/i,
  /^The\s+following\s+is\s+a[^.!?]*[.!?]?\s*/i,
];

export function run(text: string, regions: ProtectedRegion[]): string {
  return applyWithProtection(text, regions, (segment) => {
    let s = segment;
    for (const pattern of PREAMBLES) {
      s = s.replace(pattern, '');
    }
    return s;
  });
}
