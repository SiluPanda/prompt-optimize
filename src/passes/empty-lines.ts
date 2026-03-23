import type { SafetyLevel, ProtectedRegion } from '../types';
import { applyWithProtection } from '../protect';

export const id = 'empty-lines';
export const name = 'Empty Lines';
export const safetyLevel: SafetyLevel = 'safe';

export function run(text: string, regions: ProtectedRegion[]): string {
  return applyWithProtection(text, regions, (segment) => {
    // Collapse 4+ consecutive empty lines to 2 empty lines
    let s = segment.replace(/\n{5,}/g, '\n\n\n');
    s = s.replace(/^\n+/, '');
    s = s.replace(/\n+$/, '');
    return s;
  });
}
