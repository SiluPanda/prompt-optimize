# prompt-optimize

Deterministic prompt compression for LLM applications. Reduce token count and API costs with zero network calls, zero model inference, and zero runtime dependencies.

[![npm version](https://img.shields.io/npm/v/prompt-optimize.svg)](https://www.npmjs.com/package/prompt-optimize)
[![npm downloads](https://img.shields.io/npm/dt/prompt-optimize.svg)](https://www.npmjs.com/package/prompt-optimize)
[![license](https://img.shields.io/npm/l/prompt-optimize.svg)](https://github.com/SiluPanda/prompt-optimize/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/prompt-optimize.svg)](https://nodejs.org)

---

## Description

`prompt-optimize` applies a configurable pipeline of rule-based optimization passes to prompt text, producing a shorter prompt that conveys the same instructions to the model. Every transformation is deterministic: the same input always produces the same output. No API keys, no Python runtime, no external services.

The package targets a concrete problem: unnecessary tokens in LLM prompts cost real money at scale. A 500-token system prompt called 1 million times per day at $3.00/MTok costs $1.50/day. If 30% of those tokens are filler words, verbose phrasing, and redundant whitespace, that is over $160/year in waste from a single prompt.

`prompt-optimize` ships eight optimization passes organized into two safety tiers (`safe` and `moderate`), a protected-region system that ensures code blocks, template variables, URLs, quoted strings, and negation contexts are never modified, and a detailed report showing per-pass token savings.

---

## Installation

```bash
npm install prompt-optimize
```

Requires Node.js >= 18.

---

## Quick Start

```typescript
import { optimize } from 'prompt-optimize';

const result = optimize(
  'Please just provide the answer in order to complete the task.'
);

console.log(result.optimized);
// "Provide the answer to complete the task."

console.log(result.report.savings);
// {
//   charactersBefore: 61,
//   charactersAfter: 41,
//   tokensBefore: 16,
//   tokensAfter: 11,
//   tokensSaved: 5,
//   percentage: 31.3
// }
```

---

## Features

- **Eight optimization passes** covering whitespace normalization, comment stripping, filler word removal, verbose phrase replacement, preamble stripping, and redundancy merging.
- **Three safety levels** (`safe`, `moderate`, `aggressive`) controlling which passes run, with `moderate` as the default.
- **Protected regions** automatically detected and preserved: fenced code blocks, inline code, template variables (`{{var}}`, `{var}`, `${var}`, `%(var)s`), URLs, quoted strings, HTML tags, and sentences containing negation words.
- **Detailed optimization reports** with per-pass breakdown, token savings, percentage reduction, and timing.
- **Custom token counter** support for plugging in accurate tokenizers (e.g., tiktoken, gpt-tokenizer).
- **Reusable optimizer instances** via `createOptimizer()` for applying the same configuration across multiple prompts.
- **Zero runtime dependencies.** Pure TypeScript, compiles to CommonJS.
- **Full TypeScript support** with exported types and declaration maps.

---

## API Reference

### `optimize(input, options?)`

Runs all applicable optimization passes on `input` and returns the optimized string plus a detailed report.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `input` | `string` | The prompt text to optimize. |
| `options` | `OptimizeOptions` | Optional configuration (see [Configuration](#configuration)). |

**Returns:** `OptimizationResult`

```typescript
import { optimize } from 'prompt-optimize';

const result = optimize('Please kindly summarize the document in order to save time.', {
  safety: 'moderate',
});

console.log(result.optimized);  // "Summarize the document to save time."
console.log(result.original);   // "Please kindly summarize the document in order to save time."
console.log(result.report);     // Full OptimizationReport
```

---

### `analyze(input, options?)`

Runs the same pipeline as `optimize()` but returns only the `OptimizationReport`. Use this to preview potential savings without needing the optimized text wrapper.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `input` | `string` | The prompt text to analyze. |
| `options` | `OptimizeOptions` | Optional configuration. |

**Returns:** `OptimizationReport`

```typescript
import { analyze } from 'prompt-optimize';

const report = analyze('Please just provide the answer in order to complete the task.');

console.log(report.savings.tokensSaved);  // 5
console.log(report.savings.percentage);   // 31.3
console.log(report.passes.filter(p => p.applied).map(p => p.name));
// ['Trailing Spaces', 'Whitespace Normalize', 'Filler Words', 'Verbose Phrases', ...]
```

---

### `createOptimizer(options)`

Creates a reusable optimizer instance bound to a fixed set of options. Useful when optimizing multiple prompts with the same configuration.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `options` | `OptimizeOptions` | Configuration to bind to the optimizer instance. |

**Returns:** `Optimizer`

```typescript
import { createOptimizer } from 'prompt-optimize';

const optimizer = createOptimizer({ safety: 'safe' });

const result1 = optimizer.optimize('First prompt with   extra   spaces.');
const result2 = optimizer.optimize('Second prompt with   extra   spaces.');
const report  = optimizer.analyze('Third prompt for analysis only.');
```

---

### Exported Types

#### `SafetyLevel`

```typescript
type SafetyLevel = 'safe' | 'moderate' | 'aggressive';
```

Controls which optimization passes are applied. Each level includes all passes from lower levels.

---

#### `OptimizeOptions`

```typescript
interface OptimizeOptions {
  safety?: SafetyLevel;
  tokenCounter?: (text: string) => number;
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `safety` | `SafetyLevel` | `'moderate'` | Controls which passes run. |
| `tokenCounter` | `(text: string) => number` | `Math.ceil(text.length / 4)` | Custom function for counting tokens. |

---

#### `OptimizationResult`

```typescript
interface OptimizationResult {
  optimized: string;
  original: string;
  report: OptimizationReport;
}
```

| Field | Type | Description |
|---|---|---|
| `optimized` | `string` | The compressed prompt text. |
| `original` | `string` | The original, unmodified input. |
| `report` | `OptimizationReport` | Full report with savings and per-pass breakdown. |

---

#### `OptimizationReport`

```typescript
interface OptimizationReport {
  timestamp: string;
  durationMs: number;
  safetyLevel: SafetyLevel;
  savings: TokenSavings;
  passes: PassResult[];
}
```

| Field | Type | Description |
|---|---|---|
| `timestamp` | `string` | ISO 8601 timestamp of when the optimization ran. |
| `durationMs` | `number` | Total duration of the optimization in milliseconds. |
| `safetyLevel` | `SafetyLevel` | The safety level that was applied. |
| `savings` | `TokenSavings` | Aggregate savings summary. |
| `passes` | `PassResult[]` | Per-pass breakdown of results. |

---

#### `TokenSavings`

```typescript
interface TokenSavings {
  charactersBefore: number;
  charactersAfter: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  percentage: number;
}
```

| Field | Type | Description |
|---|---|---|
| `charactersBefore` | `number` | Character count of the original text. |
| `charactersAfter` | `number` | Character count of the optimized text. |
| `tokensBefore` | `number` | Estimated token count of the original text. |
| `tokensAfter` | `number` | Estimated token count of the optimized text. |
| `tokensSaved` | `number` | Number of tokens saved (always >= 0). |
| `percentage` | `number` | Percentage of tokens saved (0--100). |

---

#### `PassResult`

```typescript
interface PassResult {
  id: string;
  name: string;
  safetyLevel: SafetyLevel;
  applied: boolean;
  skipReason?: string;
  tokensSaved: number;
  changeCount: number;
  durationMs: number;
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique pass identifier (e.g., `'filler-words'`). |
| `name` | `string` | Human-readable pass name (e.g., `'Filler Words'`). |
| `safetyLevel` | `SafetyLevel` | The safety tier this pass belongs to. |
| `applied` | `boolean` | Whether the pass made any changes. |
| `skipReason` | `string \| undefined` | Reason the pass was skipped (e.g., `'safety-level'`). |
| `tokensSaved` | `number` | Tokens saved by this pass (always >= 0). |
| `changeCount` | `number` | Number of individual changes made. |
| `durationMs` | `number` | Time spent executing this pass in milliseconds. |

---

#### `ChangeEntry`

```typescript
interface ChangeEntry {
  passId: string;
  original: string;
  replacement: string;
  offset: number;
  line: number;
  column: number;
}
```

Represents a single text change made by an optimization pass.

---

#### `Optimizer`

```typescript
interface Optimizer {
  optimize(input: string): OptimizationResult;
  analyze(input: string): OptimizationReport;
}
```

A reusable optimizer instance created by `createOptimizer()`.

---

## Configuration

### Safety Levels

| Level | Passes Included | Use Case |
|---|---|---|
| `safe` | trailing-spaces, empty-lines, whitespace-normalize, comment-strip | Automated pipelines with no human review. Only touches whitespace and inert content. |
| `moderate` | All `safe` passes + filler-words, verbose-phrases, preamble-strip, redundancy-merge | Production use with brief human review. Removes words and phrases that do not affect LLM behavior. |
| `aggressive` | All `moderate` passes + future high-aggression passes | Reserved for future structural transformation passes. |

### Custom Token Counter

The built-in token counter estimates tokens as `Math.ceil(text.length / 4)`, which is accurate to within 10--15% for typical English text with BPE tokenizers. For exact counts, provide a custom counter:

```typescript
import { optimize } from 'prompt-optimize';
import { encoding_for_model } from 'tiktoken';

const enc = encoding_for_model('gpt-4o');

const result = optimize('Please just provide the answer in order to complete the task.', {
  tokenCounter: (text) => enc.encode(text).length,
});

console.log(result.report.savings.tokensSaved); // Exact token savings
```

---

## Optimization Passes

### Safe Passes

These passes are guaranteed to preserve semantic meaning. They only modify whitespace and inert content.

| ID | Name | Description |
|---|---|---|
| `trailing-spaces` | Trailing Spaces | Removes trailing spaces and tabs from each line. |
| `empty-lines` | Empty Lines | Collapses 4+ consecutive empty lines to 2. Removes leading and trailing blank lines. |
| `whitespace-normalize` | Whitespace Normalize | Normalizes line endings to `\n`. Collapses 3+ blank lines to 2. Collapses multiple mid-line spaces to one (preserving indentation). |
| `comment-strip` | Comment Strip | Removes HTML comments (`<!-- -->`), line-leading `//` comments, and line-leading `#` comments. Cleans up resulting blank lines. |

### Moderate Passes

These passes remove filler content that empirical testing shows has no effect on LLM output quality. Review recommended.

| ID | Name | Description |
|---|---|---|
| `filler-words` | Filler Words | Removes standalone filler words: please, kindly, just, simply, basically, actually, certainly, of course, obviously, you know. |
| `verbose-phrases` | Verbose Phrases | Replaces wordy phrases with concise equivalents. See the phrase table below. |
| `preamble-strip` | Preamble Strip | Strips common AI preamble openers (e.g., "Certainly! Here is...", "I'd be happy to...", "You are a helpful assistant."). |
| `redundancy-merge` | Redundancy Merge | Detects near-duplicate sentences using Jaccard similarity (threshold > 0.85) and removes subsequent duplicates. |

### Verbose Phrase Replacements

| Verbose Phrase | Replacement |
|---|---|
| in order to | to |
| due to the fact that | because |
| at this point in time | now |
| in the event that | if |
| for the purpose of | to |
| with regard to | about |
| in the process of | while |
| make sure to | ensure |
| it is important to note that | *(removed)* |
| it should be noted that | *(removed)* |
| please note that | *(removed)* |
| as previously mentioned | *(removed)* |
| as stated above | *(removed)* |
| needless to say | *(removed)* |
| at the end of the day | *(removed)* |

---

## Protected Regions

The following regions are automatically detected and never modified by any optimization pass, regardless of safety level:

| Region Type | Pattern | Example |
|---|---|---|
| Fenced code blocks | ` ``` ... ``` ` | Code examples with language tags |
| Inline code | `` `...` `` | Inline code references |
| Template variables | `{{var}}`, `{var}`, `${var}`, `%(var)s` | Placeholder values |
| URLs | `https?://...` | Links and endpoints |
| Quoted strings | `"..."`, `'...'` | Exact values and names |
| HTML tags | `<tag ...>` | Structural markup |
| Negation contexts | Sentences containing: not, never, don't, must not, do not, cannot, shouldn't, won't, no | Safety-critical instructions |

Negation protection is particularly important. A sentence like "Please do not include personal data" is left entirely intact to prevent any risk of disrupting the negation.

---

## Error Handling

`prompt-optimize` is designed to be safe by default:

- **Empty input**: Passing an empty string returns it unchanged with zero savings reported.
- **Already-optimal input**: If no passes produce changes, the original text is returned with `tokensSaved: 0` and `percentage: 0`.
- **All-protected input**: If the entire input consists of protected regions (e.g., a single code block), no modifications are made.
- **Invalid safety level**: The `safety` option accepts only `'safe'`, `'moderate'`, or `'aggressive'`. Any other value will cause a runtime error when filtering passes.
- **Token counter errors**: If a custom `tokenCounter` function throws, the error propagates to the caller. Ensure your counter handles all string inputs.

All functions are synchronous and throw no errors for valid inputs. There are no async operations, no network calls, and no file I/O.

---

## Advanced Usage

### Analyzing Before Optimizing

Use `analyze()` to preview savings without generating the optimized text:

```typescript
import { analyze } from 'prompt-optimize';

const report = analyze(systemPrompt, { safety: 'moderate' });

if (report.savings.percentage > 20) {
  console.log(`Prompt has ${report.savings.percentage}% waste — consider optimizing.`);
}

for (const pass of report.passes) {
  if (pass.applied) {
    console.log(`  ${pass.name}: saved ${pass.tokensSaved} tokens in ${pass.durationMs}ms`);
  }
}
```

### Safety Level Comparison

Compare savings across safety levels to make an informed decision:

```typescript
import { analyze } from 'prompt-optimize';

const prompt = loadPrompt();

const safeSavings = analyze(prompt, { safety: 'safe' }).savings;
const moderateSavings = analyze(prompt, { safety: 'moderate' }).savings;

console.log(`Safe:     ${safeSavings.tokensSaved} tokens (${safeSavings.percentage}%)`);
console.log(`Moderate: ${moderateSavings.tokensSaved} tokens (${moderateSavings.percentage}%)`);
```

### Batch Optimization

Use `createOptimizer()` to process multiple prompts with the same configuration:

```typescript
import { createOptimizer } from 'prompt-optimize';

const optimizer = createOptimizer({ safety: 'moderate' });

const prompts = loadAllPrompts();
let totalSaved = 0;

for (const [name, text] of Object.entries(prompts)) {
  const result = optimizer.optimize(text);
  totalSaved += result.report.savings.tokensSaved;
  console.log(`${name}: ${result.report.savings.percentage}% reduction`);
}

console.log(`Total tokens saved: ${totalSaved}`);
```

### CI/CD Integration

Fail a build if any prompt exceeds a token waste threshold:

```typescript
import { analyze } from 'prompt-optimize';

const MAX_WASTE_PERCENT = 15;

for (const promptFile of promptFiles) {
  const text = fs.readFileSync(promptFile, 'utf-8');
  const report = analyze(text, { safety: 'moderate' });

  if (report.savings.percentage > MAX_WASTE_PERCENT) {
    console.error(
      `${promptFile}: ${report.savings.percentage}% token waste exceeds ${MAX_WASTE_PERCENT}% threshold`
    );
    process.exit(1);
  }
}
```

### Using with Accurate Tokenizers

For production cost accounting, plug in an accurate tokenizer:

```typescript
import { createOptimizer } from 'prompt-optimize';
import { encode } from 'gpt-tokenizer';

const optimizer = createOptimizer({
  safety: 'moderate',
  tokenCounter: (text) => encode(text).length,
});

const result = optimizer.optimize(systemPrompt);
console.log(`Exact tokens saved: ${result.report.savings.tokensSaved}`);
```

---

## TypeScript

`prompt-optimize` is written in TypeScript and ships with full type declarations (`.d.ts`) and declaration maps. All public types are exported from the package entry point:

```typescript
import type {
  SafetyLevel,
  ChangeEntry,
  PassResult,
  TokenSavings,
  OptimizationReport,
  OptimizationResult,
  OptimizeOptions,
  Optimizer,
} from 'prompt-optimize';
```

The package compiles to ES2022 CommonJS with source maps enabled. TypeScript strict mode is enforced.

---

## License

MIT
