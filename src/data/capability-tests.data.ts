/**
 * Published benchmark results for catalogue models, as reviewable tabular data.
 *
 * Every row is a figure someone actually published, with the source that
 * published it. Nothing here is estimated, interpolated or averaged from
 * neighbouring models — a capability with no credible published result simply has
 * no row, and the interface reports it as estimated rather than measured. That is
 * the whole point: the catalogue's claim to being useful is that it does not
 * invent numbers, and a benchmark table is the easiest place to start inventing.
 *
 * Gathered 18 August 2026. Conflicting reports are BOTH recorded; the resolver in
 * `capability-tests.ts` decides what to do with a disagreement rather than a
 * human quietly picking the flattering one.
 *
 * Columns
 * -------
 *  1  modelId     must exist in the catalogue
 *  2  protocolId  must exist in BENCHMARK_PROTOCOLS
 *  3  rawScore    the figure as published, in the protocol's own units
 *  4  tier        benchmark | independent | provider | aggregator
 *  5  asOf        date the figure was read or published (ISO)
 *  6  sourceName  who published it
 *  7  sourceUrl   where
 *  8  harness     run conditions the source stated, or "not stated"
 *  9  note        caveats; required when the figure is contested or conditional
 *
 * DELIBERATE EXCLUSIONS
 * ---------------------
 * - Xiaomi MiMo: the only published figures are for the base pre-instruction-tuned
 *   checkpoint (GPQA 58.1, AIME 36.9, MMLU-Pro 65.8) or for a "MiMo-V2.5-Pro" SKU
 *   that does not match the catalogue's `mimo-v2-5` entry. Base-checkpoint scores
 *   are not the released model and including them would understate it badly.
 * - Terminal-Bench, all versions: results move 15-20 points with the agent
 *   scaffold rather than the model, so a cross-model table built from them ranks
 *   harnesses. See the note in `benchmarks.ts`.
 * - Llama 4 Maverick GPQA 69.8 / MMLU-Pro 80.5 are included, flagged as a
 *   non-reasoning model measured 0-shot, because the comparison is honest: it is
 *   an older generation and the figures say so.
 */
