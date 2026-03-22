# prompt-optimize — Task Breakdown

This file tracks all implementation tasks derived from SPEC.md. Each task is granular and actionable. Tasks are grouped into phases matching the implementation roadmap.

---

## Phase 0: Project Scaffolding & Setup

- [ ] **Install dev dependencies** — Add `typescript`, `vitest`, and `eslint` as dev dependencies in `package.json`. Confirm `npm install` succeeds. | Status: not_done
- [ ] **Add optional peer dependencies to package.json** — Declare `js-tiktoken` and `gpt-tokenizer` as optional peer dependencies with `peerDependenciesMeta` marking them optional. | Status: not_done
- [ ] **Add CLI binary entry to package.json** — Add `"bin": { "prompt-optimize": "./dist/cli.js" }` to `package.json` so the CLI is available after global install or via npx. | Status: not_done
- [ ] **Create src directory structure** — Create all subdirectories: `src/tokenizer/`, `src/passes/`, `src/protection/`, `src/report/`, `src/formats/`, `src/config/`, `src/formatters/`, `src/utils/`. | Status: not_done
- [ ] **Create test directory structure** — Create `src/__tests__/`, `src/__tests__/passes/`, `src/__tests__/protection/`, `src/__tests__/tokenizer/`, `src/__tests__/report/`, `src/__tests__/config/`, and `src/__tests__/fixtures/prompts/`, `src/__tests__/fixtures/configs/`. | Status: not_done
- [ ] **Create test fixture files** — Create fixture prompt files: `verbose-prompt.md`, `optimal-prompt.md`, `protected-regions.md`, `negation-heavy.md`, `message-array.json`, `anthropic-format.json`, `empty.md`, `large-prompt.md`. Create fixture config files: `valid-config.json`, `custom-phrases.json`, `aggressive-config.json`. | Status: not_done
- [ ] **Configure Vitest** — Add or verify `vitest.config.ts` if needed. Confirm `npm run test` executes Vitest correctly. | Status: not_done
- [ ] **Configure ESLint** — Add ESLint config for TypeScript. Confirm `npm run lint` works. | Status: not_done

---

## Phase 1: Type Definitions

- [ ] **Define input types** — In `src/types.ts`, define `PromptInput` (union of `string`, `PromptMessage[]`, `AnthropicPrompt`, `{ file: string }`), `PromptMessage` interface (`role`, `content`), and `AnthropicPrompt` interface (`system`, `messages`). | Status: not_done
- [x] **Define safety level type** — In `src/types.ts`, define `SafetyLevel` as `'safe' | 'moderate' | 'aggressive'`. | Status: done
- [ ] **Define options types** — In `src/types.ts`, define `OptimizeOptions` (safety, passes, tokenizer, pricing, customPasses, protectedPatterns), `PassConfig` (enabled, options), and `PricingConfig` (inputPerMillion, modelName, additionalModels). | Status: not_done
- [ ] **Define result types** — In `src/types.ts`, define `OptimizationResult` (optimized, original, report), `OptimizationReport` (timestamp, durationMs, safetyLevel, savings, passes, tokenizerUsed, changes), `TokenSavings` (charactersBefore/After, tokensBefore/After, tokensSaved, percentage, estimatedCostSavingsPerMillion), `PassResult` (id, name, safetyLevel, applied, skipReason, tokensSaved, changeCount, durationMs), and `ChangeEntry` (passId, original, replacement, offset, line, column). | Status: not_done
- [x] **Define optimizer instance type** — In `src/types.ts`, define `Optimizer` interface with `optimize(input)` and `analyze(input)` methods. | Status: done
- [ ] **Define custom pass types** — In `src/types.ts`, define `CustomPassDefinition` (id, name, safetyLevel, description, transform) and `PassContext` (protectedRegions, isProtected, countTokens, originalText, safetyLevel). | Status: not_done

---

## Phase 2: Utility Modules

