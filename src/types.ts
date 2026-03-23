export type SafetyLevel = 'safe' | 'moderate' | 'aggressive';

export interface PassResult {
  id: string;
  name: string;
  safetyLevel: SafetyLevel;
  applied: boolean;
  skipReason?: string;
  tokensSaved: number;
  changeCount: number;
  durationMs: number;
}

export interface TokenSavings {
  charactersBefore: number;
  charactersAfter: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  percentage: number;
}

export interface OptimizationReport {
  timestamp: string;
  durationMs: number;
  safetyLevel: SafetyLevel;
  savings: TokenSavings;
  passes: PassResult[];
}

export interface OptimizationResult {
  optimized: string;
  original: string;
  report: OptimizationReport;
}

export interface OptimizeOptions {
  safety?: SafetyLevel;
  tokenCounter?: (text: string) => number;
}

export interface Optimizer {
  optimize(input: string): OptimizationResult;
  analyze(input: string): OptimizationReport;
}

export interface ProtectedRegion {
  start: number;
  end: number;
  reason: string;
}

export interface Pass {
  id: string;
  name: string;
  safetyLevel: SafetyLevel;
  run(text: string, regions: ProtectedRegion[]): string;
}
