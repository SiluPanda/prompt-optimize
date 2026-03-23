import type { SafetyLevel, ProtectedRegion } from '../types';
import { applyWithProtection } from '../protect';

export const id = 'trailing-spaces';
export const name = 'Trailing Spaces';
export const safetyLevel: SafetyLevel = 'safe';

export function run(text: string, regions: ProtectedRegion[]): string {
  return applyWithProtection(text, regions, (segment) => {
    return segment.replace(/[ \t]+$/gm, '');
  });
}