- [ ] **Implement text utilities** — In `src/utils/text.ts`, implement text normalization helpers: whitespace collapsing, line splitting, capitalization of first letter after removal, and other shared text manipulation functions. | Status: not_done
- [ ] **Implement shared regex patterns** — In `src/utils/patterns.ts`, define and export all shared regex patterns: filler word patterns, verbose phrase lookup table, preamble patterns, negation word list, URL patterns, template variable patterns, code block patterns. | Status: not_done
- [x] **Implement Jaccard similarity** — In `src/utils/similarity.ts`, implement a Jaccard similarity function on word sets (lowercase, whitespace-collapsed, stopwords removed). Used by `redundancy-merge` pass. Include configurable threshold (default 0.85). | Status: done

---

## Phase 3: Protected Region Detection

- [x] **Implement code block detection** — In `src/protection/code-blocks.ts`, detect fenced code blocks (triple backticks with optional language tag) and indented code blocks. Return `{ start, end }` ranges. Handle nested backticks and edge cases. | Status: done
- [x] **Implement template variable detection** — In `src/protection/template-variables.ts`, detect `{{variable}}`, `{variable}`, `{{ variable }}` and other common template syntaxes. Return `{ start, end }` ranges. | Status: done
- [x] **Implement quoted string detection** — In `src/protection/quoted-strings.ts`, detect single-quoted, double-quoted, and backtick-quoted strings. Return `{ start, end }` ranges. Handle escaped quotes within strings. | Status: done
- [x] **Implement URL detection** — In `src/protection/urls.ts`, detect HTTP/HTTPS URLs, file paths, and URIs. Return `{ start, end }` ranges. | Status: done
- [x] **Implement negation context detection** — In `src/protection/negation.ts`, detect sentences containing negation words ("not", "never", "don't", "must not", "do not", "cannot", "shouldn't", "won't", "no"). Return `{ start, end }` ranges for full sentences containing negation. | Status: done
- [x] **Implement protection index entry point** — In `src/protection/index.ts`, export a `detectProtectedRegions(text, additionalPatterns?)` function that calls all detectors, merges overlapping regions, sorts them, and returns a flat sorted array of `{ start, end }`. Implement `isProtected(offset, regions)` using binary search for O(log n) lookup. | Status: done
- [ ] **Write tests for code block detection** — In `src/__tests__/protection/code-blocks.test.ts`, test fenced blocks, indented blocks, nested backticks, empty blocks, blocks at start/end of text. | Status: not_done
- [ ] **Write tests for template variable detection** — In `src/__tests__/protection/template-variables.test.ts`, test `{{var}}`, `{var}`, `{{ var }}`, variables adjacent to text, multiple variables on one line. | Status: not_done
- [ ] **Write tests for quoted string detection** — In `src/__tests__/protection/quoted-strings.test.ts`, test single/double/backtick quotes, escaped quotes, nested quotes, multiline quoted strings. | Status: not_done
- [ ] **Write tests for negation detection** — In `src/__tests__/protection/negation.test.ts`, test all negation words ("not", "never", "don't", "must not", "do not", "cannot", "shouldn't", "won't", "no"), test mixed-case variants ("Do not", "DO NOT", "do NOT", "Don't", "don't"), test that non-negation sentences are not flagged. | Status: not_done

---

## Phase 4: Token Counting

- [x] **Implement approximate tokenizer** — In `src/tokenizer/approximate.ts`, implement `countTokens(text): number` using `Math.ceil(text.length / 4)`. | Status: done
- [ ] **Implement tiktoken adapter** — In `src/tokenizer/tiktoken-adapter.ts`, implement an adapter that auto-detects `gpt-tokenizer` (preferred) or `js-tiktoken` at import time. Support `cl100k_base` and `o200k_base` encodings. Cache encoding instances. Fall back gracefully if neither library is installed. | Status: not_done
- [ ] **Implement tokenizer factory** — In `src/tokenizer/index.ts`, export a `createTokenCounter(encoding?)` function that returns the appropriate counting function based on the requested encoding and available libraries. Log a warning and fall back to approximate if a specific encoding is requested but its library is not installed. | Status: not_done
- [ ] **Write tests for approximate tokenizer** — In `src/__tests__/tokenizer/approximate.test.ts`, test against known inputs, verify `Math.ceil(text.length / 4)` behavior, test empty string, test long strings. | Status: not_done
- [ ] **Write tests for tiktoken adapter** — In `src/__tests__/tokenizer/tiktoken-adapter.test.ts`, test auto-detection logic, test fallback when no library is installed, test encoding instance caching. Mock `require` for testing availability. | Status: not_done