export const CAPABILITY_TEST_TABLE = `
claude-opus-5|swe-bench-verified|97.0|independent|2026-08-14|Vals AI SWE-bench leaderboard|https://www.vals.ai/benchmarks/swebench|mini-swe-agent minimal bash-only harness, isolated Docker container per task|Independently run. BenchLM reports 96.0 for the same model from Anthropic's system card; within tolerance, so the two corroborate.
claude-opus-5|swe-bench-verified|96.0|aggregator|2026-08-18|BenchLM.ai leaderboard|https://benchlm.ai/benchmarks/swe-bench-verified|not stated|Attributed by BenchLM to the Claude Opus 5 system card. Anthropic publishes its benchmark tables as images, so this could not be confirmed at source.
claude-fable-5|swe-bench-verified|95.0|aggregator|2026-08-18|BenchLM.ai model profile|https://benchlm.ai/models/claude-fable-5|not stated|Attributed to Anthropic's Fable 5 system card and corroborated at the same value by Morph. Provider-reported in origin.
claude-sonnet-5|swe-bench-verified|85.2|aggregator|2026-08-18|BenchLM.ai leaderboard|https://benchlm.ai/benchmarks/swe-bench-verified|not stated|Anthropic publishes the Sonnet 5 table as an image; not confirmable at source.
claude-haiku-4-5|swe-bench-verified|73.3|aggregator|2026-08-18|BenchLM.ai leaderboard|https://benchlm.ai/benchmarks/swe-bench-verified|not stated|Same value listed independently by Morph via the llm-stats tracker.
kimi-k3|swe-bench-verified|93.4|independent|2026-08-14|Vals AI SWE-bench leaderboard|https://www.vals.ai/benchmarks/swebench|mini-swe-agent minimal bash-only harness|Moonshot's own model card does not report SWE-bench Verified. Single-source; a second extraction pass over the same page did not resurface the figure, so treat as plausible rather than confirmed.
deepseek-v4-pro|swe-bench-verified|96.4|independent|2026-08-14|Vals AI SWE-bench leaderboard|https://www.vals.ai/benchmarks/swebench|mini-swe-agent minimal bash-only harness, 0813 snapshot|CONTESTED: BenchLM reports 80.6 for the same 0813 snapshot, a 16-point gap. DeepSeek publishes no SWE-bench figure itself.
deepseek-v4-pro|swe-bench-verified|80.6|aggregator|2026-08-18|BenchLM.ai leaderboard|https://benchlm.ai/benchmarks/swe-bench-verified|not stated, 0813 snapshot|CONTESTED against Vals AI's 96.4. BenchLM's own list also carries 79.4 for a "High" effort variant and 73.6 unsuffixed, so snapshot and effort labelling dominate this figure.
deepseek-v4-flash|swe-bench-verified|79.0|aggregator|2026-08-18|BenchLM.ai leaderboard|https://benchlm.ai/benchmarks/swe-bench-verified|not stated, 0731 snapshot|BenchLM separately lists 78.6 for a "High" variant and 73.7 unsuffixed.
minimax-m3|swe-bench-verified|80.5|aggregator|2026-08-18|BenchLM.ai leaderboard|https://benchlm.ai/benchmarks/swe-bench-verified|not stated|MiniMax publishes SWE-bench Pro (59.0) but not Verified, so this is uncorroborated at source.
mistral-medium-3-5|swe-bench-verified|77.6|provider|2026-08-18|Mistral AI model card|https://huggingface.co/mistralai/Mistral-Medium-3.5-128B|not stated; listed under agentic benchmarks|BenchLM independently lists the same 77.6, so the two agree.
gemini-3-1-pro|swe-bench-verified|80.6|provider|2026-08-18|Google DeepMind Gemini Pro model page|https://deepmind.google/models/gemini/pro/|single attempt, explicitly no best-of-n or parallel test-time compute|Methodology published at deepmind.google/models/evals-methodology/gemini-3-1-pro.
gpt-5-6-sol|arc-agi-2-max-effort|92.5|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/openai-gpt-5-6|maximum reasoning effort, ARC Prize official harness, no external tools|Highest ARC-AGI-2 figure on the verified index. ARC Prize tested five effort levels; only the maximum was transcribable.
claude-opus-5|arc-agi-2-max-effort|90.4|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/anthropic-claude-opus-5|maximum reasoning effort, ARC Prize official harness, no external tools|The same page reports 88.3 at high effort, showing how sharply this benchmark moves with effort.
claude-fable-5|arc-agi-2-max-effort|89.2|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/anthropic-claude-fable-5|maximum reasoning effort, $5.45 per task, ARC Prize official harness|Same page reports 76.8 at low effort.
gpt-5-6-terra|arc-agi-2-max-effort|83.9|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/openai-gpt-5-6|maximum reasoning effort, ARC Prize official harness, no external tools|not stated beyond effort level
grok-4-6|arc-agi-2-max-effort|67.1|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/xai-grok-4-6|extra-high reasoning effort, $0.76 per task, ARC Prize official harness|Recorded as xhigh rather than max; xAI's highest published effort tier on this index.
deepseek-v4-flash|arc-agi-2-max-effort|61.4|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/deepseek-v4-flash|maximum reasoning effort, $0.04 per task, ARC Prize official harness|Notably the cheapest per-task cost on the verified index by two orders of magnitude.
kimi-k3|arc-agi-2-max-effort|60.4|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/moonshot-kimi-k3|maximum reasoning effort, $1.59 per task, ARC Prize official harness|not stated beyond effort level
gemini-3-6-flash|arc-agi-2-max-effort|60.4|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/leaderboard|configuration not stated on the index row|Effort level not published for this row, so it may not be a maximum-effort result.
gpt-5-6-luna|arc-agi-2-max-effort|59.5|benchmark|2026-08-18|ARC Prize verified results|https://arcprize.org/results/openai-gpt-5-6|maximum reasoning effort, ARC Prize official harness, no external tools|A second index row lists 59.6 with configuration unstated; within tolerance.
gemini-3-1-pro|arc-agi-2-max-effort|77.1|provider|2026-08-18|Google DeepMind Gemini Pro model page|https://deepmind.google/models/gemini/pro/|pass@1, single attempt|Provider-reported rather than from the ARC Prize index.
gpt-5-6-sol|gpqa-diamond-no-tools|94.6|provider|2026-07-09|OpenAI GPT-5.6 launch announcement|https://openai.com/index/gpt-5-6/|reasoning effort not specified|Artificial Analysis independently measured 94.1 at maximum effort; the two agree.
gpt-5-6-terra|gpqa-diamond-no-tools|92.9|provider|2026-07-09|OpenAI GPT-5.6 launch announcement|https://openai.com/index/gpt-5-6/|reasoning effort not specified|Artificial Analysis independently measured 92.5; agrees.
gpt-5-6-luna|gpqa-diamond-no-tools|92.3|provider|2026-07-09|OpenAI GPT-5.6 launch announcement|https://openai.com/index/gpt-5-6/|reasoning effort not specified|Artificial Analysis independently measured 91.1; agrees.
gemini-3-1-pro|gpqa-diamond-no-tools|94.3|provider|2026-08-18|Google DeepMind Gemini Pro model page|https://deepmind.google/models/gemini/pro/|no tools, pass@1 single attempt|Artificial Analysis measured 94.1 and LM Council 95.45; all within tolerance.
grok-4-6|gpqa-diamond-no-tools|94.9|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|high reasoning effort, no tools|Independently run.
gemini-3-7-flash|gpqa-diamond-no-tools|94.5|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|high reasoning effort, no tools|Independently run.
gemini-3-6-flash|gpqa-diamond-no-tools|92.8|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|no tools|Independently run.
kimi-k3|gpqa-diamond-no-tools|93.5|provider|2026-08-18|Moonshot AI Kimi-K3 model card|https://huggingface.co/moonshotai/Kimi-K3|single step, no tools, temperature 1.0, top_p 0.95|not stated beyond sampling parameters
claude-opus-5|gpqa-diamond-no-tools|93.2|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|no tools|Independently run.
claude-fable-5|gpqa-diamond-no-tools|93.18|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|zero-shot chain of thought, single query, no tools|A separate LM Council row reports 55.56 for the same model and protocol. That outlier is recorded below and is inconsistent with two other sources near 93.
claude-fable-5|gpqa-diamond-no-tools|55.56|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|zero-shot chain of thought, single query, no tools|OUTLIER: 37 points below two other reports of the same model and protocol, including one from the same publisher. Retained so the disagreement is visible rather than silently dropped.
claude-fable-5|gpqa-diamond-no-tools|92.6|provider|2026-07-09|OpenAI GPT-5.6 launch announcement comparison table|https://openai.com/index/gpt-5-6/|not specified|A competitor figure published by OpenAI, not by Anthropic. Recorded at provider tier with that caveat.
claude-sonnet-5|gpqa-diamond-no-tools|91.1|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|no tools|Independently run.
minimax-m3|gpqa-diamond-no-tools|92.9|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|no tools|MiniMax's own announcement states 93 for the same model; the two agree.
deepseek-v4-pro|gpqa-diamond-no-tools|92.8|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|no tools|DeepSeek's own card states 90.1 pass@1; within tolerance.
deepseek-v4-flash|gpqa-diamond-no-tools|90.8|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|no tools|DeepSeek's own card states 88.1 pass@1; within tolerance.
qwen-3-8-max|gpqa-diamond-no-tools|92.7|independent|2026-08-18|Artificial Analysis|https://artificialanalysis.ai/|no tools|Alibaba's own release states 92.6; the two agree closely.
glm-5-2|gpqa-diamond-no-tools|91.2|provider|2026-08-18|Z.AI GLM-5.2 documentation|https://docs.z.ai/guides/llm/glm-5.2|no tools, temperature 1.0, top_p 0.95|not independently reproduced
llama-4-maverick|gpqa-diamond-no-tools|69.8|provider|2026-08-18|Meta Llama 4 model documentation|https://huggingface.co/meta-llama|0-shot accuracy, no tools, non-reasoning model|A previous-generation non-reasoning model. The 25-point gap to current frontier models is real and is the honest comparison.
glm-5-2|aime-2026|99.2|provider|2026-08-18|Z.AI GLM-5.2 documentation|https://docs.z.ai/guides/llm/glm-5.2|no tools, temperature 1.0, top_p 0.95|not independently reproduced
gemini-3-1-pro|aime-2026|98.2|provider|2026-08-18|Google DeepMind Gemini Pro model page|https://deepmind.google/models/gemini/pro/|pass@1|Artificial Analysis reports 98.12 averaged over 8 runs; agrees.
deepseek-v4-pro|aime-2026|94.6|provider|2026-08-18|DeepSeek model card|https://api-docs.deepseek.com/updates/|not stated|not independently reproduced
claude-fable-5|hle-no-tools|55.5|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|no tools, single answer, LLM equality checker|not independently reproduced
claude-opus-5|hle-no-tools|54.9|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|no tools, single answer, LLM equality checker|A second aggregator reports 56.3 for the same protocol; within tolerance.
gpt-5-6-sol|hle-no-tools|49.5|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|no tools, single answer, LLM equality checker|not independently reproduced
kimi-k3|hle-no-tools|43.5|provider|2026-08-18|Moonshot AI Kimi-K3 model card|https://huggingface.co/moonshotai/Kimi-K3|no tools, single step, temperature 1.0|LM Council independently reports 46.9; within tolerance.
gemini-3-1-pro|hle-no-tools|44.4|provider|2026-08-18|Google DeepMind Gemini Pro model page|https://deepmind.google/models/gemini/pro/|no tools, pass@1 single attempt|LM Council reports 47.0; within tolerance. The same DeepMind page reports 51.4 with tools enabled, recorded separately.
claude-sonnet-5|hle-no-tools|43.2|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|no tools|not independently reproduced
qwen-3-8-max|hle-no-tools|43.6|provider|2026-08-18|Alibaba Qwen3.8-Max release|https://help.aliyun.com/en/model-studio/|no tools|LM Council independently reports 43.0; agrees.
gpt-5-6-terra|hle-no-tools|42.9|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|no tools, single answer, LLM equality checker|not independently reproduced
glm-5-2|hle-no-tools|40.5|provider|2026-08-18|Z.AI GLM-5.2 documentation|https://docs.z.ai/guides/llm/glm-5.2|no tools, temperature 1.0, top_p 0.95|The same card reports 54.7 with tools enabled, recorded separately.
deepseek-v4-pro|hle-no-tools|37.7|provider|2026-08-18|DeepSeek model card|https://api-docs.deepseek.com/updates/|pass@1, single attempt, no tools|not independently reproduced
minimax-m3|hle-no-tools|37.0|provider|2026-08-18|MiniMax M3 announcement|https://www.minimax.io/blog/minimax-m3|not stated|not independently reproduced
deepseek-v4-flash|hle-no-tools|34.8|provider|2026-08-18|DeepSeek model card|https://api-docs.deepseek.com/updates/|pass@1, single attempt, no tools|not independently reproduced
claude-opus-5|hle-with-tools|64.7|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|tools enabled|Compare with 54.9 for the same model without tools: a 10-point methodology effect.
kimi-k3|hle-with-tools|56.0|provider|2026-08-18|Moonshot AI Kimi-K3 model card|https://huggingface.co/moonshotai/Kimi-K3|general tools enabled, temperature 1.0, top_p 1.0|Compare with 43.5 without tools.
claude-sonnet-5|hle-with-tools|57.4|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|tools enabled|Compare with 43.2 without tools.
glm-5-2|hle-with-tools|54.7|provider|2026-08-18|Z.AI GLM-5.2 documentation|https://docs.z.ai/guides/llm/glm-5.2|tools enabled, 300,000-token context|Compare with 40.5 without tools.
gemini-3-1-pro|hle-with-tools|51.4|provider|2026-08-18|Google DeepMind Gemini Pro model page|https://deepmind.google/models/gemini/pro/|search and code execution enabled, pass@1|Compare with 44.4 without tools.
claude-opus-5|mmlu-pro|91.59|aggregator|2026-08-18|LM Council benchmarks|https://lmcouncil.ai/benchmarks|5-shot chain of thought, no tools|not independently reproduced
deepseek-v4-pro|mmlu-pro|87.5|provider|2026-08-18|DeepSeek model card|https://api-docs.deepseek.com/updates/|exact match, no tools|not independently reproduced
deepseek-v4-flash|mmlu-pro|86.2|provider|2026-08-18|DeepSeek model card|https://api-docs.deepseek.com/updates/|exact match, no tools, temperature 1.0|not independently reproduced
llama-4-maverick|mmlu-pro|80.5|provider|2026-08-18|Meta Llama 4 model documentation|https://huggingface.co/meta-llama|0-shot macro-average accuracy, non-reasoning model|Previous-generation model.
`;
