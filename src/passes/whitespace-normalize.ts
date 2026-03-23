import type { SafetyLevel, ProtectedRegion } from '../types';
import { applyWithProtection } from '../protect';

export const id = 'whitespace-normalize';
export const name = 'Whitespace Normalize';
export const safetyLevel: SafetyLevel = 'safe';

export function run(text: string, regions: ProtectedRegion[]): string {
  return applyWithProtection(text, regions, (segment) => {
    let s = segment.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    s = s.replace(/[ \t]+$/gm, '');
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.replace(/([^\n]) {2,}/g, '$1 ');
    return s;
  });
}