---

## Phase 5: Optimization Passes — Safe Level

- [x] **Implement whitespace-normalize pass** — In `src/passes/whitespace-normalize.ts`, implement: collapse multiple consecutive blank lines to single blank line, remove trailing whitespace from every line, collapse multiple consecutive spaces within a line to single space (except within code blocks and indentation), remove leading/trailing blank lines from entire prompt. Respect protected regions. | Status: done
- [x] **Implement comment-strip pass** — In `src/passes/comment-strip.ts`, implement: remove HTML comments (`<!-- ... -->`), remove line comments starting with `//` (when not inside code blocks), remove hash comments (`# comment` when clearly a comment not a markdown header), remove `prompt-lint-disable`/`prompt-lint-enable` directives. Never touch markdown headers, code blocks, or XML tags. | Status: done
- [ ] **Write tests for whitespace-normalize** — In `src/__tests__/passes/whitespace-normalize.test.ts`, test blank line collapsing, trailing whitespace removal, multiple space collapsing, leading/trailing blank line removal, preservation of code block indentation, preservation of quoted string whitespace, idempotency. | Status: not_done
- [ ] **Write tests for comment-strip** — In `src/__tests__/passes/comment-strip.test.ts`, test HTML comment removal, line comment removal, hash comment removal, prompt-lint directive removal, preservation of markdown headers, preservation of code block comments, preservation of XML tags, multiline HTML comments. | Status: not_done

---

## Phase 6: Optimization Passes — Moderate Level

- [x] **Implement filler-words pass** — In `src/passes/filler-words.ts`, implement removal of all filler words/phrases from the spec's complete table (30+ entries): "please", "kindly", "just", "simply", "basically", "actually", "I would like you to", "Could you please", "Can you", "Would you", "I want you to", "I need you to", "It is important that you", "Make sure to", "Make sure that", "Be sure to", "Remember to", "Don't forget to", "Thank you" (entire sentence), "Thanks in advance" (entire sentence), "Note that", "Please note that", "Keep in mind that", "It should be noted that", "As a reminder", "I'd appreciate if you", "If you could", "Would you mind". Context-sensitive: skip protected regions, skip negation contexts, skip partial matches (e.g., "just" in "justice"). Capitalize first letter after removal when needed. Support custom filler words via options. | Status: done
- [x] **Implement verbose-phrases pass** — In `src/passes/verbose-phrases.ts`, implement replacement of all verbose phrases from the spec's complete table (45+ entries): "in order to" -> "to", "due to the fact that" -> "because", "for the purpose of" -> "to"/"for", "in the event that" -> "if", "at this point in time" -> "now", etc. through all entries. Skip protected regions. Support custom phrase tables via options. Case-insensitive matching with case-preserving replacement. | Status: done
- [x] **Implement preamble-strip pass** — In `src/passes/preamble-strip.ts`, implement detection and removal of generic AI identity preambles: "You are an AI assistant" (unless followed by specific domain/role), "You are a large language model", "You are a helpful AI", "As an AI assistant", "As a language model", "I am an AI assistant", "You are ChatGPT"/"You are GPT-4", "You are designed to" + generic, "Your goal is to" + generic, "Your purpose is to" + generic. Preserve specific role definitions with domain/expertise descriptions. | Status: done
- [x] **Implement redundancy-merge pass** — In `src/passes/redundancy-merge.ts`, implement detection of near-duplicate instructions using Jaccard similarity on normalized word sets. Configurable threshold (default 0.85). Keep first occurrence, remove subsequent duplicates. Normalize by lowercasing, collapsing whitespace, removing filler words, mapping synonyms. Skip instructions in different sections or within few-shot examples. | Status: done
- [ ] **Write tests for filler-words** — In `src/__tests__/passes/filler-words.test.ts`, test each filler word/phrase removal individually, test combination removal, test preservation in protected regions (code blocks, quoted strings, template variables), test preservation in negation contexts ("Please do not..."), test partial match avoidance ("just" in "justice", "simply" in "simplify"), test capitalization after removal, test custom filler words, test sentence-level removal (e.g., "Thank you."), test empty result handling. | Status: not_done
- [ ] **Write tests for verbose-phrases** — In `src/__tests__/passes/verbose-phrases.test.ts`, test each phrase replacement individually, test case sensitivity handling, test preservation in code blocks, test preservation in quoted strings, test custom phrase tables, test adjacent phrases, test phrase at start/end of text. | Status: not_done
- [ ] **Write tests for preamble-strip** — In `src/__tests__/passes/preamble-strip.test.ts`, test removal of each generic preamble pattern, test preservation of specific role definitions ("You are a senior Python developer..."), test preservation of organizational context ("You are a customer support agent for ACME Corp"), test preservation of domain-specific constraints, test multi-sentence preambles with mixed generic/specific content. | Status: not_done
- [ ] **Write tests for redundancy-merge** — In `src/__tests__/passes/redundancy-merge.test.ts`, test merging of near-duplicate instructions, test that similar-but-different instructions are preserved, test configurable threshold, test first-occurrence retention, test instructions in different sections preserved, test instructions within examples preserved. | Status: not_done

