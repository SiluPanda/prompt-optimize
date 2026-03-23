import type { SafetyLevel, ProtectedRegion } from '../types';
import { applyWithProtection } from '../protect';

export const id = 'comment-strip';
export const name = 'Comment Strip';
export const safetyLevel: SafetyLevel = 'safe';

export function run(text: string, regions: ProtectedRegion[]): string {
  return applyWithProtection(text, regions, (segment) => {
    let s = segment;
    s = s.replace(/<!--[\s\S]*?-->/g, '');
    s = s.replace(/^[ \t]*\/\/.*$/gm, '');
    s = s.replace(/^[ \t]*#.*$/gm, '');
    s = s.replace(/\n{3,}/g, '\n\n');
    return s;
  });
}
