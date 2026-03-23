import type { SafetyLevel, ProtectedRegion } from '../types';
import { applyWithProtection } from '../protect';

export const id = 'filler-words';
export const name = 'Filler Words';
export const safetyLevel: SafetyLevel = 'moderate';

const FILLERS = [
  'please ', 'kindly ', 'just ', 'simply ', 'basically ',
  'actually ', 'certainly ', 'of course ', 'obviously ', 'you know ',
];

export function run(text: string, regions: ProtectedRegion[]): string {
  return applyWithProtection(text, regions, (segment) => {
    let s = segment;
    for (const filler of FILLERS) {
      const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trimEnd();
      const re = new RegExp(`\\b${escaped}\\s*`, 'gi');
      s = s.replace(re, '');
    }
    s = s.replace(/([^\n]) {2,}/g, '$1 ');
    return s;
  });
}