---

## Phase 7: Optimization Passes — Aggressive Level

- [ ] **Implement example-trim pass** — In `src/passes/example-trim.ts`, implement: truncate long example inputs to representative snippets (preserve first/last tokens with `[...]`), remove examples beyond configurable `maxExamples` (default 3, remove from middle, keep first and last), simplify verbose example explanations. Never touch output portions of examples. Configuration: `maxExamples` (default 3), `maxExampleInputLength` (default 200 chars). Skip prompts with only 1-2 examples. | Status: not_done
- [ ] **Implement structural-optimize pass** — In `src/passes/structural-optimize.ts`, implement: convert comma-separated lists of requirements into bullet points, convert repetitive sentence patterns into list formats, replace verbose prose section headers with concise equivalents. Never touch already-structured content, conditional/causal prose, or code blocks. | Status: not_done
- [ ] **Implement passive-to-active pass** — In `src/passes/passive-to-active.ts`, implement: convert passive voice to active voice where transformation is unambiguous and shorter. Patterns: "The X should be Y" -> "Y the X", "X must be Y" -> "Y X", "X should be Y by Z" -> preserve (agent matters). Never touch passive constructions in examples, quoted strings, or where agent ambiguity exists. | Status: not_done
- [ ] **Write tests for example-trim** — In `src/__tests__/passes/example-trim.test.ts`, test truncation of long inputs, test example count limiting, test middle-removal strategy, test preservation of example outputs, test short-example preservation, test prompts with <=2 examples, test maxExamples and maxExampleInputLength configuration. | Status: not_done
- [ ] **Write tests for structural-optimize** — In `src/__tests__/passes/structural-optimize.test.ts`, test comma-list to bullet conversion, test repetitive pattern to list conversion, test preservation of already-structured content, test preservation of conditional/causal prose, test preservation of code blocks. | Status: not_done
- [ ] **Write tests for passive-to-active** — In `src/__tests__/passes/passive-to-active.test.ts`, test common passive-to-active conversions, test agent-ambiguity preservation, test preservation within examples and quoted strings, test that shorter active form is produced. | Status: not_done

---

## Phase 8: Pass Registry & Runner

- [x] **Implement pass registry** — In `src/passes/index.ts`, export an array of all built-in pass definitions with their IDs, names, safety levels, default enabled status, and transform functions. Define the canonical execution order: whitespace-normalize, comment-strip, filler-words, verbose-phrases, preamble-strip, redundancy-merge, example-trim, structural-optimize, passive-to-active. | Status: done
- [x] **Implement pass runner** — In `src/passes/pass-runner.ts`, implement `runPasses(text, passes, config, protectedRegions, tokenCounter)` that: filters passes by safety level, applies per-pass enable/disable from config, executes passes in order, tracks per-pass token savings and timing, collects change entries, returns `PassResult[]` and final text. | Status: done

