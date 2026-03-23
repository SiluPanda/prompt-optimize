import { describe, it, expect } from 'vitest';
import { optimize, analyze, createOptimizer } from '../optimizer';

describe('filler-words pass', () => {
  it('removes "please" from a prompt', () => {
    const result = optimize('Please provide the answer.', { safety: 'moderate' });
    expect(result.optimized.toLowerCase()).not.toContain('please');
    expect(result.optimized).toContain('provide the answer');
  });

  it('removes "just" from a prompt', () => {
    const result = optimize('Just provide the answer.', { safety: 'moderate' });
    expect(result.optimized.toLowerCase()).not.toContain('just ');
    expect(result.optimized).toContain('provide the answer');
  });

  it('removes multiple filler words', () => {
    const result = optimize('Please just provide the answer.', { safety: 'moderate' });
    expect(result.optimized.toLowerCase()).not.toMatch(/\bplease\b/);
    expect(result.optimized.toLowerCase()).not.toMatch(/\bjust\b/);
    expect(result.optimized).toContain('provide the answer');
  });

  it('does NOT remove fillers when safety=safe', () => {
    const result = optimize('Please provide the answer.', { safety: 'safe' });
    expect(result.optimized.toLowerCase()).toContain('please');
  });
});

describe('verbose-phrases pass', () => {
  it('replaces "in order to" with "to"', () => {
    const result = optimize('Use this in order to complete the task.', { safety: 'moderate' });
    expect(result.optimized).not.toContain('in order to');
    expect(result.optimized).toContain('to complete the task');
  });

  it('replaces "due to the fact that" with "because"', () => {
    const result = optimize('This failed due to the fact that the input was empty.', { safety: 'moderate' });
    expect(result.optimized).not.toContain('due to the fact that');
    expect(result.optimized).toContain('because');
  });

  it('strips "it is important to note that"', () => {
    const result = optimize('It is important to note that you should save your work.', { safety: 'moderate' });
    expect(result.optimized).not.toContain('It is important to note that');
    expect(result.optimized).toContain('you should save your work');
  });
});

describe('safety level gating', () => {
  it('safe level skips all moderate passes', () => {
    const result = optimize('Please just use this in order to complete the task.', { safety: 'safe' });
    const moderatePasses = result.report.passes.filter((p) => p.safetyLevel === 'moderate');
    for (const p of moderatePasses) {
      expect(p.applied).toBe(false);
      expect(p.skipReason).toBe('safety-level');
    }
  });

  it('moderate level applies both safe and moderate passes', () => {
    const result = optimize('Please just do this.\n\n\n\nAnd that.', { safety: 'moderate' });
    const skipped = result.report.passes.filter((p) => p.skipReason === 'safety-level');
    expect(skipped.length).toBe(0);
  });
});

describe('protected regions - template variables', () => {
  it('does not touch {{variable}} placeholders', () => {
    const input = 'Please summarize {{user_content}} in just a few words.';
    const result = optimize(input, { safety: 'moderate' });
    expect(result.optimized).toContain('{{user_content}}');
  });

  it('does not touch ${variable} placeholders', () => {
    const input = 'Please process ${input_data} and return the result.';
    const result = optimize(input, { safety: 'moderate' });
    expect(result.optimized).toContain('${input_data}');
  });
});

describe('protected regions - code blocks', () => {
  it('preserves triple-backtick code blocks unchanged', () => {
    const code = '```python\n# please just do this\nprint("hello")\n```';
    const input = `Run the following code:\n${code}`;
    const result = optimize(input, { safety: 'moderate' });
    expect(result.optimized).toContain(code);
  });

  it('preserves inline code unchanged', () => {
    const input = 'Use the command `please just run` to execute it.';
    const result = optimize(input, { safety: 'moderate' });
    expect(result.optimized).toContain('`please just run`');
  });
});

describe('OptimizationResult shape', () => {
  it('has optimized, original, and report fields', () => {
    const result = optimize('Please just do this in order to complete the task.');
    expect(typeof result.optimized).toBe('string');
    expect(typeof result.original).toBe('string');
    expect(result.report).toBeDefined();
  });

  it('report has required fields', () => {
    const { report } = optimize('Some text.');
    expect(typeof report.timestamp).toBe('string');
    expect(typeof report.durationMs).toBe('number');
    expect(['safe', 'moderate', 'aggressive']).toContain(report.safetyLevel);
    expect(Array.isArray(report.passes)).toBe(true);
    expect(report.savings).toBeDefined();
  });

  it('tokensSaved >= 0', () => {
    const result = optimize('Please just provide the answer in order to complete the task.');
    expect(result.report.savings.tokensSaved).toBeGreaterThanOrEqual(0);
  });

  it('percentage is in [0, 100]', () => {
    const result = optimize('Please just provide the answer in order to complete the task.');
    expect(result.report.savings.percentage).toBeGreaterThanOrEqual(0);
    expect(result.report.savings.percentage).toBeLessThanOrEqual(100);
  });
});

describe('analyze()', () => {
  it('returns the same report as optimize().report', () => {
    const report = analyze('Please just provide the answer in order to complete the task.', { safety: 'moderate' });
    expect(report.passes.length).toBeGreaterThan(0);
    expect(typeof report.savings.tokensSaved).toBe('number');
  });
});

describe('createOptimizer()', () => {
  it('returns an Optimizer with optimize and analyze methods', () => {
    const optimizer = createOptimizer({ safety: 'safe' });
    expect(typeof optimizer.optimize).toBe('function');
    expect(typeof optimizer.analyze).toBe('function');
  });

  it('optimizer.optimize uses the configured safety level', () => {
    const optimizer = createOptimizer({ safety: 'safe' });
    const result = optimizer.optimize('Please just do this in order to complete.');
    const fillerPass = result.report.passes.find((p) => p.id === 'filler-words');
    expect(fillerPass?.applied).toBe(false);
    expect(fillerPass?.skipReason).toBe('safety-level');
  });
});

describe('whitespace-normalize pass', () => {
  it('collapses 3+ blank lines to 2', () => {
    const result = optimize('Line one.\n\n\n\nLine two.', { safety: 'safe' });
    expect(result.optimized).not.toMatch(/\n{4,}/);
  });

  it('removes trailing whitespace', () => {
    const result = optimize('Line one.   \nLine two.  ', { safety: 'safe' });
    expect(result.optimized).not.toMatch(/[ \t]+\n/);
  });
});

describe('custom tokenCounter option', () => {
  it('uses the provided token counter', () => {
    let callCount = 0;
    const counter = (t: string) => { callCount++; return t.length; };
    optimize('Please provide the answer.', { safety: 'moderate', tokenCounter: counter });
    expect(callCount).toBeGreaterThan(0);
  });
});
