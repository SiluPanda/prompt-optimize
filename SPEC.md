# prompt-optimize -- Specification

## 1. Overview

`prompt-optimize` is a deterministic prompt compression engine for LLM applications. It accepts prompt text -- a plain string, a message array, or a template file -- and applies a configurable pipeline of optimization passes that reduce token count without calling any external LLM. Each pass is a self-contained heuristic: whitespace normalization, filler word removal, verbose phrase compression, redundancy detection, structural optimization, example trimming, comment stripping, preamble removal, and passive-to-active voice conversion. The result is a shorter prompt that conveys the same instructions to the model, accompanied by a detailed optimization report showing before/after token counts, per-pass savings, a diff of changes, and estimated cost savings for a given model's pricing.

The gap this package fills is specific and well-defined. LLM API costs are dominated by token count. OpenAI charges $2.50 per million input tokens for GPT-4o, Anthropic charges $3.00 per million input tokens for Claude Sonnet 4.5, and Google charges comparable rates across the Gemini family. For applications making thousands or millions of API calls per day, every unnecessary token in the system prompt is money burned on every request. A 500-token system prompt called 1 million times per day at $3.00/MTok costs $1.50/day -- $547.50/year -- on that one prompt alone. If 30% of those tokens are filler, verbose phrasing, and redundant whitespace, that is $164.25/year in pure waste from a single prompt. Production systems with dozens of prompts multiply this accordingly.

Existing prompt compression tools do not address this gap for JavaScript/TypeScript developers. Microsoft's LLMLingua and LLMLingua-2 are Python-only libraries that use small language models (GPT-2, LLaMA-7B, BERT-level encoders) to compute per-token perplexity scores and remove low-information tokens. They achieve impressive compression ratios (up to 20x) but require model inference at compression time, adding latency, complexity, and a Python runtime dependency. They are designed for compressing long context documents (RAG retrieval results, conversation histories) rather than optimizing authored system prompts. CompactPrompt merges prompt compression with data compression using self-information scoring, but it is also a research prototype without an npm package. The `squashify` npm package provides generic text compression but has no awareness of prompt structure, LLM semantics, or token counting. No npm package provides a zero-dependency, deterministic, offline prompt optimizer that understands prompt structure and applies safe, auditable heuristics.

`prompt-optimize` is deterministic: the same input always produces the same output. It requires no API keys, no model inference, no network access, and no Python runtime. It runs in milliseconds, making it suitable for build-time optimization, CI/CD pipeline integration, and pre-commit hooks. It is designed to complement `prompt-lint` (which detects prompt quality issues) and `prompt-version` (which tracks prompt changes over time) -- `prompt-optimize` is the tool that fixes token inefficiency by actually rewriting the prompt text.

The design philosophy is conservative safety by default. Prompt optimization is inherently risky: removing the word "not" from "Do NOT include personal data" catastrophically inverts the instruction. `prompt-optimize` addresses this with a three-tier safety level system (`safe`, `moderate`, `aggressive`) that controls which optimization passes are enabled. The `safe` level guarantees no semantic change -- it only touches whitespace and clearly inert content. The `moderate` level removes filler words and verbose phrases that do not affect LLM behavior in practice. The `aggressive` level applies structural transformations that may subtly affect output style. Users choose their risk tolerance explicitly.

---

## 2. Goals and Non-Goals

### Goals

- Provide a single function (`optimize`) that accepts prompt text and returns an optimized version with fewer tokens, plus a detailed report of what changed and how many tokens were saved.
- Provide an analysis function (`analyze`) that previews optimization opportunities and potential savings without modifying the prompt.
- Apply only deterministic, rule-based optimizations. No LLM calls, no model inference, no network access. The same input always produces the same output.
- Implement a three-tier safety level system (`safe`, `moderate`, `aggressive`) that gives users explicit control over how much optimization risk they accept.
- Count tokens using a built-in approximate method (characters / 4 heuristic) with optional integration for accurate counting via `js-tiktoken` or `gpt-tokenizer` when installed.
- Report savings in multiple dimensions: raw character count, estimated token count, percentage reduction, per-pass breakdown, and estimated cost savings for configurable model pricing.
- Produce a human-readable diff showing exactly what changed, enabling manual review before deploying an optimized prompt.
- Support plain text prompts, OpenAI-style message arrays, Anthropic-style prompt objects, and template files with variable placeholders.
- Provide a CLI (`prompt-optimize`) for terminal use, CI/CD integration, and shell scripting.
- Preserve all semantic meaning at the `safe` level with a mathematical guarantee: only whitespace and provably inert content is modified.
- Never modify template variables, code blocks, few-shot example outputs, URLs, proper nouns, or quoted strings -- regardless of safety level.
- Support custom optimization passes via a plugin API, enabling domain-specific optimizations.
- Keep dependencies minimal: zero runtime dependencies. Optional peer dependencies for accurate token counting.
- Integrate with the prompt engineering ecosystem: works alongside `prompt-lint`, `prompt-version`, and `prompt-diff`.

### Non-Goals

- **Not an LLM-based compressor.** This package does not use any language model to evaluate token importance, compute perplexity, or score information content. That is what LLMLingua, Selective Context, and similar research tools do. Those tools achieve higher compression ratios but require model inference, are non-deterministic, and are Python-only. `prompt-optimize` uses deterministic heuristics.
- **Not a prompt rewriter.** This package does not rephrase instructions, restructure arguments, or generate alternative wordings. It applies mechanical transformations: removing known-unnecessary words, replacing known-verbose phrases with known-concise equivalents, and normalizing formatting. The optimized prompt is recognizably the same text, not a paraphrase.
- **Not a prompt linter.** This package does not evaluate prompt quality, detect injection risks, or flag vague instructions. That is what `prompt-lint` does. `prompt-optimize` assumes the prompt is correct and makes it shorter. Use `prompt-lint` first to fix quality issues, then `prompt-optimize` to reduce token count.
- **Not a tokenizer.** This package does not provide a general-purpose tokenization API. Token counting is an internal capability used for reporting savings. For dedicated tokenization, use `tiktoken`, `js-tiktoken`, or `gpt-tokenizer`.
- **Not a context window manager.** This package does not truncate prompts to fit within a model's context window, manage conversation history length, or implement sliding window strategies. It optimizes the authored prompt text itself.
- **Not a semantic compression tool.** This package does not remove content based on semantic importance. It removes content based on syntactic patterns that are known to be unnecessary for LLM instruction-following. It cannot determine that paragraph 3 of a 10-paragraph context section is less important than paragraph 7.

---

## 3. Target Users and Use Cases

### Cost-Sensitive Production Applications

Teams running high-volume LLM applications where input token costs are a significant budget line item. A customer support chatbot handling 100,000 conversations per day with a 600-token system prompt spends $180/month on system prompt tokens alone at $3/MTok. Reducing that prompt to 420 tokens (30% savings) saves $54/month -- $648/year -- with zero change in behavior. `prompt-optimize` automates this reduction.

### AI/ML Platform Teams

Teams maintaining shared prompt libraries and registries used by multiple applications across an organization. Running `prompt-optimize --analyze` across all prompts in the registry produces a report showing total token waste and potential savings. Teams can set token budgets and enforce them in CI: "no prompt may exceed 500 tokens after optimization."

### CI/CD Pipeline Operators

Teams that gate prompt deployments on efficiency metrics. A CI step runs `prompt-optimize --analyze` against all prompt files and fails the build if any prompt has more than 20% optimizable waste, or if the total token count across all prompts exceeds a budget. This prevents prompt bloat from accumulating over time.

### Prompt Engineers and AI Application Developers

Individual developers who write and iterate on prompts. Running `prompt-optimize --diff` during development shows exactly which parts of a prompt are unnecessarily verbose, educating the developer about token-efficient writing patterns. The tool serves as both an optimizer and a teaching aid.

### Cost Optimization Consultants

Engineers tasked with reducing LLM API spend across an organization. `prompt-optimize --analyze` produces a report that quantifies waste and estimates dollar savings at current pricing, making it easy to justify optimization efforts to management.

### Open-Source Tool Authors

Developers publishing tools that include system prompts (MCP servers, AI agents, chatbot frameworks). Running `prompt-optimize` before release ensures shipped prompts are token-efficient, reducing API costs for all downstream users.

---

## 4. Core Concepts

### Optimization Pass

An optimization pass is a single, named transformation that identifies and removes a specific category of token waste in prompt text. Each pass operates independently: it receives the current prompt text and returns a modified version with the targeted waste removed. Passes are applied sequentially in a defined order, with each pass operating on the output of the previous pass. Every pass is:

- **Identified** by a unique kebab-case ID (e.g., `whitespace-normalize`, `filler-words`).
- **Described** with a human-readable explanation of what it does and why.
- **Assigned a safety level** (`safe`, `moderate`, or `aggressive`) that determines the minimum safety setting required for the pass to run.
- **Enabled or disabled** individually via configuration.
- **Measured** for its contribution: the report tracks how many tokens each pass saved.

### Safety Level

The safety level controls which optimization passes are applied. It is the primary risk control mechanism.

- **`safe`**: Only passes that are mathematically guaranteed to preserve semantic meaning. Whitespace normalization, trailing space removal, blank line collapsing, and comment stripping. These changes affect zero tokens that contribute to LLM instruction comprehension. Suitable for automated pipelines with no human review.
- **`moderate`**: Passes that remove content known from extensive empirical evidence to have no effect on LLM behavior: filler words ("please", "kindly", "just"), verbose phrases ("in order to" replaced with "to"), and unnecessary preambles. Research consistently shows that removing politeness markers and filler language does not degrade LLM output quality. Suitable for production use with brief human review.
- **`aggressive`**: Passes that apply structural transformations which may subtly affect output style or emphasis: converting prose to bullet lists, trimming verbose examples, converting passive voice to active voice. These optimizations save more tokens but carry a small risk of changing how the LLM interprets emphasis or priority. Suitable for development-time optimization with thorough human review.

Each safety level includes all passes from lower levels. `moderate` includes all `safe` passes. `aggressive` includes all `moderate` passes.

### Token Counting

`prompt-optimize` counts tokens to quantify savings. It supports three counting modes:

- **Approximate** (built-in, zero dependencies): Estimates token count as `Math.ceil(text.length / 4)`. This is a well-known heuristic for English text with BPE tokenizers: the average English word is roughly 4-5 characters, and BPE tokenizers produce roughly 1 token per word for common words. The heuristic is accurate to within 10-15% for typical English prompt text.
- **Accurate (OpenAI models)**: When `js-tiktoken` or `gpt-tokenizer` is installed as a peer dependency, `prompt-optimize` uses the `cl100k_base` or `o200k_base` encoding to produce exact token counts for GPT-4, GPT-4o, and related models.
- **Accurate (Anthropic models)**: Anthropic uses a proprietary tokenizer. Exact counting for Claude models is approximated using `cl100k_base` (which produces counts within 5% of Claude's actual tokenizer for English text) or the Anthropic token counting API if available.

### Optimization Report

The optimization report is the structured output of an `optimize()` or `analyze()` call. It contains everything needed to understand, review, and verify the optimization: the original and optimized text, before/after token counts, percentage savings, a per-pass breakdown, a diff of changes, and estimated cost savings for configured model pricing. The report is designed for both human review (readable summaries, diffs) and programmatic consumption (structured data, JSON serialization).

### Protected Regions

Protected regions are sections of prompt text that are never modified by any optimization pass, regardless of safety level. These include:

- **Template variables**: `{{variable}}`, `{variable}`, `{{ variable }}`, and other template syntax. Variables are passed through verbatim.
- **Code blocks**: Fenced code blocks (triple backticks) and inline code (single backticks). Code formatting and content must be preserved exactly.
- **Few-shot example outputs**: The expected output portions of few-shot examples. Modifying example outputs changes what the model learns from the examples.
- **URLs and paths**: HTTP/HTTPS URLs, file paths, and URIs. Truncating or modifying URLs breaks functionality.
- **Quoted strings**: Text enclosed in quotation marks (single, double, or backtick quotes). Quoted strings often represent exact values, names, or format specifications.
- **Proper nouns and technical terms**: Capitalized multi-word phrases, camelCase/snake_case identifiers, and words that appear to be domain-specific terminology.
- **Negation contexts**: Sentences containing negation words ("not", "never", "don't", "must not", "do not", "cannot", "no") are treated with extreme caution. Filler word removal in negation contexts is restricted to prevent accidental semantic inversion.

---

## 5. Optimization Passes

### 5.1 `whitespace-normalize`

**Safety level**: `safe`

**Description**: Normalizes all forms of whitespace waste: collapses multiple consecutive blank lines into a single blank line, removes trailing whitespace from every line, normalizes inconsistent indentation (tabs to spaces or vice versa, configurable), removes leading/trailing blank lines from the entire prompt, and collapses multiple consecutive spaces within a line into a single space (except within code blocks and indentation).

**Why it works**: Whitespace tokens are pure waste in prompt context. A sequence of three blank lines tokenizes to three newline tokens; a single blank line conveys the same separation using one token. Trailing spaces are invisible and consume tokens for no purpose. Modern BPE tokenizers (cl100k_base, o200k_base) tokenize whitespace characters individually or in small groups, so every unnecessary whitespace character costs at minimum a fraction of a token.

**What it never touches**: Indentation within code blocks, whitespace inside template variables, whitespace within quoted strings, intentional indentation in structured content (YAML, JSON examples embedded in prompts).

**Typical savings**: 2-8% of total tokens, depending on the prompt's formatting style. Prompts copied from documents or IDEs with generous whitespace see the highest savings.

**Default**: Enabled.

**Example**:
```
Before (42 tokens):
You are a helpful assistant.


   Please answer questions clearly.


   Be thorough in your responses.

After (31 tokens):
You are a helpful assistant.

Please answer questions clearly.

Be thorough in your responses.
```

---

### 5.2 `comment-strip`

**Safety level**: `safe`

**Description**: Removes HTML comments (`<!-- ... -->`), line comments starting with `//` (when not inside code blocks), and hash comments (`# comment` when clearly a comment rather than a markdown header). Also removes `prompt-lint-disable` / `prompt-lint-enable` directives, which are tooling metadata that the LLM does not need to see.

**Why it works**: Comments are human-facing annotations intended for prompt authors and reviewers. LLMs process them as regular text, consuming tokens for content that provides no instruction value. In production deployments, comments should be stripped just as source code comments are stripped in minified JavaScript.

**What it never touches**: Markdown headers (lines starting with `# ` followed by title text), content within code blocks, XML tags (which look similar to HTML comments but are structural).

**Typical savings**: 0-5% of total tokens. Prompts with extensive inline documentation see the highest savings. Prompts with no comments see zero savings.

**Default**: Enabled.

**Example**:
```
Before:
<!-- This prompt handles customer support queries -->
You are a customer support agent.
<!-- TODO: Add error handling instructions -->
<!-- prompt-lint-disable vague-instruction -->
Answer questions about our products.

After:
You are a customer support agent.
Answer questions about our products.
```

---

### 5.3 `filler-words`

**Safety level**: `moderate`

**Description**: Removes filler words and phrases that add politeness, hedging, or emphasis but do not change LLM behavior. The removal is context-sensitive: filler words are only removed from instructional sentences, not from example text, quoted strings, or output format specifications.

**Why it works**: Empirical testing across GPT-4, Claude, Gemini, and open-source models consistently shows that "Please analyze the code" and "Analyze the code" produce identical outputs. LLMs are not sentient and do not respond to social politeness cues. Hedging words like "just" and "simply" add no specificity. Emphasis phrases like "it is important that" and "make sure to" do not increase compliance -- the instruction itself determines compliance. These words waste tokens at scale.

**What it never touches**: Filler words inside quoted strings, code blocks, template variables, or few-shot example content. Filler words in sentences containing negation ("Please do not include personal data") -- the sentence is left entirely intact to avoid any risk of disrupting the negation. Filler words that are part of a larger meaningful phrase (e.g., "just-in-time" is not simplified by removing "just").

**Complete filler word and phrase list**:

| Filler Word/Phrase | Action | Example |
|---|---|---|
| `please` | Remove | "Please analyze" -> "Analyze" |
| `kindly` | Remove | "Kindly provide" -> "Provide" |
| `just` | Remove (when adverb) | "Just return the result" -> "Return the result" |
| `simply` | Remove | "Simply list the items" -> "List the items" |
| `basically` | Remove | "Basically, summarize" -> "Summarize" |
| `actually` | Remove | "Actually, generate" -> "Generate" |
| `I would like you to` | Remove | "I would like you to analyze" -> "Analyze" |
| `Could you please` | Remove | "Could you please list" -> "List" |
| `Can you` | Remove (at sentence start) | "Can you summarize" -> "Summarize" |
| `Would you` | Remove (at sentence start) | "Would you provide" -> "Provide" |
| `I want you to` | Remove | "I want you to write" -> "Write" |
| `I need you to` | Remove | "I need you to extract" -> "Extract" |
| `It is important that you` | Remove | "It is important that you verify" -> "Verify" |
| `Make sure to` | Remove | "Make sure to validate" -> "Validate" |
| `Make sure that` | Remove | "Make sure that the output" -> "The output" |
| `Be sure to` | Remove | "Be sure to include" -> "Include" |
| `Remember to` | Remove | "Remember to check" -> "Check" |
| `Don't forget to` | Replace with directive | "Don't forget to validate" -> "Validate" |
| `Thank you` | Remove (entire sentence) | "Thank you for your help." -> (removed) |
| `Thanks in advance` | Remove (entire sentence) | "Thanks in advance." -> (removed) |
| `Note that` | Remove | "Note that the input" -> "The input" |
| `Please note that` | Remove | "Please note that all" -> "All" |
| `Keep in mind that` | Remove | "Keep in mind that users" -> "Users" |
| `It should be noted that` | Remove | "It should be noted that" -> (removed, next word capitalized) |
| `As a reminder` | Remove | "As a reminder, always" -> "Always" |
| `I'd appreciate if you` | Remove | "I'd appreciate if you could list" -> "List" |
| `If you could` | Remove | "If you could provide" -> "Provide" |
| `Would you mind` | Remove | "Would you mind checking" -> "Check" |

**Typical savings**: 3-12% of total tokens. Prompts written in a conversational, polite style see the highest savings. Prompts already written in a terse, imperative style see minimal savings.

**Default**: Enabled (at `moderate` level).

**Example**:
```
Before (68 tokens):
I would like you to please analyze the following code carefully.
Could you please make sure to check for any bugs or issues?
It is important that you provide a detailed explanation.
Thank you for your help.

After (32 tokens):
Analyze the following code carefully.
Check for any bugs or issues.
Provide a detailed explanation.
```

---

### 5.4 `verbose-phrases`

**Safety level**: `moderate`

**Description**: Replaces verbose multi-word phrases with shorter equivalents that have identical meaning. Each replacement is drawn from a curated phrase table where the semantic equivalence is unambiguous.

**Why it works**: English is full of multi-word phrases that can be replaced with a single word without any loss of meaning. "In order to" means exactly "to". "Due to the fact that" means exactly "because". "At this point in time" means exactly "now". These substitutions are not simplifications or approximations -- they are exact semantic equivalences that happen to use fewer tokens.

**What it never touches**: Phrases inside quoted strings, code blocks, template variables, or few-shot example content. Phrases where the replacement would create ambiguity in the specific context (detected by simple adjacency heuristics).

**Complete phrase replacement table**:

| Verbose Phrase | Replacement | Token Savings |
|---|---|---|
| `in order to` | `to` | ~3 tokens |
| `due to the fact that` | `because` | ~5 tokens |
| `for the purpose of` | `to` / `for` | ~3 tokens |
| `in the event that` | `if` | ~4 tokens |
| `at this point in time` | `now` | ~5 tokens |
| `at the present time` | `now` | ~4 tokens |
| `in the near future` | `soon` | ~3 tokens |
| `in light of the fact that` | `because` / `since` | ~6 tokens |
| `on the basis of` | `based on` | ~2 tokens |
| `with regard to` | `regarding` / `about` | ~2 tokens |
| `with respect to` | `regarding` | ~2 tokens |
| `in reference to` | `regarding` / `about` | ~2 tokens |
| `in relation to` | `regarding` | ~2 tokens |
| `pertaining to` | `about` / `regarding` | ~1 token |
| `in spite of the fact that` | `although` / `despite` | ~5 tokens |
| `regardless of the fact that` | `although` | ~4 tokens |
| `by means of` | `by` / `using` | ~2 tokens |
| `in a manner that` | `so that` | ~2 tokens |
| `for the reason that` | `because` | ~3 tokens |
| `in accordance with` | `per` / `following` | ~2 tokens |
| `with the exception of` | `except` | ~3 tokens |
| `in the absence of` | `without` | ~3 tokens |
| `a large number of` | `many` | ~4 tokens |
| `a majority of` | `most` | ~2 tokens |
| `a sufficient amount of` | `enough` | ~3 tokens |
| `has the ability to` | `can` | ~4 tokens |
| `is able to` | `can` | ~2 tokens |
| `is unable to` | `cannot` | ~2 tokens |
| `has the capacity to` | `can` | ~3 tokens |
| `it is necessary that` | `must` | ~3 tokens |
| `it is essential that` | `must` | ~3 tokens |
| `it is recommended that` | `should` | ~3 tokens |
| `it is possible that` | `may` / `might` | ~3 tokens |
| `in the case of` | `for` / `if` | ~3 tokens |
| `on a regular basis` | `regularly` | ~3 tokens |
| `at all times` | `always` | ~2 tokens |
| `each and every` | `every` | ~2 tokens |
| `first and foremost` | `first` | ~2 tokens |
| `one and only` | `only` | ~2 tokens |
| `basic and fundamental` | `basic` | ~2 tokens |
| `any and all` | `all` | ~2 tokens |
| `completely and totally` | `completely` | ~2 tokens |
| `as a result of` | `because of` / `from` | ~2 tokens |
| `take into consideration` | `consider` | ~2 tokens |
| `take into account` | `consider` | ~2 tokens |
| `give consideration to` | `consider` | ~2 tokens |
| `make a decision` | `decide` | ~2 tokens |
| `come to a conclusion` | `conclude` | ~3 tokens |
| `reach a determination` | `determine` | ~2 tokens |
| `conduct an analysis` | `analyze` | ~2 tokens |
| `perform an evaluation` | `evaluate` | ~2 tokens |
| `provide a description` | `describe` | ~2 tokens |
| `make an attempt` | `try` | ~2 tokens |
| `in the context of` | `in` / `for` | ~3 tokens |

**Typical savings**: 2-8% of total tokens. Prompts written in formal or academic prose see the highest savings. Prompts already using concise language see minimal savings.

**Default**: Enabled (at `moderate` level).

**Example**:
```
Before (41 tokens):
In order to provide a response, take into consideration the context.
Due to the fact that the user may provide incomplete information,
it is necessary that you ask clarifying questions.

After (24 tokens):
To provide a response, consider the context.
Because the user may provide incomplete information,
you must ask clarifying questions.
```

---

### 5.5 `preamble-strip`

**Safety level**: `moderate`

**Description**: Removes generic preamble sentences that establish the AI's identity in ways that do not affect behavior. These are sentences at the beginning of system prompts that restate what the model already knows about itself without adding specific behavioral constraints.

**Why it works**: Sentences like "You are an AI language model" and "You are a large language model trained by OpenAI" add zero behavioral information. The model already knows what it is. What matters is the specific role, constraints, and instructions -- not a restatement of the model's nature. However, specific role definitions ("You are a senior Python developer specializing in data pipelines") are preserved because they prime domain-specific behavior.

**What it never touches**: Role definitions with specific expertise, domain, or persona descriptions. Any preamble sentence that contains constraints, behavioral instructions, or domain-specific language. Preamble sentences that are part of a larger paragraph with meaningful content.

**Detected preamble patterns**:

| Pattern | Action |
|---|---|
| `You are an AI assistant` | Remove (unless followed by specific domain/role) |
| `You are a large language model` | Remove |
| `You are a helpful AI` | Remove (unless followed by specific constraints) |
| `You are an AI language model` | Remove |
| `As an AI assistant` | Remove |
| `As a language model` | Remove |
| `I am an AI assistant` | Remove |
| `You are ChatGPT` / `You are GPT-4` | Remove (model-specific identity) |
| `You are designed to` + generic | Remove if followed by generic behavior ("help users", "assist") |
| `Your goal is to` + generic | Remove if followed by generic behavior ("be helpful", "assist users") |
| `Your purpose is to` + generic | Remove if followed by generic behavior |

**What is preserved**:
- `You are a senior Python developer specializing in data pipeline optimization.` -- Specific role.
- `You are a customer support agent for ACME Corp.` -- Specific organizational context.
- `You are a medical coding assistant that follows ICD-10 standards.` -- Domain-specific constraint.

**Typical savings**: 1-5% of total tokens. Prompts with verbose AI identity preambles see the highest savings.

**Default**: Enabled (at `moderate` level).

**Example**:
```
Before:
You are an AI assistant. You are a large language model designed to help users.
Your goal is to be as helpful as possible. You are a code review specialist
who analyzes Python code for bugs, performance issues, and style violations.

After:
You are a code review specialist who analyzes Python code for bugs, performance
issues, and style violations.
```

---

### 5.6 `redundancy-merge`

**Safety level**: `moderate`

**Description**: Detects instructions that say the same thing in different words and merges them into a single instruction. Detection uses normalized comparison: text is lowercased, whitespace-collapsed, filler words removed, and common synonyms mapped to canonical forms. Instructions with a normalized similarity above a configurable threshold (default: 0.85 Jaccard similarity on word sets) are flagged as redundant. The first occurrence is kept; subsequent occurrences are removed.

**Why it works**: Prompt authors frequently restate instructions for emphasis, especially when prompts are edited incrementally over time. "Always respond in JSON format", "Make sure your response is valid JSON", "Your output must be in JSON format", and "Format your response as JSON" all convey the same instruction. The model does not benefit from seeing the same instruction four times -- once is sufficient. Each redundant restatement wastes tokens and creates a maintenance burden (if the format changes, all four must be updated).

**What it never touches**: Instructions that are similar but not semantically identical (e.g., "respond in JSON" vs. "include a JSON schema" -- these are related but different). Instructions in different sections (a constraint in the rules section vs. a reminder in the output section may both say "use JSON" but serve different structural purposes and are preserved). Instructions within few-shot examples.

**Typical savings**: 0-10% of total tokens. Prompts that have grown through incremental editing see the highest savings. Freshly written, well-structured prompts see minimal savings.

**Default**: Enabled (at `moderate` level).

**Example**:
```
Before:
Always respond in JSON format.
Ensure your output is valid JSON.
Your response must be formatted as JSON.
Do not include any text outside the JSON object.
Remember to always use JSON for your response.

After:
Always respond in JSON format.
Do not include any text outside the JSON object.
```

---

### 5.7 `example-trim`

**Safety level**: `aggressive`

**Description**: Shortens verbose few-shot examples while preserving their structural pattern. Specifically: truncates long input values in examples to representative snippets (preserving the first and last few tokens with an ellipsis), removes examples beyond a configurable count (default: 3 -- diminishing returns after the third example for most tasks), and simplifies overly detailed example explanations.

**Why it works**: Few-shot examples are the most token-expensive part of many prompts. A set of 5 examples with full-length inputs can consume 60% of the total prompt tokens. Research on few-shot prompting shows that 2-3 well-chosen examples provide most of the performance benefit; additional examples show diminishing returns. Within examples, the structural pattern (input format -> output format) matters more than the specific content of long inputs.

**What it never touches**: The output portion of examples (the model's expected response). The structural format of examples (input/output labels, delimiters, numbering). Short examples (under a configurable token threshold). Examples in prompts with only 1-2 examples (already minimal).

**Configuration options**:
- `maxExamples` (default: 3): Maximum number of examples to keep. Excess examples are removed starting from the middle (preserving first and last).
- `maxExampleInputLength` (default: 200 characters): Maximum length for example input text. Longer inputs are truncated with `[...]` markers.

**Typical savings**: 5-30% of total tokens when applied. Prompts with many verbose examples see the highest savings.

**Default**: Enabled (at `aggressive` level).

---

### 5.8 `structural-optimize`

**Safety level**: `aggressive`

**Description**: Converts verbose prose instructions into more token-efficient structured formats. Specifically: converts comma-separated lists of requirements into bullet points (shorter due to eliminated conjunctions), converts repetitive sentence patterns into tabular or list formats, and replaces verbose prose section headers with concise equivalents.

**Why it works**: Prose instructions use conjunctions, articles, and transitional phrases to connect related items. A bulleted list eliminates these connective words while preserving the individual items. "You should check for errors, verify the format, validate the schema, and ensure completeness" becomes four bullet points, each starting with the action verb, saving the conjunctions and the framing sentence. Research from Anthropic and OpenAI shows that models follow structured (bulleted/numbered) instructions at least as reliably as prose instructions.

**What it never touches**: Content already in list or structured format. Prose that expresses conditional logic, nuanced relationships, or causation (these are not simple lists and cannot be converted without losing meaning). Content within code blocks or examples.

**Typical savings**: 3-10% of total tokens when applied. Prompts written in long, flowing prose see the highest savings.

**Default**: Enabled (at `aggressive` level).

**Example**:
```
Before:
You should analyze the code for bugs, check for security vulnerabilities,
verify that error handling is present, ensure that all functions have
documentation, and confirm that the code follows the project's style guide.

After:
Analyze the code for:
- Bugs
- Security vulnerabilities
- Missing error handling
- Undocumented functions
- Style guide violations
```

---

### 5.9 `passive-to-active`

**Safety level**: `aggressive`

**Description**: Converts passive voice constructions to active voice where the transformation is unambiguous and the resulting sentence is shorter. Common patterns: "The response should be formatted as JSON" becomes "Format the response as JSON". "Errors should be handled gracefully" becomes "Handle errors gracefully". "The output must be validated" becomes "Validate the output".

**Why it works**: Passive voice instructions use more words than active voice equivalents. "The input should be validated before processing" (8 words) becomes "Validate the input before processing" (5 words). Active voice is also more direct and imperative, which aligns with how LLMs best process instructions -- as direct commands rather than descriptions of what should happen.

**What it never touches**: Passive constructions where the agent matters ("The response is generated by the backend service" -- converting to active would require knowing or specifying the agent). Passive constructions within example text or quoted strings. Sentences where the passive construction is semantically different from any active rephrasing (rare, but detected by checking for agent ambiguity).

**Typical savings**: 1-5% of total tokens when applied. Prompts written in formal or academic style see the highest savings.

**Default**: Enabled (at `aggressive` level).

**Example**:
```
Before:
The code should be analyzed for potential issues.
All errors must be reported in the output.
The response should be formatted as valid JSON.

After:
Analyze the code for potential issues.
Report all errors in the output.
Format the response as valid JSON.
```

---

### 5.10 Pass Summary Table

| Pass ID | Safety Level | Default | Typical Savings | Description |
|---|---|---|---|---|
| `whitespace-normalize` | safe | enabled | 2-8% | Collapse blank lines, trim trailing whitespace |
| `comment-strip` | safe | enabled | 0-5% | Remove HTML/line comments, lint directives |
| `filler-words` | moderate | enabled | 3-12% | Remove polite/filler language |
| `verbose-phrases` | moderate | enabled | 2-8% | Replace wordy phrases with concise equivalents |
| `preamble-strip` | moderate | enabled | 1-5% | Remove generic AI identity preambles |
| `redundancy-merge` | moderate | enabled | 0-10% | Merge near-identical instructions |
| `example-trim` | aggressive | enabled | 5-30% | Shorten verbose few-shot examples |
| `structural-optimize` | aggressive | enabled | 3-10% | Convert prose to structured lists |
| `passive-to-active` | aggressive | enabled | 1-5% | Convert passive to active voice |

**Cumulative savings by safety level**:
- `safe`: 2-10% typical savings
- `moderate`: 8-30% typical savings (includes `safe`)
- `aggressive`: 15-45% typical savings (includes `moderate`)

---

## 6. Safety Levels

### `safe` -- Guaranteed No Semantic Change

**Passes enabled**: `whitespace-normalize`, `comment-strip`.

**Philosophy**: Only modifications that provably do not change the meaning or effectiveness of the prompt. A whitespace token carries no semantic content. An HTML comment is not processed as an instruction by any LLM. These passes can run in fully automated pipelines with no human review. The optimized prompt is semantically identical to the original in every meaningful way.

**Use case**: Automated build pipelines, pre-deploy optimization hooks, environments where prompt changes require formal review and approval.

**Risk**: Zero. No semantic content is modified. The only conceivable edge case is a prompt that embeds meaningful content inside HTML comments for tooling purposes -- but such comments are not processed by LLMs and are therefore still safe to remove from the LLM's perspective.

---

### `moderate` -- Empirically Safe Optimizations

**Passes enabled**: All `safe` passes, plus `filler-words`, `verbose-phrases`, `preamble-strip`, `redundancy-merge`.

**Philosophy**: Modifications that extensive empirical testing shows do not affect LLM output quality. Research across GPT-4, Claude, Gemini, and Llama models consistently demonstrates that removing "please", replacing "in order to" with "to", and eliminating redundant restated instructions produces identical model outputs. These findings are corroborated by Anthropic's own prompt engineering documentation, which explicitly recommends against politeness markers in production prompts.

**Use case**: Production prompt optimization with brief human review of the diff. Development-time optimization. Cost reduction initiatives.

**Risk**: Extremely low. The theoretical risk is that a specific model version has learned to associate filler words with a behavioral mode (e.g., "please" triggers more careful responses). No evidence supports this hypothesis across any major model family, but the risk is non-zero and cannot be proven impossible. Users who want to eliminate this theoretical risk should use `safe` level.

**Negation safety**: The `filler-words` pass skips any sentence containing negation words ("not", "never", "don't", "must not", "do not", "cannot", "shouldn't", "won't", "no"). This means "Please do not include personal data" is left entirely unchanged rather than risking any modification near the critical "do not" directive.

---

### `aggressive` -- Maximum Token Savings

**Passes enabled**: All `moderate` passes, plus `example-trim`, `structural-optimize`, `passive-to-active`.

**Philosophy**: Structural transformations that save significant tokens but may subtly affect how the model interprets emphasis, priority, or style. Converting a prose paragraph to bullet points preserves the individual instructions but removes the connective language that may have implied priority ordering. Trimming examples preserves the structural pattern but removes specific content that the model might have used for nuance calibration. These optimizations are valuable but should be reviewed by a human who understands the prompt's intent.

**Use case**: Development-time optimization, cost modeling exercises, preparing prompts for token-budget-constrained deployments.

**Risk**: Low but non-trivial. Structural changes may affect:
- **Emphasis**: Prose implies priority through word order and framing; bullet lists present items as equal weight.
- **Nuance**: Verbose examples may demonstrate edge cases that shorter examples miss.
- **Voice**: Passive-to-active conversion changes the tone from descriptive to imperative, which may affect how some models weight the instruction.

Always review the diff before deploying an aggressively optimized prompt to production.

---

## 7. API Surface

### Installation

```bash
npm install prompt-optimize
```

### No Runtime Dependencies

`prompt-optimize` has zero runtime dependencies. All functionality is implemented using Node.js built-in modules. Token counting uses a built-in approximation by default.

### Optional Peer Dependencies

For accurate token counting, install one of:

```bash
# OpenAI-compatible tokenizer (recommended)
npm install js-tiktoken

# Alternative: faster, more feature-complete
npm install gpt-tokenizer
```

`prompt-optimize` auto-detects installed tokenizers and uses them when available.

### Main Export: `optimize`

The primary API. Accepts prompt text and options, applies the configured optimization passes, and returns the optimized text with a detailed report.

```typescript
import { optimize } from 'prompt-optimize';

const result = optimize(
  'I would like you to please analyze the following code. Make sure to check for bugs. It is important that you provide detailed feedback. Thank you.',
  { safety: 'moderate' },
);

console.log(result.optimized);
// "Analyze the following code. Check for bugs. Provide detailed feedback."

console.log(result.report.savings.percentage);
// 48.3

console.log(result.report.savings.tokensBefore);
// 29

console.log(result.report.savings.tokensAfter);
// 15
```

### Analysis Export: `analyze`

Previews optimization opportunities without modifying the prompt. Returns the same report structure as `optimize` but without the optimized text. Useful for auditing, cost estimation, and CI/CD budget checks.

```typescript
import { analyze } from 'prompt-optimize';

const report = analyze(
  'Please kindly analyze the following code. In order to provide a thorough review, make sure to carefully check for any and all potential bugs.',
  { safety: 'moderate' },
);

console.log(report.savings.percentage);    // 38.2
console.log(report.savings.estimatedCostSavingsPerMillion);
// { 'gpt-4o': '$0.000952', 'claude-sonnet': '$0.001143' }

console.log(report.passes);
// [
//   { id: 'filler-words', tokensSaved: 6, changes: [...] },
//   { id: 'verbose-phrases', tokensSaved: 3, changes: [...] },
// ]
```

### Factory Export: `createOptimizer`

Creates a configured optimizer instance with preset options. Useful when optimizing multiple prompts with the same configuration.

```typescript
import { createOptimizer } from 'prompt-optimize';

const optimizer = createOptimizer({
  safety: 'moderate',
  passes: {
    'preamble-strip': false,     // disable this pass
    'redundancy-merge': { threshold: 0.90 },  // configure pass options
  },
  tokenizer: 'cl100k_base',     // use specific encoding
  pricing: {
    inputPerMillion: 3.00,       // $/MTok for cost estimation
  },
});

const result1 = optimizer.optimize(prompt1);
const result2 = optimizer.optimize(prompt2);
const report3 = optimizer.analyze(prompt3);
```

### Type Definitions

```typescript
// ── Input Types ─────────────────────────────────────────────────────

/**
 * Prompt content to optimize. Accepts multiple formats.
 */
type PromptInput =
  | string                        // Plain text prompt
  | PromptMessage[]               // OpenAI-style message array
  | AnthropicPrompt               // Anthropic-style prompt object
  | { file: string };             // Read from file path

/** A single message in a message array. */
interface PromptMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
}

/** Anthropic-style prompt with separate system field. */
interface AnthropicPrompt {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ── Options ─────────────────────────────────────────────────────────

/** Safety level controlling which optimization passes are allowed. */
type SafetyLevel = 'safe' | 'moderate' | 'aggressive';

/** Configuration for a single optimization pass. */
interface PassConfig {
  /** Whether this pass is enabled. Default: follows safety level. */
  enabled?: boolean;

  /** Pass-specific options. */
  options?: Record<string, unknown>;
}

/** Complete optimization options. */
interface OptimizeOptions {
  /**
   * Safety level. Controls which optimization passes are applied.
   * Default: 'moderate'.
   */
  safety?: SafetyLevel;

  /**
   * Per-pass configuration overrides.
   * Keys are pass IDs. Values are booleans (enable/disable) or
   * PassConfig objects with options.
   */
  passes?: Record<string, boolean | PassConfig>;

  /**
   * Tokenizer encoding to use for token counting.
   * - 'approximate': built-in chars/4 heuristic (default).
   * - 'cl100k_base': GPT-4, GPT-4o encoding (requires js-tiktoken or gpt-tokenizer).
   * - 'o200k_base': GPT-4o optimized encoding (requires js-tiktoken or gpt-tokenizer).
   * Default: 'approximate'. Falls back to 'approximate' if the specified
   * encoding's library is not installed.
   */
  tokenizer?: 'approximate' | 'cl100k_base' | 'o200k_base';

  /**
   * Pricing configuration for cost savings estimation.
   * Default: GPT-4o pricing ($2.50/MTok input).
   */
  pricing?: PricingConfig;

  /**
   * Custom optimization passes to register.
   * Run after built-in passes, in array order.
   */
  customPasses?: CustomPassDefinition[];

  /**
   * Protected patterns: additional regex patterns to never modify.
   * Added to the built-in protected regions (variables, code blocks, etc.).
   */
  protectedPatterns?: RegExp[];
}

/** Pricing configuration for cost estimation. */
interface PricingConfig {
  /** Cost per million input tokens in dollars. Default: 2.50 (GPT-4o). */
  inputPerMillion?: number;

  /** Model name for display in reports. Default: 'gpt-4o'. */
  modelName?: string;

  /**
   * Additional model pricings for multi-model comparison.
   * Each entry generates a separate cost savings line in the report.
   */
  additionalModels?: Array<{
    name: string;
    inputPerMillion: number;
  }>;
}

// ── Result Types ────────────────────────────────────────────────────

/** The result of an optimize() call. */
interface OptimizationResult {
  /** The optimized prompt text. */
  optimized: string;

  /** The original prompt text (for comparison). */
  original: string;

  /** Detailed optimization report. */
  report: OptimizationReport;
}

/** The result of an analyze() call. Same as report from optimize(). */
interface OptimizationReport {
  /** ISO 8601 timestamp of when the analysis was performed. */
  timestamp: string;

  /** Total wall-clock time for the optimization, in milliseconds. */
  durationMs: number;

  /** The safety level used. */
  safetyLevel: SafetyLevel;

  /** Token savings summary. */
  savings: TokenSavings;

  /** Per-pass breakdown of what each pass saved. */
  passes: PassResult[];

  /** The tokenizer encoding used for counting. */
  tokenizerUsed: string;

  /**
   * Diff of changes in unified diff format.
   * Each entry describes a specific text change.
   */
  changes: ChangeEntry[];
}

/** Token savings summary. */
interface TokenSavings {
  /** Character count before optimization. */
  charactersBefore: number;

  /** Character count after optimization. */
  charactersAfter: number;

  /** Estimated token count before optimization. */
  tokensBefore: number;

  /** Estimated token count after optimization. */
  tokensAfter: number;

  /** Tokens saved. */
  tokensSaved: number;

  /** Percentage of tokens saved (0-100). */
  percentage: number;

  /**
   * Estimated cost savings per million API calls.
   * Keyed by model name.
   */
  estimatedCostSavingsPerMillion: Record<string, string>;
}

/** Result of a single optimization pass. */
interface PassResult {
  /** The pass ID. */
  id: string;

  /** Human-readable name of the pass. */
  name: string;

  /** The safety level of this pass. */
  safetyLevel: SafetyLevel;

  /** Whether this pass was applied. */
  applied: boolean;

  /** Why this pass was skipped, if applicable. */
  skipReason?: string;

  /** Number of tokens saved by this pass. */
  tokensSaved: number;

  /** Number of individual changes made. */
  changeCount: number;

  /** Time taken by this pass, in milliseconds. */
  durationMs: number;
}

/** A single text change made during optimization. */
interface ChangeEntry {
  /** The pass that made this change. */
  passId: string;

  /** The original text that was changed. */
  original: string;

  /** The replacement text (empty string for removals). */
  replacement: string;

  /** Character offset in the original text. */
  offset: number;

  /** Line number in the original text (1-based). */
  line: number;

  /** Column number in the original text (1-based). */
  column: number;
}

// ── Optimizer Instance ──────────────────────────────────────────────

/** A configured optimizer instance created by createOptimizer(). */
interface Optimizer {
  /** Optimize a prompt using this instance's configuration. */
  optimize(input: PromptInput): OptimizationResult;

  /** Analyze a prompt using this instance's configuration. */
  analyze(input: PromptInput): OptimizationReport;
}

// ── Custom Pass ─────────────────────────────────────────────────────

/** Definition for a custom optimization pass. */
interface CustomPassDefinition {
  /** Unique pass ID. Must not conflict with built-in pass IDs. */
  id: string;

  /** Human-readable pass name. */
  name: string;

  /** Safety level for this pass. */
  safetyLevel: SafetyLevel;

  /** Human-readable description. */
  description: string;

  /**
   * The optimization function. Receives the current text and a context
   * object, returns the modified text.
   */
  transform: (text: string, context: PassContext) => string;
}

/** Context object provided to custom pass transform functions. */
interface PassContext {
  /** Protected regions in the text that must not be modified. */
  protectedRegions: Array<{ start: number; end: number }>;

  /** Check if a character offset falls within a protected region. */
  isProtected(offset: number): boolean;

  /** Count tokens for a given text string. */
  countTokens(text: string): number;

  /** The original (pre-optimization) prompt text. */
  originalText: string;

  /** The safety level in effect. */
  safetyLevel: SafetyLevel;
}
```

### Example: Optimize a Message Array

```typescript
import { optimize } from 'prompt-optimize';

const result = optimize(
  [
    {
      role: 'system',
      content: `You are an AI assistant. You are a helpful AI language model.
        I would like you to please analyze code for bugs.
        Make sure to check for security issues.
        It is important that you provide detailed feedback.
        Please make sure to format your response as JSON.
        Kindly ensure that your output is valid JSON.
        Thank you for your assistance.`,
    },
    {
      role: 'user',
      content: '{{code}}',
    },
  ],
  { safety: 'moderate' },
);

// result.optimized is the message array with optimized system content
// result.report.savings.percentage shows total savings
```

### Example: Analyze with Multi-Model Pricing

```typescript
import { analyze } from 'prompt-optimize';

const report = analyze(
  { file: './prompts/system-prompt.md' },
  {
    safety: 'aggressive',
    pricing: {
      inputPerMillion: 2.50,
      modelName: 'gpt-4o',
      additionalModels: [
        { name: 'claude-sonnet-4.5', inputPerMillion: 3.00 },
        { name: 'gpt-5-mini', inputPerMillion: 0.25 },
        { name: 'claude-haiku-4.5', inputPerMillion: 1.00 },
      ],
    },
  },
);

// report.savings.estimatedCostSavingsPerMillion:
// {
//   'gpt-4o': '$0.38',
//   'claude-sonnet-4.5': '$0.45',
//   'gpt-5-mini': '$0.04',
//   'claude-haiku-4.5': '$0.15',
// }
```

---

## 8. Optimization Report

### Report Structure

The optimization report provides complete transparency into what was changed and why. Every optimization is auditable.

### Token Savings Summary

The top-level savings summary answers the primary question: "How much did we save?"

- **Characters before/after**: Raw character count change. Useful for quick sanity checks.
- **Tokens before/after**: Estimated or exact token count change, depending on the configured tokenizer.
- **Tokens saved**: Absolute number of tokens removed.
- **Percentage savings**: `(tokensSaved / tokensBefore) * 100`. The headline metric.
- **Cost savings per million calls**: For each configured model pricing, the dollar savings per million API calls. Calculated as `tokensSaved * pricePerToken * 1_000_000`.

### Per-Pass Breakdown

Each optimization pass reports:

- **Pass ID and name**: Which pass ran.
- **Applied**: Whether the pass made any changes (a pass may be enabled but find nothing to optimize).
- **Tokens saved**: How many tokens this specific pass contributed to the total savings.
- **Change count**: How many individual text modifications the pass made.
- **Duration**: How many milliseconds the pass took (for performance profiling).
- **Skip reason**: If the pass was disabled (by configuration, safety level, or because the prompt had no applicable patterns), the reason is recorded.

### Change Log

Every individual text modification is recorded as a `ChangeEntry` with:

- The pass that made the change.
- The original text that was replaced.
- The replacement text (empty string for pure removals).
- The location in the original text (offset, line, column).

This enables generating unified diffs for human review and precisely reverting individual changes if needed.

### Estimated Cost Savings

Cost estimation uses the formula:

```
savingsPerCall = tokensSaved * (pricePerToken)
savingsPerMillion = savingsPerCall * 1_000_000
```

Where `pricePerToken = inputPerMillion / 1_000_000`.

Multiple model pricings can be configured for side-by-side comparison, answering questions like "How much do we save on GPT-4o vs. Claude Sonnet vs. the budget model?"

---

## 9. CLI Interface

### Installation and Invocation

```bash
# Global install
npm install -g prompt-optimize
prompt-optimize ./prompts/system-prompt.md

# npx (no install)
npx prompt-optimize ./prompts/system-prompt.md

# Package script
# package.json: { "scripts": { "optimize:prompts": "prompt-optimize ./prompts/" } }
npm run optimize:prompts
```

### CLI Binary Name

`prompt-optimize`

### Commands and Flags

```
prompt-optimize [files/globs...] [options]

Positional arguments:
  files/globs              One or more file paths or glob patterns to optimize.
                           Examples: ./system-prompt.md, ./prompts/**/*.md
                           If no files specified, reads from stdin.

Mode options:
  --analyze                Report optimization opportunities without modifying.
                           Prints savings summary and per-pass breakdown.
  --diff                   Show a unified diff of changes without modifying
                           the source file. Default mode when no --in-place.
  --in-place               Apply optimizations and write back to the source
                           file. Requires explicit opt-in.

Safety options:
  --safety <level>         Safety level. Values: safe, moderate, aggressive.
                           Default: moderate.
  --pass <id:enabled>      Enable or disable a specific pass (repeatable).
                           Example: --pass preamble-strip:false
                           Example: --pass example-trim:true

Token counting options:
  --tokenizer <enc>        Tokenizer encoding. Values: approximate,
                           cl100k_base, o200k_base. Default: approximate.
  --model <name>           Shorthand for tokenizer + pricing. Values:
                           gpt-4o, gpt-5-mini, claude-sonnet, claude-haiku.
                           Sets both the tokenizer encoding and pricing.

Cost estimation options:
  --price <dollars>        Input token price in $/MTok for cost estimation.
                           Default: 2.50 (GPT-4o).
  --calls <number>         Number of API calls for cost projection.
                           Default: 1000000 (1 million).

Output options:
  --format <format>        Output format. Values: human, json.
                           Default: human.
  --quiet                  Suppress all output except the optimized text.
                           Useful for piping: prompt-optimize --quiet < in > out
  --no-color               Disable colored output.

Input options:
  --stdin                  Read prompt text from stdin instead of files.

Configuration:
  --config <path>          Path to a configuration file.
                           Default: auto-detect .prompt-optimize.json in
                           the current directory or ancestors.

General:
  --version                Print version and exit.
  --help                   Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. Optimization completed (or analysis found optimization opportunities). |
| `1` | No changes. The prompt is already optimally compressed at the specified safety level. |
| `2` | Configuration error. Invalid flags, no input files, invalid config, or file read failure. |

### Human-Readable Output Example

```
$ prompt-optimize ./prompts/system-prompt.md --safety moderate

  prompt-optimize v0.1.0

  File: ./prompts/system-prompt.md
  Safety: moderate
  Tokenizer: approximate

  ── Savings Summary ──────────────────────────────────────────────

  Before:  847 characters, ~212 tokens
  After:   591 characters, ~148 tokens
  Saved:   256 characters, ~64 tokens (30.2%)

  Estimated cost savings per 1M calls:
    gpt-4o ($2.50/MTok):          $0.16
    claude-sonnet ($3.00/MTok):   $0.19

  ── Per-Pass Breakdown ───────────────────────────────────────────

  PASS  whitespace-normalize     8 tokens saved    (3.8%)   4 changes
  PASS  comment-strip            5 tokens saved    (2.4%)   2 changes
  PASS  filler-words            22 tokens saved   (10.4%)  11 changes
  PASS  verbose-phrases         14 tokens saved    (6.6%)   6 changes
  PASS  preamble-strip           9 tokens saved    (4.2%)   1 change
  PASS  redundancy-merge         6 tokens saved    (2.8%)   2 changes
  SKIP  example-trim            (safety: aggressive)
  SKIP  structural-optimize     (safety: aggressive)
  SKIP  passive-to-active       (safety: aggressive)

  ── Diff ─────────────────────────────────────────────────────────

  --- original
  +++ optimized
  @@ -1,4 +1,2 @@
  -<!-- Customer support prompt v2.3 -->
  -You are an AI assistant. You are a helpful, friendly AI.
  -I would like you to please answer customer questions about our products.
  +You are a customer support agent.
  +Answer customer questions about our products.
  @@ -6,3 +4,1 @@
  -Make sure to always respond in a friendly, professional manner.
  -It is important that you always be professional and friendly.
  +Respond in a friendly, professional manner.

  ─────────────────────────────────────────────────────────────────
  64 tokens saved (30.2%) across 6 passes
  Analyzed in 3ms
```

### JSON Output Example

```bash
$ prompt-optimize ./prompts/system-prompt.md --format json --safety moderate
```

Outputs the `OptimizationResult` object as a JSON string to stdout, including the optimized text, original text, and the full `OptimizationReport`.

### Stdin/Stdout Pipeline

```bash
# Pipe in, pipe out
echo "I would like you to please analyze this." | prompt-optimize --stdin --quiet
# Output: "Analyze this."

# Chain with other tools
cat prompt.md | prompt-optimize --stdin --quiet | prompt-lint --stdin
```

### Environment Variables

| Environment Variable | Equivalent Flag |
|---------------------|-----------------|
| `PROMPT_OPTIMIZE_SAFETY` | `--safety` |
| `PROMPT_OPTIMIZE_TOKENIZER` | `--tokenizer` |
| `PROMPT_OPTIMIZE_FORMAT` | `--format` |
| `PROMPT_OPTIMIZE_CONFIG` | `--config` |

---

## 10. Token Counting

### Built-in Approximate Counting

The default token counter uses the `Math.ceil(text.length / 4)` heuristic. This approximation is based on the empirical observation that BPE tokenizers (cl100k_base, o200k_base) produce roughly 1 token per 4 characters for typical English text. The heuristic is:

- Accurate to within 10-15% for standard English prose.
- Less accurate for code, URLs, non-English text, and text with many special characters (which tokenize less efficiently).
- Zero-dependency: no tokenizer library needed.
- Instant: no encoding table loading, no WASM initialization.

This is sufficient for relative comparisons (before/after percentages) even when absolute counts are imprecise.

### Accurate Counting with js-tiktoken

When `js-tiktoken` is installed as a peer dependency, `prompt-optimize` uses it for exact token counts:

```bash
npm install js-tiktoken
```

`js-tiktoken` is a pure JavaScript port of OpenAI's tiktoken library. It supports the `cl100k_base` encoding (used by GPT-4, GPT-3.5-turbo) and `o200k_base` encoding (used by GPT-4o and newer models). Pure JavaScript means no WASM compilation, broad runtime compatibility (Node.js, edge runtimes, browsers), and a small bundle size.

### Accurate Counting with gpt-tokenizer

When `gpt-tokenizer` is installed as a peer dependency, `prompt-optimize` uses it as an alternative to `js-tiktoken`:

```bash
npm install gpt-tokenizer
```

`gpt-tokenizer` is the most feature-complete open-source GPT tokenizer on npm. It supports all current OpenAI encodings (`r50k_base`, `p50k_base`, `p50k_edit`, `cl100k_base`, `o200k_base`, `o200k_harmony`), loads and works synchronously, and is the fastest JavaScript tokenizer implementation available. It offers model-specific convenience functions and supports streaming tokenization.

### Tokenizer Auto-Detection

`prompt-optimize` auto-detects installed tokenizer libraries at import time:

1. If `gpt-tokenizer` is available, use it (fastest, most encodings).
2. Else if `js-tiktoken` is available, use it (pure JS, widely compatible).
3. Else fall back to the built-in approximate counter.

The `--tokenizer` flag or `tokenizer` option overrides auto-detection. If a specific encoding is requested but the required library is not installed, `prompt-optimize` logs a warning and falls back to approximate counting.

### Multi-Model Counting

When accurate counting is available, `prompt-optimize` can report savings for multiple model encodings simultaneously. This matters because different models tokenize the same text differently:

- `cl100k_base` (GPT-4, GPT-3.5): broadly used, well-understood behavior.
- `o200k_base` (GPT-4o, newer models): 200K vocabulary, more efficient on code and structured text.
- Claude models: use a proprietary tokenizer. `prompt-optimize` approximates Claude token counts using `cl100k_base`, which is typically within 5% for English text.

---

## 11. Configuration

### Configuration File

`prompt-optimize` searches for a configuration file in the current directory and ancestor directories, using the first one found:

1. `.prompt-optimize.json`
2. `.prompt-optimizerc` (JSON format)
3. `prompt-optimize` key in `package.json`

The `--config` flag overrides auto-detection.

### Configuration File Format

```json
{
  "safety": "moderate",
  "tokenizer": "cl100k_base",
  "passes": {
    "preamble-strip": false,
    "redundancy-merge": {
      "enabled": true,
      "options": {
        "threshold": 0.90
      }
    },
    "example-trim": {
      "enabled": true,
      "options": {
        "maxExamples": 2,
        "maxExampleInputLength": 150
      }
    }
  },
  "pricing": {
    "inputPerMillion": 3.00,
    "modelName": "claude-sonnet-4.5",
    "additionalModels": [
      { "name": "gpt-4o", "inputPerMillion": 2.50 },
      { "name": "gpt-5-mini", "inputPerMillion": 0.25 }
    ]
  },
  "protectedPatterns": [
    "ACME\\s+Corp",
    "\\{\\{.*?\\}\\}"
  ]
}
```

### Configuration Precedence

Configuration is resolved in this order (later sources override earlier):

1. Built-in defaults (safety: `moderate`, tokenizer: `approximate`, all passes enabled at their safety level).
2. Configuration file (`.prompt-optimize.json` or equivalent).
3. CLI flags (`--safety`, `--pass`, `--tokenizer`).
4. Programmatic options in `OptimizeOptions`.

### Per-Pass Configuration

Individual passes can be enabled, disabled, or configured with pass-specific options:

```json
{
  "passes": {
    "filler-words": true,
    "preamble-strip": false,
    "redundancy-merge": {
      "enabled": true,
      "options": {
        "threshold": 0.90
      }
    },
    "example-trim": {
      "enabled": true,
      "options": {
        "maxExamples": 2,
        "maxExampleInputLength": 150
      }
    }
  }
}
```

Shorthand: `"pass-id": true` enables, `"pass-id": false` disables.

### Custom Phrase Table

The `verbose-phrases` pass can be extended with custom phrase replacements:

```json
{
  "passes": {
    "verbose-phrases": {
      "enabled": true,
      "options": {
        "customPhrases": {
          "in my professional opinion": "I believe",
          "at the end of the day": "ultimately",
          "the fact of the matter is": ""
        }
      }
    }
  }
}
```

### Custom Filler Words

The `filler-words` pass can be extended with custom filler words:

```json
{
  "passes": {
    "filler-words": {
      "enabled": true,
      "options": {
        "customFillers": ["essentially", "literally", "honestly"]
      }
    }
  }
}
```

---

## 12. Custom Optimization Passes

### Defining a Custom Pass

Custom passes implement the `CustomPassDefinition` interface:

```typescript
import { optimize } from 'prompt-optimize';

const removeAsciiArt: CustomPassDefinition = {
  id: 'remove-ascii-art',
  name: 'ASCII Art Removal',
  safetyLevel: 'safe',
  description: 'Removes decorative ASCII art borders and separators.',
  transform: (text, context) => {
    // Remove lines that are purely decorative characters
    return text.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (context.isProtected(text.indexOf(line))) return true;
        // Remove lines that are only repeated special characters
        return !/^[=\-*_~#]{4,}$/.test(trimmed);
      })
      .join('\n');
  },
};

const result = optimize(myPrompt, {
  safety: 'moderate',
  customPasses: [removeAsciiArt],
});
```

### Pass Execution Order

Custom passes run after all built-in passes, in the order they appear in the `customPasses` array. Each custom pass receives the output of the previous pass (including all built-in passes).

### Pass Context

The `PassContext` object provides custom passes with:

- **`protectedRegions`**: Array of `{ start, end }` offset ranges that must not be modified (code blocks, variables, quoted strings, etc.).
- **`isProtected(offset)`**: Check if a specific character offset is in a protected region.
- **`countTokens(text)`**: Count tokens for any text string using the configured tokenizer.
- **`originalText`**: The original, unmodified prompt text (for reference).
- **`safetyLevel`**: The safety level in effect (custom passes may want to self-restrict based on this).

### Registering Custom Passes via Config

```json
{
  "plugins": [
    "./optimization-passes/company-rules.js"
  ]
}
```

Where `company-rules.js` exports an array of `CustomPassDefinition` objects:

```javascript
module.exports = [
  {
    id: 'remove-internal-notes',
    name: 'Internal Notes Removal',
    safetyLevel: 'safe',
    description: 'Removes [INTERNAL] tagged notes.',
    transform: (text, context) => {
      return text.replace(/\[INTERNAL\].*$/gm, '').trim();
    },
  },
];
```

---

## 13. Prompt Format Support

### Plain Text

Any string is accepted as a plain text prompt. All optimization passes operate on the full text. This is the most common format for system prompts stored in code, configuration files, and prompt libraries.

**Supported file extensions**: `.txt`, `.prompt`, `.md`, `.system`, `.promptmd`

### OpenAI Message Array

An array of `{ role, content }` objects following the OpenAI Chat Completions API format. Each message's `content` field is optimized independently. Role fields and message structure are preserved exactly. Template variables in user message content are protected.

```json
[
  { "role": "system", "content": "You are an AI assistant. Please kindly analyze code." },
  { "role": "user", "content": "{{code}}" }
]
```

After optimization (moderate):
```json
[
  { "role": "system", "content": "Analyze code." },
  { "role": "user", "content": "{{code}}" }
]
```

**Supported file extensions**: `.json` (when content matches the message array shape)

### Anthropic Message Format

An object with a top-level `system` string and a `messages` array. The `system` field is optimized. Message content fields are optimized individually.

```json
{
  "system": "You are an AI assistant. I would like you to please help users.",
  "messages": [
    { "role": "user", "content": "{{user_message}}" }
  ]
}
```

### Template Files

Files containing template variables (`{{variable}}`, `{variable}`, `{{ variable }}`). Variables are identified and added to protected regions before optimization begins. The template structure is preserved; only the surrounding instructional text is optimized.

### Multi-File Optimization

When glob patterns are provided to the CLI, each file is optimized independently. The summary report aggregates savings across all files.

```bash
$ prompt-optimize ./prompts/**/*.md --analyze --safety moderate

  Analyzed 12 files:

  FILE                           BEFORE    AFTER   SAVED
  prompts/support.md              212       148     30.2%
  prompts/coding.md               345       276     20.0%
  prompts/writing.md              189       142     24.9%
  ...
  ──────────────────────────────────────────────────────
  TOTAL                          2,847    2,134     25.0%

  Estimated savings per 1M calls (gpt-4o): $1.78
```

---

## 14. Integration

### CI/CD Token Budget Gate

Use `prompt-optimize --analyze` in CI to enforce token budgets:

```yaml
name: Prompt Optimization Check
on: [push, pull_request]

jobs:
  check-prompts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx prompt-optimize ./prompts/**/*.md --analyze --format json > report.json
      - name: Check token budget
        run: |
          node -e "
            const r = require('./report.json');
            const totalTokens = r.savings.tokensAfter;
            if (totalTokens > 500) {
              console.error('Token budget exceeded: ' + totalTokens + ' > 500');
              process.exit(1);
            }
          "
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npx prompt-optimize ./prompts/ --analyze --safety moderate --quiet
```

```json
// package.json with lint-staged
{
  "lint-staged": {
    "prompts/**/*.md": "prompt-optimize --analyze --safety moderate"
  }
}
```

### Integration with prompt-lint

Run `prompt-lint` first to fix quality issues, then `prompt-optimize` to reduce tokens:

```bash
# Fix quality issues
npx prompt-lint ./prompts/system-prompt.md --fix

# Then optimize for token efficiency
npx prompt-optimize ./prompts/system-prompt.md --in-place --safety moderate
```

### Integration with prompt-version

After optimizing, use `prompt-version` to track the change:

```bash
# Optimize
npx prompt-optimize ./prompts/system-prompt.md --in-place --safety moderate

# Version the optimized prompt
npx prompt-version bump ./prompts/system-prompt.md --type patch \
  --message "Optimize: 30% token reduction via moderate compression"
```

### Integration with prompt-diff

Compare the original and optimized prompts semantically:

```bash
# Generate optimized version
npx prompt-optimize ./prompts/system-prompt.md --quiet > /tmp/optimized.md

# Semantic diff
npx prompt-diff ./prompts/system-prompt.md /tmp/optimized.md
```

---

## 15. Testing Strategy

### Unit Tests

Unit tests verify each component in isolation.

- **Pass tests**: For each built-in optimization pass, test with:
  - Input that contains the targeted pattern (expect the pattern to be optimized).
  - Input that does not contain the targeted pattern (expect no changes).
  - Input where the pattern appears inside a protected region (code block, template variable, quoted string) -- expect no changes.
  - Input where the pattern appears in a negation context ("Please do not..." with `filler-words` pass) -- expect no changes to the sentence.
  - Edge cases: pattern at start of text, end of text, spanning multiple lines, adjacent to other patterns.

- **Filler word tests**: For each entry in the filler word list, test removal in isolation and in combination. Test that partial matches are not removed (e.g., "just" in "justice", "simply" in "simplify").

- **Verbose phrase tests**: For each entry in the phrase table, test replacement in isolation. Test case sensitivity. Test that phrases inside code blocks are preserved.

- **Protected region detection tests**: Verify that code blocks (fenced and indented), template variables (all syntaxes), quoted strings (single, double, backtick), URLs, and proper nouns are correctly identified and protected.

- **Token counting tests**: Verify approximate counting against known token counts for sample texts. Verify accurate counting integration when `js-tiktoken` or `gpt-tokenizer` is available.

- **Report generation tests**: Verify that `OptimizationReport` fields are correctly populated: savings calculations, per-pass breakdowns, change entries, cost estimates.

- **Configuration tests**: Verify config file parsing, safety level filtering, per-pass enable/disable, custom phrase tables, and precedence resolution.

- **CLI parsing tests**: Verify argument parsing, environment variable fallback, flag precedence, glob expansion, stdin reading, and error messages for invalid input.

### Semantic Equivalence Tests

Critical tests that verify the optimizer does not change prompt meaning:

- **Negation preservation**: A comprehensive suite of prompts containing "not", "never", "don't", "must not", "do not", "cannot", "no", "shouldn't", "won't" -- verify that every negation word survives optimization at all safety levels.
- **Instruction preservation**: For a set of representative prompts, verify that the optimized prompt produces the same LLM behavior as the original. This is tested by extracting the imperative verbs and their objects from both versions and asserting they match.
- **Protected content preservation**: Verify that code blocks, template variables, URLs, and quoted strings are byte-for-byte identical before and after optimization.

### Integration Tests

Integration tests run the full optimization pipeline against realistic prompt files.

- **Verbose prompt**: Optimize a deliberately verbose system prompt with excessive filler, wordy phrases, redundant instructions, and decorative whitespace. Assert the expected savings percentage and verify the optimized text reads correctly.
- **Already-optimal prompt**: Optimize a well-written, terse prompt. Assert zero or near-zero savings. Assert the text is unchanged.
- **Prompt with protected regions**: Optimize a prompt containing code blocks, template variables, and URLs. Assert all protected content is preserved exactly.
- **Message array format**: Optimize an OpenAI-style message array. Assert the structure is preserved and only content fields are modified.
- **Multi-file**: Run the CLI against a directory of test fixtures. Assert per-file and aggregate savings are reported correctly.
- **Safety level progression**: Optimize the same prompt at `safe`, `moderate`, and `aggressive` levels. Assert that each higher level saves strictly more tokens than the previous.
- **Idempotency**: Optimize a prompt, then optimize the result again. Assert the second optimization produces zero additional changes (the optimizer is idempotent).
- **Round-trip with prompt-lint**: Optimize a prompt, then lint the result. Assert the optimized prompt does not introduce any new lint violations.

### Edge Cases to Test

- Empty prompt (empty string, empty file).
- Prompt containing only whitespace.
- Prompt containing only a code block.
- Prompt containing only template variables.
- Prompt with deeply nested protected regions (code block inside a quoted section inside an example).
- Prompt with every filler word adjacent to every other filler word.
- Prompt exceeding 1 MB (performance test).
- Binary file accidentally passed as input.
- Prompt in a non-English language (filler word removal should not fire; whitespace normalization should still work).
- Prompt with mixed English and non-English content.
- Prompt where removing a filler word would create a grammatically broken sentence.
- Prompt with "do NOT" in various casing: "Do not", "DO NOT", "do NOT", "Don't", "don't".

### Test Framework

Tests use Vitest, matching the project's existing configuration. Test fixtures are stored in `src/__tests__/fixtures/` as static prompt files.

---

## 16. Performance

### Pass Execution

Each optimization pass is a single iteration over the text. Passes use string replacement and regex matching on the full text. For a 10,000-character prompt (~2,500 tokens), a single pass completes in under 1ms. The full pipeline of 9 passes completes in under 5ms.

### Protected Region Detection

Protected regions (code blocks, variables, quoted strings, URLs) are detected once before any pass runs, in a single scan of the text. The resulting region map is a sorted array of `{ start, end }` intervals. The `isProtected(offset)` check uses binary search, completing in O(log n) where n is the number of protected regions.

### Token Counting

- **Approximate**: Instant (`text.length / 4`). No measurable overhead.
- **Accurate (js-tiktoken)**: First call incurs ~50ms for encoding table initialization. Subsequent calls complete in under 1ms for typical prompt lengths. The encoding instance is cached.
- **Accurate (gpt-tokenizer)**: Synchronous loading, ~20ms initialization. Subsequent calls complete in under 0.5ms.

### Memory

The optimizer holds the full source text, protected region map, and per-pass intermediate results. For a 100 KB prompt (very large), the memory footprint is approximately 1 MB. For typical prompts (1-10 KB), memory usage is negligible.

### File I/O

When processing files from disk, each file is read entirely into memory. Files are processed sequentially. For a directory with 100 prompt files averaging 5 KB each, the total optimization time is under 1 second including I/O.

### Startup Time

The CLI imports only the modules needed for the specified operation. Pass modules are loaded lazily (only enabled passes are imported). Cold-start time for `npx prompt-optimize` is dominated by npm/npx overhead.

---

## 17. Dependencies

### Runtime Dependencies

None. `prompt-optimize` has zero runtime dependencies. All functionality is implemented using Node.js built-in modules:

| Node.js Built-in | Purpose |
|---|---|
| `node:fs/promises` | Reading prompt files from disk. |
| `node:path` | File path resolution, extension detection. |
| `node:util` | `parseArgs` for CLI argument parsing (Node.js 18+). |
| `node:process` | Exit codes, stdin reading, environment variables. |

### Why Zero Dependencies

- **No CLI framework**: `node:util.parseArgs` (available since Node.js 18) handles all flag parsing.
- **No tokenizer**: Built-in approximate counting requires no external library. Accurate counting is an optional peer dependency.
- **No diff library**: Diff output is generated by a minimal inline diff implementation that handles the simple case of line-level and word-level changes in prompt text.
- **No NLP library**: All text analysis uses pattern matching, word lists, and regex. No natural language processing models are needed for deterministic heuristic optimization.
- **No chalk/colors**: Terminal coloring uses ANSI escape codes directly. Color detection uses `process.stdout.isTTY` and `NO_COLOR` environment variable.

### Optional Peer Dependencies

| Dependency | Purpose | When Needed |
|---|---|---|
| `js-tiktoken` | Accurate token counting (pure JS) | When `tokenizer: 'cl100k_base'` or `'o200k_base'` is configured |
| `gpt-tokenizer` | Accurate token counting (fast, full-featured) | Alternative to `js-tiktoken` |

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter for the package's own source code. |

---

## 18. File Structure

```
prompt-optimize/
├── package.json
├── tsconfig.json
├── SPEC.md
├── README.md
├── .prompt-optimize.json            # Example config (used for self-testing)
├── src/
│   ├── index.ts                     # Public API exports: optimize, analyze, createOptimizer, types
│   ├── cli.ts                       # CLI entry point: argument parsing, file I/O, formatting, exit codes
│   ├── types.ts                     # All TypeScript type definitions
│   ├── optimizer.ts                 # Core optimize() and analyze() functions: pass pipeline orchestration
│   ├── tokenizer/
│   │   ├── index.ts                 # Tokenizer factory: auto-detect and instantiate
│   │   ├── approximate.ts           # Built-in chars/4 heuristic tokenizer
│   │   └── tiktoken-adapter.ts      # Adapter for js-tiktoken / gpt-tokenizer
│   ├── passes/
│   │   ├── index.ts                 # Pass registry: collects all built-in passes
│   │   ├── pass-runner.ts           # Executes passes in order, collects results
│   │   ├── whitespace-normalize.ts  # Whitespace normalization pass
│   │   ├── comment-strip.ts         # Comment removal pass
│   │   ├── filler-words.ts          # Filler word removal pass
│   │   ├── verbose-phrases.ts       # Verbose phrase compression pass
│   │   ├── preamble-strip.ts        # Preamble removal pass
│   │   ├── redundancy-merge.ts      # Redundancy detection and merging pass
│   │   ├── example-trim.ts          # Example trimming pass
│   │   ├── structural-optimize.ts   # Structural optimization pass
│   │   └── passive-to-active.ts     # Passive to active voice conversion pass
│   ├── protection/
│   │   ├── index.ts                 # Protected region detection entry point
│   │   ├── code-blocks.ts           # Fenced and indented code block detection
│   │   ├── template-variables.ts    # Template variable detection (all syntaxes)
│   │   ├── quoted-strings.ts        # Quoted string detection
│   │   ├── urls.ts                  # URL and path detection
│   │   └── negation.ts             # Negation context detection
│   ├── report/
│   │   ├── index.ts                 # Report generation
│   │   ├── savings.ts               # Token savings calculation
│   │   ├── cost.ts                  # Cost estimation
│   │   └── diff.ts                  # Change diff generation
│   ├── formats/
│   │   ├── index.ts                 # Format detection and dispatch
│   │   ├── plain-text.ts            # Plain text prompt handling
│   │   └── messages.ts              # Message array / Anthropic format handling
│   ├── config/
│   │   ├── index.ts                 # Config file loading and resolution
│   │   └── defaults.ts              # Default configuration values
│   ├── formatters/
│   │   ├── index.ts                 # Formatter factory
│   │   ├── human.ts                 # Human-readable terminal output
│   │   └── json.ts                  # JSON output
│   └── utils/
│       ├── text.ts                  # Text normalization, whitespace utilities
│       ├── patterns.ts              # Shared regex patterns, word lists
│       └── similarity.ts            # Jaccard similarity for redundancy detection
├── src/__tests__/
│   ├── passes/
│   │   ├── whitespace-normalize.test.ts
│   │   ├── comment-strip.test.ts
│   │   ├── filler-words.test.ts
│   │   ├── verbose-phrases.test.ts
│   │   ├── preamble-strip.test.ts
│   │   ├── redundancy-merge.test.ts
│   │   ├── example-trim.test.ts
│   │   ├── structural-optimize.test.ts
│   │   └── passive-to-active.test.ts
│   ├── protection/
│   │   ├── code-blocks.test.ts
│   │   ├── template-variables.test.ts
│   │   ├── quoted-strings.test.ts
│   │   └── negation.test.ts
│   ├── tokenizer/
│   │   ├── approximate.test.ts
│   │   └── tiktoken-adapter.test.ts
│   ├── report/
│   │   ├── savings.test.ts
│   │   └── cost.test.ts
│   ├── config/
│   │   └── config-loading.test.ts
│   ├── optimizer.test.ts            # Integration tests for the full pipeline
│   ├── semantic-equivalence.test.ts # Semantic safety tests
│   ├── cli.test.ts                  # CLI end-to-end tests
│   └── fixtures/
│       ├── prompts/
│       │   ├── verbose-prompt.md        # Many optimization opportunities
│       │   ├── optimal-prompt.md        # Already optimized, expect no changes
│       │   ├── protected-regions.md     # Code blocks, variables, URLs
│       │   ├── negation-heavy.md        # Many "do not" / "never" instructions
│       │   ├── message-array.json       # OpenAI format
│       │   ├── anthropic-format.json    # Anthropic format
│       │   ├── empty.md                 # Empty file
│       │   └── large-prompt.md          # Performance test fixture (50KB+)
│       └── configs/
│           ├── valid-config.json
│           ├── custom-phrases.json
│           └── aggressive-config.json
└── dist/                             # Compiled output (gitignored)
```

---

## 19. Implementation Roadmap

### Phase 1: Core Passes and Pipeline (v0.1.0)

Implement the optimization pipeline with the most impactful and safest passes.

**Deliverables:**
- Protected region detection: code blocks, template variables, quoted strings, URLs, negation contexts.
- Built-in approximate token counter.
- Core passes: `whitespace-normalize`, `comment-strip`, `filler-words`, `verbose-phrases`.
- Safety level system (`safe`, `moderate`, `aggressive`) controlling pass eligibility.
- `optimize()` function returning `OptimizationResult` with optimized text and report.
- `analyze()` function returning `OptimizationReport` without modifying text.
- CLI with file input, `--safety`, `--analyze`, `--diff`, `--format human`, `--format json` flags.
- Configuration file support (`.prompt-optimize.json`).
- Unit tests for all passes, protected region detection, and token counting.
- Integration tests with fixture prompts.
- Semantic equivalence tests for negation preservation.

### Phase 2: Full Pass Set and Accurate Counting (v0.2.0)

Complete the built-in pass set and add accurate token counting.

**Deliverables:**
- Remaining passes: `preamble-strip`, `redundancy-merge`, `example-trim`, `structural-optimize`, `passive-to-active`.
- Optional peer dependency integration for `js-tiktoken` and `gpt-tokenizer`.
- Multi-model cost estimation with configurable pricing.
- `createOptimizer()` factory function.
- `--in-place` CLI flag for modifying files directly.
- `--model` shorthand for tokenizer + pricing selection.
- Custom pass API (`customPasses` option, `PassContext`).
- Custom phrase tables and filler word lists in configuration.
- Plugin loading from config file.
- Environment variable configuration.

### Phase 3: Advanced Features and Ecosystem (v0.3.0)

Add format support, multi-file processing, and ecosystem integration.

**Deliverables:**
- Message array and Anthropic format parsing and optimization.
- Multi-file glob processing with aggregate reports.
- `--stdin` / `--quiet` flags for pipeline integration.
- Pre-commit hook documentation and examples.
- CI/CD integration examples (GitHub Actions, GitLab CI).
- Integration examples with `prompt-lint`, `prompt-version`, and `prompt-diff`.
- Performance optimization for large prompts (streaming pass execution).

### Phase 4: Polish and 1.0 (v1.0.0)

Stabilize the API, complete documentation, and prepare for broad adoption.

**Deliverables:**
- API stability guarantee (semver major version).
- Complete README with usage examples, pass catalog, and configuration guide.
- Comprehensive edge case testing.
- Performance benchmarks published in README.
- Example custom pass packages.
- Published npm package with TypeScript declarations.

---

## 20. Example Use Cases

### 20.1 Developer Optimizing a System Prompt

A developer writes a system prompt for a code review assistant and runs `prompt-optimize` to reduce token waste before deployment.

```bash
$ prompt-optimize ./prompts/code-review.md --safety moderate

  prompt-optimize v0.1.0

  File: ./prompts/code-review.md
  Safety: moderate
  Tokenizer: approximate

  ── Savings Summary ──────────────────────────────────────────────

  Before:  1,204 characters, ~301 tokens
  After:     836 characters, ~209 tokens
  Saved:     368 characters, ~92 tokens (30.6%)

  Estimated cost savings per 1M calls:
    gpt-4o ($2.50/MTok):          $0.23

  ── Diff ─────────────────────────────────────────────────────────

  --- original
  +++ optimized
  @@ -1,5 +1,2 @@
  -<!-- Code review prompt - last updated 2024-12-15 -->
  -You are an AI assistant. You are a helpful AI language model designed
  -to assist developers with code reviews. Your goal is to be as helpful
  -as possible. You are a senior software engineer specializing in Python.
  +You are a senior software engineer specializing in Python.
  @@ -7,8 +4,4 @@
  -I would like you to please carefully review the following code.
  -In order to provide a thorough review, make sure to check for the
  -following issues. It is important that you look for bugs, security
  -vulnerabilities, and performance issues. Please also check for bugs
  -and security issues. Kindly ensure you identify any problems.
  +Review the following code. Check for:
  +- Bugs
  +- Security vulnerabilities
  +- Performance issues
  @@ -16,3 +9,2 @@
  -Please make sure to format your response as valid JSON.
  -Your output must always be in JSON format.
  -Thank you for your assistance.
  +Format your response as valid JSON.

  ─────────────────────────────────────────────────────────────────
  92 tokens saved (30.6%) across 6 passes
  Analyzed in 4ms
```

Before optimization:
```
<!-- Code review prompt - last updated 2024-12-15 -->
You are an AI assistant. You are a helpful AI language model designed
to assist developers with code reviews. Your goal is to be as helpful
as possible. You are a senior software engineer specializing in Python.

I would like you to please carefully review the following code.
In order to provide a thorough review, make sure to check for the
following issues. It is important that you look for bugs, security
vulnerabilities, and performance issues. Please also check for bugs
and security issues. Kindly ensure you identify any problems.

<code>
{{code}}
</code>

Please make sure to format your response as valid JSON.
Your output must always be in JSON format.
Thank you for your assistance.
```

After optimization (moderate):
```
You are a senior software engineer specializing in Python.

Review the following code. Check for bugs, security vulnerabilities, and performance issues.

<code>
{{code}}
</code>

Format your response as valid JSON.
```

### 20.2 CI/CD Token Budget Gate

A GitHub Actions workflow checks that no prompt exceeds a token budget:

```yaml
name: Prompt Token Budget
on: [pull_request]

jobs:
  check-budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Check prompt token budgets
        run: |
          npx prompt-optimize ./prompts/**/*.md \
            --analyze \
            --safety moderate \
            --format json \
            | node -e "
              const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
              const waste = data.savings.percentage;
              if (waste > 20) {
                console.error('Prompt has ' + waste.toFixed(1) + '% optimizable waste (max 20%)');
                process.exit(1);
              }
              console.log('Prompt waste: ' + waste.toFixed(1) + '% (within budget)');
            "
```

### 20.3 Cost Reduction Analysis

An engineer analyzes all prompts across a monorepo to estimate potential savings:

```bash
$ prompt-optimize ./services/*/prompts/**/*.md --analyze --safety moderate \
    --model gpt-4o --calls 5000000

  prompt-optimize v0.1.0

  Analyzed 47 files:

  TOP 5 BY SAVINGS:
  FILE                                     BEFORE  AFTER  SAVED    $/5M calls
  services/support/prompts/main.md           892    614   31.2%    $3.48
  services/billing/prompts/invoice.md        1,204  847   29.7%    $4.46
  services/auth/prompts/verification.md      456    328   28.1%    $1.60
  services/search/prompts/ranking.md         2,103  1,580 24.9%    $6.54
  services/chat/prompts/system.md            678    523   22.9%    $1.94

  AGGREGATE:
  Total tokens before:    18,492
  Total tokens after:     14,186
  Total tokens saved:      4,306 (23.3%)

  Estimated annual savings at 5M calls/day:
    gpt-4o ($2.50/MTok):     $19,665.75
```

### 20.4 Safe Automated Optimization in Build Pipeline

A build script optimizes prompts at the `safe` level with no human review required:

```javascript
// build-prompts.js
const { createOptimizer } = require('prompt-optimize');
const fs = require('fs');
const path = require('path');

const optimizer = createOptimizer({
  safety: 'safe',   // guaranteed no semantic change
  tokenizer: 'approximate',
});

const promptDir = './prompts';
const outputDir = './dist/prompts';

for (const file of fs.readdirSync(promptDir)) {
  if (!file.endsWith('.md')) continue;
  const input = fs.readFileSync(path.join(promptDir, file), 'utf-8');
  const result = optimizer.optimize(input);
  fs.writeFileSync(path.join(outputDir, file), result.optimized);
  console.log(`${file}: ${result.report.savings.percentage.toFixed(1)}% saved`);
}
```

### 20.5 Interactive Development Workflow

A developer uses `prompt-optimize` during prompt authoring to learn concise writing patterns:

```bash
# Write prompt, then check for waste
$ prompt-optimize ./my-prompt.md --diff --safety aggressive

# See the diff, learn from the suggestions
# Manually incorporate the good changes, reject the risky ones
# Result: developer writes more concisely over time
```