---

## Phase 9: Core Optimizer Engine

- [x] **Implement optimizer core** — In `src/optimizer.ts`, implement the `optimize()` function: accept `PromptInput` and `OptimizeOptions`, resolve configuration (defaults + options), detect protected regions, create token counter, run pass pipeline via pass-runner, generate `OptimizationResult` with optimized text and full report. | Status: done
- [x] **Implement analyze function** — In `src/optimizer.ts`, implement the `analyze()` function: same pipeline as `optimize()` but returns only the `OptimizationReport` without the optimized text field. Preview savings without modification. | Status: done
- [x] **Implement createOptimizer factory** — In `src/optimizer.ts`, implement `createOptimizer(options)` that returns an `Optimizer` instance with preset options. The instance's `optimize()` and `analyze()` methods use the preset options, allowing reuse across multiple prompts. | Status: done
- [ ] **Implement custom pass integration** — In the optimizer, accept `customPasses` in options, validate IDs don't conflict with built-in pass IDs, append custom passes after built-in passes, provide `PassContext` to custom pass transform functions. | Status: not_done

---

## Phase 10: Report Generation

- [x] **Implement savings calculation** — In `src/report/savings.ts`, implement `calculateSavings(originalText, optimizedText, tokenCounter)` returning `TokenSavings`: charactersBefore/After, tokensBefore/After, tokensSaved, percentage (`(tokensSaved / tokensBefore) * 100`). | Status: done
- [ ] **Implement cost estimation** — In `src/report/cost.ts`, implement `estimateCostSavings(tokensSaved, pricingConfig)` returning `Record<string, string>` of model name to formatted dollar savings per million calls. Formula: `tokensSaved * (inputPerMillion / 1_000_000) * 1_000_000`. Support primary model and additional models. | Status: not_done
- [ ] **Implement diff generation** — In `src/report/diff.ts`, implement a minimal inline unified diff generator that produces human-readable diffs from the change entries. No external dependency — simple line-level diff. | Status: not_done
- [x] **Implement report assembly** — In `src/report/index.ts`, implement `generateReport(original, optimized, passResults, changes, config, durationMs)` that assembles the full `OptimizationReport` including timestamp, duration, safety level, savings, per-pass breakdown, tokenizer used, and changes. | Status: done
- [ ] **Write tests for savings calculation** — In `src/__tests__/report/savings.test.ts`, test correct character and token counts, test percentage calculation, test zero-savings case, test 100%-savings edge case. | Status: not_done
- [ ] **Write tests for cost estimation** — In `src/__tests__/report/cost.test.ts`, test cost calculation with default pricing, test custom pricing, test multiple models, test zero-savings cost, test formatting of dollar values. | Status: not_done

---

## Phase 11: Prompt Format Support

- [ ] **Implement format detection** — In `src/formats/index.ts`, implement `detectFormat(input)` that identifies whether the input is a plain string, an OpenAI message array, an Anthropic prompt object, or a file path. Dispatch to the appropriate handler. | Status: not_done
- [ ] **Implement plain text handler** — In `src/formats/plain-text.ts`, implement pass-through for plain string input. Handle file reading when input is `{ file: string }`, supporting `.txt`, `.prompt`, `.md`, `.system`, `.promptmd` extensions. | Status: not_done
- [ ] **Implement message array handler** — In `src/formats/messages.ts`, implement handling for OpenAI-style message arrays: optimize each message's `content` field independently, preserve `role` fields and message structure. Also handle Anthropic format: optimize the `system` field and each message's `content` field. Protect template variables in user message content. | Status: not_done

---

## Phase 12: Configuration System

