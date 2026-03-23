import type { SafetyLevel, ProtectedRegion } from '../types';
import { applyWithProtection } from '../protect';

export const id = 'verbose-phrases';
export const name = 'Verbose Phrases';
export const safetyLevel: SafetyLevel = 'moderate';

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/in order to/gi, 'to'],
  [/due to the fact that/gi, 'because'],
  [/at this point in time/gi, 'now'],
  [/in the event that/gi, 'if'],
  [/for the purpose of/gi, 'to'],
  [/with regard to/gi, 'about'],
  [/in the process of/gi, 'while'],
  [/make sure to/gi, 'ensure'],
  [/it is important to note that/gi, ''],
  [/it should be noted that/gi, ''],
  [/please note that/gi, ''],
  [/as previously mentioned/gi, ''],
  [/as stated above/gi, ''],
  [/needless to say/gi, ''],
  [/at the end of the day/gi, ''],
];

export function run(text: string, regions: ProtectedRegion[]): string {
  return applyWithProtection(text, regions, (segment) => {
    let s = segment;
    for (const [pattern, replacement] of REPLACEMENTS) {
      s = s.replace(pattern, replacement);
    }
    s = s.replace(/([^\n]) {2,}/g, '$1 ');
    s = s.replace(/^[ \t]+([^ \t])/gm, '$1');
    return s;
  });
}
