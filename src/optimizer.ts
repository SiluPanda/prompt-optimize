import type { OptimizeOptions, OptimizationResult, OptimizationReport, Optimizer, Pass, PassResult, SafetyLevel } from './types';
import { findProtectedRegions } from './protect';
import * as trailingSpaces from './passes/trailing-spaces';
import * as emptyLines from './passes/empty-lines';
import * as whitespaceNormalize from './passes/whitespace-normalize';
import * as commentStrip from './passes/comment-strip';
import * as fillerWords from './passes/filler-words';
import * as verbosePhrases from './passes/verbose-phrases';
import * as preambleStrip from './passes/preamble-strip';
import * as redundancyMerge from './passes/redundancy-merge';

const ALL_PASSES: Pass[] = [
  trailingSpaces,
  emptyLines,
  whitespaceNormalize,
  commentStrip,
  fillerWords,
  verbosePhrases,
  preambleStrip,
  redundancyMerge,
];

const SAFETY_FILTER: Record<SafetyLevel, SafetyLevel[]> = {
  safe: ['safe'],
  moderate: ['safe', 'moderate'],
  aggressive: ['safe', 'moderate', 'aggressive'],
};

function defaultTokenCounter(text: string): number {
  return Math.ceil(text.length / 4);
}

export function optimize(input: string, options?: OptimizeOptions): OptimizationResult {
  const safety: SafetyLevel = options?.safety ?? 'moderate';
  const counter = options?.tokenCounter ?? defaultTokenCounter;
  const start = Date.now();
  const original = input;
  const regions = findProtectedRegions(input);
  const passResults: PassResult[] = [];
  let current = input;

  for (const pass of ALL_PASSES) {
    if (!SAFETY_FILTER[safety].includes(pass.safetyLevel)) {
      passResults.push({
        id: pass.id,
        name: pass.name,
        safetyLevel: pass.safetyLevel,
        applied: false,
        skipReason: 'safety-level',
        tokensSaved: 0,
        changeCount: 0,
        durationMs: 0,
      });
      continue;
    }
    const t = Date.now();
    const after = pass.run(current, regions);
    const saved = counter(current) - counter(after);
    passResults.push({
      id: pass.id,
      name: pass.name,
      safetyLevel: pass.safetyLevel,
      applied: after !== current,
      tokensSaved: Math.max(0, saved),
      changeCount: 0,
      durationMs: Date.now() - t,
    });
    current = after;
  }

  const tokensBefore = counter(original);
  const tokensAfter = counter(current);
  const savings = {
    charactersBefore: original.length,
    charactersAfter: current.length,
    tokensBefore,
    tokensAfter,
    tokensSaved: Math.max(0, tokensBefore - tokensAfter),
    percentage: parseFloat(((1 - tokensAfter / Math.max(1, tokensBefore)) * 100).toFixed(1)),
  };

  return {
    optimized: current,
    original,
    report: {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      safetyLevel: safety,
      savings,
      passes: passResults,
    },
  };
}

export function analyze(input: string, options?: OptimizeOptions): OptimizationReport {
  return optimize(input, options).report;
}

export function createOptimizer(options?: OptimizeOptions): Optimizer {
  return {
    optimize: (input: string) => optimize(input, options),
    analyze: (input: string) => analyze(input, options),
  };
}