- [ ] **Implement default configuration** — In `src/config/defaults.ts`, define and export the default configuration: safety `'moderate'`, tokenizer `'approximate'`, all passes enabled at their safety level, default pricing (GPT-4o at $2.50/MTok). | Status: not_done
- [ ] **Implement config file loading** — In `src/config/index.ts`, implement config file discovery: search current directory and ancestors for `.prompt-optimize.json`, `.prompt-optimizerc` (JSON format), and `prompt-optimize` key in `package.json`. Parse and validate the config. Support `--config` path override. | Status: not_done
- [ ] **Implement configuration precedence resolution** — In `src/config/index.ts`, implement the merge order: built-in defaults < config file < CLI flags < programmatic options. Per-pass overrides (enable/disable, pass-specific options) merge correctly. | Status: not_done
- [ ] **Implement custom phrase table loading** — Support `customPhrases` option in `verbose-phrases` pass config, merging user-defined phrase replacements with the built-in table. | Status: not_done
- [ ] **Implement custom filler words loading** — Support `customFillers` option in `filler-words` pass config, adding user-defined filler words to the built-in list. | Status: not_done
- [ ] **Implement plugin loading** — Support `plugins` array in config file, loading JS modules that export arrays of `CustomPassDefinition` objects. Validate loaded passes. | Status: not_done
- [ ] **Write tests for config loading** — In `src/__tests__/config/config-loading.test.ts`, test config file discovery, test JSON parsing, test package.json key extraction, test precedence resolution, test per-pass overrides, test custom phrase table merging, test custom filler word merging, test invalid config error handling. | Status: not_done

---

## Phase 13: Public API Exports

- [ ] **Wire up public API in index.ts** — In `src/index.ts`, export: `optimize` function, `analyze` function, `createOptimizer` factory, and all public types (`PromptInput`, `PromptMessage`, `AnthropicPrompt`, `SafetyLevel`, `OptimizeOptions`, `PassConfig`, `PricingConfig`, `OptimizationResult`, `OptimizationReport`, `TokenSavings`, `PassResult`, `ChangeEntry`, `Optimizer`, `CustomPassDefinition`, `PassContext`). | Status: not_done

---

## Phase 14: CLI Implementation

- [ ] **Implement CLI argument parsing** — In `src/cli.ts`, use `node:util.parseArgs` to parse all CLI flags: `--analyze`, `--diff`, `--in-place`, `--safety`, `--pass` (repeatable), `--tokenizer`, `--model`, `--price`, `--calls`, `--format`, `--quiet`, `--no-color`, `--stdin`, `--config`, `--version`, `--help`. Parse positional arguments as file paths/globs. | Status: not_done
- [ ] **Implement environment variable support** — In `src/cli.ts`, read `PROMPT_OPTIMIZE_SAFETY`, `PROMPT_OPTIMIZE_TOKENIZER`, `PROMPT_OPTIMIZE_FORMAT`, `PROMPT_OPTIMIZE_CONFIG` from `process.env` as fallback values for their corresponding flags. | Status: not_done
- [ ] **Implement file glob expansion** — In the CLI, expand glob patterns in positional arguments to matching file paths. Support `**/*.md` and similar patterns. | Status: not_done
- [ ] **Implement stdin reading** — In the CLI, when `--stdin` is provided (or no files and stdin is piped), read prompt text from stdin. | Status: not_done
- [ ] **Implement --model shorthand** — Map `--model gpt-4o` to tokenizer `o200k_base` + pricing $2.50/MTok, `--model claude-sonnet` to tokenizer `cl100k_base` + pricing $3.00/MTok, etc. | Status: not_done
- [ ] **Implement --pass flag parsing** — Parse `--pass preamble-strip:false`, `--pass example-trim:true` etc. into per-pass enable/disable overrides. | Status: not_done
- [ ] **Implement --in-place mode** — When `--in-place` is specified, write the optimized text back to the source file(s). Require explicit opt-in. | Status: not_done
- [ ] **Implement multi-file processing** — When multiple files or globs are provided, optimize each file independently and produce an aggregate summary report with per-file and total savings. | Status: not_done
- [ ] **Implement exit codes** — Return exit code 0 for success (optimization found savings), 1 for no changes (already optimal), 2 for configuration/input errors. | Status: not_done
- [ ] **Implement --version and --help** — `--version` prints the version from package.json. `--help` prints the full usage message matching the spec. | Status: not_done
- [ ] **Add hashbang to cli.ts** — Add `#!/usr/bin/env node` at the top of `src/cli.ts` so it can be executed directly. | Status: not_done

---

## Phase 15: Output Formatters

- [ ] **Implement human-readable formatter** — In `src/formatters/human.ts`, implement terminal output matching the spec's human-readable example: header with version/file/safety/tokenizer, savings summary (before/after characters and tokens, percentage), estimated cost savings per model, per-pass breakdown table (PASS/SKIP with tokens saved, percentage, change count), unified diff, footer with total summary and timing. Use ANSI escape codes for color. Respect `NO_COLOR` env var and `--no-color` flag. | Status: not_done
- [ ] **Implement JSON formatter** — In `src/formatters/json.ts`, serialize the `OptimizationResult` (or `OptimizationReport` for analyze mode) to a JSON string and write to stdout. | Status: not_done
- [ ] **Implement formatter factory** — In `src/formatters/index.ts`, export a `getFormatter(format)` function that returns the human or JSON formatter based on the `--format` flag. | Status: not_done
- [ ] **Implement --quiet mode** — When `--quiet` is specified, suppress all output except the optimized text itself. Useful for piping. | Status: not_done

---

## Phase 16: Integration Tests

- [ ] **Write optimizer integration test — verbose prompt** — In `src/__tests__/optimizer.test.ts`, optimize the `verbose-prompt.md` fixture at all three safety levels. Assert expected savings percentages and verify the optimized text reads correctly. | Status: not_done
- [ ] **Write optimizer integration test — already-optimal prompt** — Optimize the `optimal-prompt.md` fixture. Assert zero or near-zero savings. Assert text is unchanged. | Status: not_done
- [ ] **Write optimizer integration test — protected regions** — Optimize the `protected-regions.md` fixture. Assert all code blocks, template variables, URLs, and quoted strings are byte-for-byte identical in the output. | Status: not_done
- [ ] **Write optimizer integration test — message array format** — Optimize the `message-array.json` fixture. Assert the message array structure is preserved and only content fields are modified. | Status: not_done
- [ ] **Write optimizer integration test — Anthropic format** — Optimize the `anthropic-format.json` fixture. Assert the Anthropic format structure is preserved. | Status: not_done
- [ ] **Write optimizer integration test — safety level progression** — Optimize the same prompt at safe, moderate, and aggressive. Assert that each higher level saves strictly more (or equal) tokens than the previous. | Status: not_done
- [ ] **Write optimizer integration test — idempotency** — Optimize a prompt, then optimize the result again. Assert the second optimization produces zero additional changes. | Status: not_done

---

## Phase 17: Semantic Equivalence Tests

- [ ] **Write negation preservation tests** — In `src/__tests__/semantic-equivalence.test.ts`, test a comprehensive suite of prompts containing "not", "never", "don't", "must not", "do not", "cannot", "no", "shouldn't", "won't". Verify every negation word survives optimization at all three safety levels. | Status: not_done
- [ ] **Write protected content preservation tests** — Verify that code blocks, template variables, URLs, and quoted strings are byte-for-byte identical before and after optimization at all safety levels. | Status: not_done
- [ ] **Write instruction preservation tests** — For representative prompts, verify that imperative verbs and their objects are preserved after optimization. The optimized prompt must convey the same instructions. | Status: not_done

---

## Phase 18: CLI Tests

- [ ] **Write CLI argument parsing tests** — In `src/__tests__/cli.test.ts`, test all flags parse correctly, test unknown flags produce error, test conflicting flags, test environment variable fallback. | Status: not_done
- [ ] **Write CLI file processing tests** — Test single file, multiple files, glob expansion, file-not-found error, non-text file error. | Status: not_done
- [ ] **Write CLI stdin tests** — Test reading from stdin, test `--stdin` flag, test piped input detection. | Status: not_done
- [ ] **Write CLI output format tests** — Test human-readable output matches expected format, test JSON output is valid JSON with correct structure, test `--quiet` suppresses all but optimized text. | Status: not_done
- [ ] **Write CLI exit code tests** — Test exit 0 when optimization found savings, test exit 1 when no changes, test exit 2 for configuration/input errors. | Status: not_done

---

## Phase 19: Edge Case Tests

- [ ] **Test empty prompt** — Optimize empty string and empty file. Assert graceful handling (no crash, zero savings). | Status: not_done
- [ ] **Test whitespace-only prompt** — Optimize a prompt containing only whitespace characters. Assert whitespace is removed. | Status: not_done
- [ ] **Test code-block-only prompt** — Optimize a prompt that is entirely a fenced code block. Assert no changes (all content is protected). | Status: not_done
- [ ] **Test template-variable-only prompt** — Optimize a prompt that is only template variables. Assert no changes. | Status: not_done
- [ ] **Test deeply nested protected regions** — Test a prompt with a code block inside a quoted section inside an example. Assert all nested regions are protected. | Status: not_done
- [ ] **Test adjacent filler words** — Test a prompt with every filler word adjacent to every other filler word. Assert correct removal without mangled output. | Status: not_done
- [ ] **Test large prompt performance** — Optimize the `large-prompt.md` fixture (50KB+). Assert completion in under 1 second. Assert correctness. | Status: not_done
- [ ] **Test binary file input** — Pass a binary file as input. Assert a clear error message, not a crash. | Status: not_done
- [ ] **Test non-English prompt** — Optimize a prompt in a non-English language. Assert filler word removal does not fire. Assert whitespace normalization still works. | Status: not_done
- [ ] **Test mixed-language prompt** — Optimize a prompt with mixed English and non-English content. Assert English filler words are removed but non-English content is preserved. | Status: not_done
- [ ] **Test grammatical integrity after filler removal** — Test cases where removing a filler word could create a grammatically broken sentence. Assert output is grammatically sensible. | Status: not_done
- [ ] **Test negation casing variants** — Test "Do not", "DO NOT", "do NOT", "Don't", "don't" all survive optimization. | Status: not_done

---

## Phase 20: Documentation

- [x] **Write README.md** — Create a comprehensive README with: package overview, installation instructions, quick start examples, API reference (optimize, analyze, createOptimizer), CLI usage with all flags, safety levels explanation, optimization pass catalog, configuration file format, custom pass API, integration examples (CI/CD, pre-commit, prompt-lint, prompt-version), performance characteristics, optional peer dependencies for accurate token counting. | Status: done
- [ ] **Add JSDoc comments to all public exports** — Ensure every exported function, type, and interface has JSDoc comments matching the spec descriptions. | Status: not_done
- [ ] **Create example configuration file** — Create `.prompt-optimize.json` at the project root as a self-testing example config, matching the config format from the spec. | Status: not_done

---

## Phase 21: Build & Publish Preparation

- [ ] **Verify TypeScript build** — Run `npm run build` and confirm all files compile to `dist/` with no errors. Verify `.d.ts` declaration files are generated. Verify source maps are generated. | Status: not_done
- [ ] **Verify all tests pass** — Run `npm run test` and confirm all unit, integration, semantic equivalence, CLI, and edge case tests pass. | Status: not_done
- [ ] **Verify lint passes** — Run `npm run lint` and confirm zero lint errors. | Status: not_done
- [ ] **Verify CLI binary works** — Build and run `node dist/cli.js --help`, `node dist/cli.js --version`, and `node dist/cli.js <fixture-file>` to confirm end-to-end CLI functionality. | Status: not_done
- [x] **Bump version in package.json** — Bump version to the appropriate semver (0.1.0 for Phase 1 deliverables, as indicated in spec). | Status: done
- [ ] **Verify package.json fields** — Confirm `main`, `types`, `bin`, `files`, `engines`, `publishConfig`, `peerDependencies`, `peerDependenciesMeta` are all correctly set. | Status: not_done
