/**
 * The model catalogue, as reviewable tabular data.
 *
 * One line per model variant. Pipe-delimited so that a provider's weekly page
 * change shows up as a one-line diff rather than a reshuffled object literal.
 * `parseCatalog` in `catalog.ts` validates every column and throws on a
 * malformed row, so a typo here fails the build rather than shipping.
 *
 * Columns
 * -------
 *  1  id            stable slug, never reused for a different model
 *  2  name          the provider's own name for the variant
 *  3  provider      must exist in PROVIDER_SOURCES
 *  4  tier          Frontier | Balanced | Efficient | Specialist | Open / local | Research
 *  5  quality       1-5 estimate of output quality. An estimate, not a benchmark.
 *  6  speed         1-5 estimate of responsiveness. An estimate, not a measurement.
 *  7  context       token count (e.g. 1050000), or a label: realtime, managed, code, agent, multimodal
 *  8  price         "IN/OUT" real published $/MTok · "~N" no published price, estimated cost class
 *                   · "local:N" self-hosted, estimated compute cost class
 *  9  cases         capability letters, see CASE_CODES
 * 10  roles         jobs the provider positions this model for
 * 11  deployments   h hosted · w open-weight · p private cloud · e edge
 * 12  modalities    t text · i image · a audio · v video
 * 13  verification  c confirmed against the provider page on VERIFIED_AT
 *                   · u unconfirmed, predates the last review sweep
 *                   · d drifted, the provider page no longer agrees
 * 14  summary       one sentence on when to reach for it
 * 15  driftNote     required when column 13 is `d`, otherwise omitted
 */
export const CATALOG_TABLE = `
gpt-5-6-sol|GPT-5.6 Sol|OpenAI|Frontier|5|2|1050000|5/30|r,k,c,g,s,v,m,t,y|planner,primary,coder,validator|h,p|t,i|c|Highest-capability GPT tier for complex professional reasoning, coding and tool use.
gpt-5-6-terra|GPT-5.6 Terra|OpenAI|Balanced|4|4|1050000|2/12|r,k,c,g,v,a,m,t|planner,primary,worker,coder|h,p|t,i|c|Balanced intelligence and cost for production workloads.
gpt-5-6-luna|GPT-5.6 Luna|OpenAI|Efficient|3|5|1050000|0.2/1.2|k,g,a,m,t|worker,primary|h|t,i|c|Cost-sensitive GPT tier for defined, high-volume tasks.
gpt-5-6-cyber|GPT-5.6 Cyber|OpenAI|Specialist|4|3|1050000|~4|r,c,y,t|validator,coder|h,p|t|c|Security-focused GPT variant for vulnerability and defensive analysis work.
gpt-realtime-2-1|GPT-Realtime 2.1|OpenAI|Specialist|4|5|realtime|~4|o,m,t|voice,primary|h|t,a|c|Native speech interaction with reasoning and tool use.
gpt-realtime-2-1-mini|GPT-Realtime 2.1 Mini|OpenAI|Specialist|3|5|realtime|~2|o,m|voice,worker|h|t,a|c|Lower-cost speech endpoint for shorter or higher-volume voice sessions.
gpt-oss-120b|gpt-oss-120b|OpenAI|Open / local|4|3|128000|local:2|r,k,c,g,a,p,t|planner,primary,private,validator|w,p|t|c|Larger Apache-licensed GPT option for controlled deployment.
gpt-oss-20b|gpt-oss-20b|OpenAI|Open / local|3|5|128000|local:1|k,c,g,a,p,t|worker,private,validator|w,p,e|t|c|Compact open-weight GPT for low-latency local workloads.
claude-fable-5|Claude Fable 5|Anthropic|Frontier|5|1|1000000|10/50|r,k,c,g,s,v,m,t,y|planner,primary,coder,validator,researcher|h,p|t,i|c|Anthropic's most capable tier for the hardest reasoning and long-horizon agentic work.
claude-opus-5|Claude Opus 5|Anthropic|Frontier|5|2|1000000|5/25|r,k,c,g,s,v,m,t,y|planner,primary,coder,validator,researcher|h,p|t,i|c|Frontier reasoning and coding with a large context window.
claude-sonnet-5|Claude Sonnet 5|Anthropic|Balanced|4|4|1000000|2/10|r,k,c,g,v,a,m,t,y|planner,primary,worker,coder,validator|h,p|t,i|c|The default production Claude: strong reasoning at a workable price.
claude-haiku-4-5|Claude Haiku 4.5|Anthropic|Efficient|3|5|200000|1/5|k,c,g,a,m,t|worker,primary,validator|h,p|t,i|c|Fast, inexpensive Claude for routine extraction, drafting and classification.
gemini-3-1-pro|Gemini 3.1 Pro Preview|Google|Frontier|5|2|1000000|~4|r,k,c,g,s,v,m,t,y|planner,primary,coder,validator|h,p|t,i,v|c|Google's frontier tier for complex multimodal reasoning.
gemini-3-7-flash|Gemini 3.7 Flash|Google|Balanced|4|5|1000000|~2|r,k,c,g,v,a,m,t|primary,worker,planner,vision|h,p|t,i,v|c|Current default Flash: fast multimodal work at production cost.
gemini-3-6-flash|Gemini 3.6 Flash|Google|Balanced|4|5|1000000|~2|k,c,g,v,a,m,t|primary,worker,vision|h,p|t,i,v|c|Previous stable Flash, still widely deployed and heavily used in practice.
gemini-3-5-lite|Gemini 3.5 Flash-Lite|Google|Efficient|3|5|1000000|~1|k,g,a,m,t|worker|h,p|t,i,v|c|Cheapest Gemini tier for very high-volume, well-defined tasks.
gemini-live|Gemini 3.1 Flash Live Preview|Google|Specialist|4|5|realtime|~3|o,v,m,t|voice,vision|h|t,a,v|c|Low-latency live audio and video conversation endpoint.
gemini-research|Gemini Deep Research Max Preview|Google|Specialist|5|1|managed|~5|s,g,r,k|researcher|h|t|u|Managed multi-step research pipeline that returns a sourced report.
gemma-4-31b|Gemma 4 31B|Google|Open / local|4|3|256000|local:2|r,k,c,g,v,p,t|planner,primary,private,validator|w,p|t,i|c|Largest dense Gemma 4: 30.7B parameters, text and image, server deployment.
gemma-4-26b-a4b|Gemma 4 26B-A4B|Google|Open / local|4|4|256000|local:1|k,c,g,v,p,a,t|primary,worker,private|w,p|t,i|c|Mixture-of-experts Gemma 4: 25.2B total, 3.8B active, cheap to serve.
gemma-4-12b|Gemma 4 12B|Google|Open / local|3|4|256000|local:1|k,c,g,v,p,a|worker,private|w,p|t,i,a|c|Unified 12B Gemma 4 with text, image and audio input.
gemma-4-e4b|Gemma 4 E4B|Google|Open / local|3|5|128000|local:1|k,g,v,p,a|worker,private|w,p,e|t,i,a|c|4.5B effective parameters for laptops and high-end phones.
gemma-4-e2b|Gemma 4 E2B|Google|Open / local|2|5|128000|local:1|k,p,a|worker,private|w,e|t,i,a|c|2.3B effective parameters: the smallest Gemma 4 for on-device work.
functiongemma-270m|FunctionGemma 270M|Google|Specialist|2|5|32000|local:1|a,p,t|worker,private|w,e|t|c|Tiny function-calling base for fine-tuned private device actions; it is not a general chat model.
grok-4-6|Grok 4.6|xAI|Frontier|5|4|500000|2/6|r,k,c,g,s,a,m,t|planner,primary,coder,worker|h|t|c|xAI's flagship: agentic tool calling with configurable reasoning depth.
deepseek-v4-pro|DeepSeek V4 Pro|DeepSeek|Frontier|5|3|1000000|1.32/3.96|r,k,c,g,s,m,t|planner,primary,coder,validator|h|t|c|Frontier-class reasoning at a fraction of Western frontier pricing.
deepseek-v4-flash|DeepSeek V4 Flash|DeepSeek|Efficient|4|5|1000000|0.44/1.32|k,c,g,a,m,t|worker,primary,coder|h|t|c|The most heavily routed model on OpenRouter: cheap, fast, capable.
deepseek-r1-0528|DeepSeek R1-0528|DeepSeek|Open / local|5|1|128000|local:3|r,c,p,t|planner,private,validator|w,p|t|u|Final R1 checkpoint with improved reasoning; still a strong open reasoner.
deepseek-r1|DeepSeek R1|DeepSeek|Open / local|4|1|128000|local:3|r,c,p|planner,private,validator|w,p|t|u|The original open reasoning model that reset expectations for open weights.
deepseek-r1-zero|DeepSeek R1-Zero|DeepSeek|Research|3|1|128000|local:3|r,p|private|w|t|u|Pure-RL research checkpoint. Useful for study, not for production.
deepseek-r1-0528-qwen3-8b|DeepSeek R1-0528 Qwen3 8B|DeepSeek|Open / local|3|5|128000|local:1|r,c,p|worker,private|w,p,e|t|u|Reasoning distilled into an 8B Qwen3 base for local use.
deepseek-r1-distill-qwen-1-5b|DeepSeek R1 Distill Qwen 1.5B|DeepSeek|Open / local|2|5|128000|local:1|r,p|worker,private|w,e|t|u|Smallest R1 distill; fits comfortably on edge hardware.
deepseek-r1-distill-qwen-7b|DeepSeek R1 Distill Qwen 7B|DeepSeek|Open / local|3|5|128000|local:1|r,c,p|worker,private|w,p,e|t|u|7B R1 distill balancing reasoning against a small footprint.
deepseek-r1-distill-llama-8b|DeepSeek R1 Distill Llama 8B|DeepSeek|Open / local|3|5|128000|local:1|r,c,p|worker,private|w,p,e|t|u|R1 reasoning on a Llama 8B base for Llama-native stacks.
deepseek-r1-distill-qwen-14b|DeepSeek R1 Distill Qwen 14B|DeepSeek|Open / local|3|4|128000|local:2|r,c,p|worker,private,validator|w,p|t|u|14B R1 distill: the practical middle of the distill range.
deepseek-r1-distill-qwen-32b|DeepSeek R1 Distill Qwen 32B|DeepSeek|Open / local|4|3|128000|local:2|r,c,p,t|planner,private,validator|w,p|t|u|32B R1 distill approaching the full model on reasoning tasks.
deepseek-r1-distill-llama-70b|DeepSeek R1 Distill Llama 70B|DeepSeek|Open / local|4|2|128000|local:3|r,c,p,t|planner,private,validator|w,p|t|u|Largest R1 distill; strongest open reasoning on a Llama base.
jamba-large-1-7|Jamba Large 1.7|AI21|Open / local|4|2|256000|local:3|k,g,p,m,t|primary,private|w,p|t|u|Hybrid SSM-transformer built for very long grounded context.
jamba2-mini|Jamba2 Mini|AI21|Open / local|4|4|256000|local:1|k,g,p,m,a|worker,private|w,p|t|u|Small Jamba2 for long-context retrieval at low cost.
jamba2-3b|Jamba2 3B|AI21|Open / local|3|5|256000|local:1|k,g,p,a|worker,private|w,p,e|t|u|3B Jamba2 for on-device long-context work.
jamba-reasoning-3b|Jamba Reasoning 3B|AI21|Open / local|3|5|1000000|local:1|r,k,g,p|worker,private|w,p,e|t|u|3B reasoning model with an unusually long context for its size.
mistral-medium-3-5|Mistral Medium 3.5|Mistral|Balanced|4|3|256000|~3|r,k,c,g,v,a,m,t|planner,primary,coder|h,p|t,i|c|Mistral's frontier-class multimodal model for agentic and coding work.
mistral-small-4|Mistral Small 4|Mistral|Open / local|4|5|256000|local:1|r,k,c,g,v,p,a,t|worker,primary,private,coder|w,h,p|t,i|c|Hybrid instruct, reasoning and coding model in one small open release.
mistral-large-3|Mistral Large 3|Mistral|Open / local|4|2|256000|local:3|r,k,c,g,v,p,m,t|planner,primary,private,coder|w,h,p|t,i|c|State-of-the-art open-weight general-purpose multimodal model.
ministral-3-14b|Ministral 3 14B|Mistral|Open / local|3|4|256000|local:2|k,c,g,v,p,a|worker,private|w,p|t,i|c|Apache 2.0 text and vision model at 14B.
ministral-3-8b|Ministral 3 8B|Mistral|Open / local|3|5|256000|local:1|k,c,g,v,p,a|worker,private|w,p,e|t,i|c|Apache 2.0 efficient text and vision model at 8B.
ministral-3-3b|Ministral 3 3B|Mistral|Open / local|2|5|256000|local:1|k,g,v,p,a|worker,private|w,e|t,i|c|Tiny Apache 2.0 model with vision, for edge deployment.
codestral|Codestral|Mistral|Specialist|4|5|code|~2|c,t,a|coder,worker|h,w,p|t|c|Code completion and fill-in-the-middle specialist.
voxtral-small|Voxtral Small|Mistral|Specialist|4|5|realtime|~2|o,m,t|voice|h,w,p|t,a|c|Open speech understanding model for voice interfaces.
qwen-3-8-max|Qwen3.8-Max|Alibaba|Frontier|5|3|256000|~3|r,k,c,g,s,v,m,t|planner,primary,coder,validator|h,w,p|t,i|c|Alibaba's largest flagship, released with open weights at 2.4T parameters.
qwen-3-7-plus|Qwen 3.7 Plus|Alibaba|Balanced|4|4|256000|~2|r,k,c,g,v,a,m,t|primary,worker,coder|h,p|t,i|u|Balanced hosted Qwen tier for production workloads.
qwen-3-6-flash|Qwen 3.6 Flash|Alibaba|Efficient|4|5|128000|~1|k,c,g,a,m|worker|h,p|t,i|u|Cheapest hosted Qwen tier for high-volume tasks.
qwen-3-5-397b-a17b|Qwen 3.5 397B-A17B|Alibaba|Open / local|4|3|128000|local:3|r,k,c,g,p,m,t|planner,primary,private|w,p|t|u|Large open mixture-of-experts Qwen with 17B active parameters.
qwen-3-5-9b|Qwen 3.5 9B|Alibaba|Open / local|3|5|128000|local:1|k,c,g,p,m,a|worker,private|w,p,e|t|u|Small open Qwen for local multilingual work.
qwen3-vl-2b|Qwen3-VL 2B Instruct|Alibaba|Open / local|2|5|256000|local:1|k,v,p,a,t|vision,worker,private|w,p,e|t,i,v|c|Compact open vision-language model for private image, video and text work from edge to cloud.
qwen3-vl-4b|Qwen3-VL 4B Instruct|Alibaba|Open / local|3|5|256000|local:1|r,k,v,p,a,t|vision,worker,private|w,p,e|t,i,v|c|Compact open vision-language model for spatial, visual and video tasks from edge to cloud.
mimo-v2-5|MiMo-V2.5|Xiaomi|Balanced|4|5|256000|~1|r,k,c,g,a,m,t|primary,worker,coder|h,w,p|t,i|c|Xiaomi's open model, fourth by routed tokens on OpenRouter despite low profile.
seed-2|Seed 2.0|ByteDance|Frontier|5|3|256000|~3|r,k,c,g,v,m,t|planner,primary,coder|h,p|t,i|u|ByteDance's frontier Seed tier for reasoning and multimodal work.
seed-1-8|Seed 1.8|ByteDance|Balanced|4|4|256000|~2|k,c,g,v,a,m,t|primary,worker|h,p|t,i|u|Balanced Seed tier for production applications.
seed-1-6|Seed 1.6|ByteDance|Efficient|4|5|256000|~1|k,g,a,m|worker|h,p|t,i|u|Efficient Seed tier for high-volume operations.
ui-tars-1-5|UI-TARS 1.5|ByteDance|Specialist|4|4|agent|local:2|v,t,a,r|vision,worker|w,p|t,i|u|Screen-understanding agent model for GUI automation.
ernie-5-1|ERNIE 5.1|Baidu|Frontier|5|3|128000|~3|r,k,c,g,v,m,t|planner,primary,coder|h,p|t,i|u|Baidu's current frontier ERNIE tier.
ernie-5|ERNIE 5.0|Baidu|Frontier|4|3|128000|~3|r,k,g,v,m,t|primary,planner|h,p|t,i|u|Previous frontier ERNIE, still supported for existing deployments.
ernie-4-5-vl|ERNIE 4.5 Turbo VL|Baidu|Efficient|4|5|128000|~1|k,g,v,a,m|worker,vision|h,p|t,i|u|Fast multimodal ERNIE for high-volume vision tasks.
ernie-x1-1|ERNIE X1.1|Baidu|Specialist|4|3|64000|~2|r,t,y|planner,validator|h,p|t|u|Reasoning-specialised ERNIE variant.
hunyuan-hy3|Tencent HY3 Preview|Tencent|Frontier|5|3|256000|~2|r,k,c,g,v,m,t|planner,primary,coder|h,p|t,i|u|Tencent's frontier tier; second by routed tokens on OpenRouter.
hunyuan-a13b|Hunyuan A13B|Tencent|Open / local|4|4|256000|local:1|k,c,g,p,m,a|worker,private|w,p|t|u|Open mixture-of-experts Hunyuan with 13B active parameters.
hunyuan-role|Hunyuan Role|Tencent|Specialist|3|4|28000|~1|k,m|worker|h|t|u|Role-play and persona-consistency specialist.
hunyuan-vision-1-5|Tencent HY Vision 1.5|Tencent|Specialist|4|4|multimodal|~2|v,k,g,a|vision,worker|h,p|t,i,v|u|Vision-language specialist for image and video understanding.
kimi-k3|Kimi K3|Moonshot|Frontier|5|2|1000000|~2|r,k,c,g,s,m,t|planner,primary,coder,validator|h,w,p|t,i|c|Open frontier model competitive with the top Western tiers on reasoning.
kimi-k2-7-code|Kimi K2.7 Code|Moonshot|Specialist|5|3|256000|~2|c,r,t,a|coder,planner|h,w,p|t|u|Coding-specialised Kimi for repository-scale software work.
kimi-k2-6|Kimi K2.6|Moonshot|Balanced|4|4|256000|~1|k,c,g,a,m,t|primary,worker,coder|h,w,p|t|u|Previous Kimi generation; cheap and well supported.
glm-5-2|GLM-5.2|Z.AI|Frontier|5|3|1000000|~2|r,k,c,g,s,m,t|planner,primary,coder,validator|h,w,p|t,i|c|Open frontier GLM with a 1M context window; heavily routed in practice.
glm-5-1|GLM-5.1|Z.AI|Balanced|4|4|200000|~1|k,c,g,a,m,t|primary,worker,coder|h,w,p|t,i|u|Previous GLM generation at balanced cost.
glm-5v|GLM-5V Turbo|Z.AI|Specialist|4|4|multimodal|~1|v,k,g,a|vision,worker|h,w,p|t,i,v|u|Vision-language GLM for document and screen understanding.
glm-4-7|GLM-4.7|Z.AI|Open / local|4|4|128000|local:2|k,c,g,p,m,a|worker,private,coder|w,p|t|u|Older open GLM still common in self-hosted stacks.
minimax-m3|MiniMax M3|MiniMax|Frontier|5|3|1000000|~2|r,k,c,g,s,m,t|planner,primary,coder|h,w,p|t,i|u|Long-context frontier MiniMax for agentic work.
minimax-m2-7|MiniMax M2.7|MiniMax|Balanced|4|4|200000|~1|k,c,g,a,m,t|primary,worker|h,w,p|t|u|Balanced MiniMax tier for production use.
llama-4-maverick|Llama 4 Maverick|Meta|Open / local|4|3|1000000|local:2|k,c,g,v,p,m,a,t|primary,worker,private,vision|w,p|t,i|u|Meta's mixture-of-experts Llama 4 with a very long context.
llama-4-scout|Llama 4 Scout|Meta|Open / local|4|4|10000000|local:2|k,g,v,p,m,a|worker,private,vision|w,p|t,i|u|Extremely long context (10M) in a servable open model.
llama-3-3-70b|Llama 3.3 70B|Meta|Open / local|3|4|128000|local:3|k,c,g,p,m,a|worker,private|w,p|t|u|The workhorse open model of the previous generation.
llama-3-2-vision|Llama 3.2 Vision|Meta|Open / local|3|4|128000|local:2|v,k,g,p|vision,private,worker|w,p|t,i|u|Open vision-language Llama for self-hosted document work.
llama-3-2-edge|Llama 3.2 Edge|Meta|Open / local|2|5|128000|local:1|k,p,a|worker,private|w,e|t|u|1B/3B Llama sizes intended for on-device deployment.
llama-3-1-405b|Llama 3.1 405B|Meta|Open / local|4|1|128000|local:3|r,k,c,g,p,m|planner,private|w,p|t|u|Largest dense Llama; expensive to serve but fully open.
command-a-plus|Command A+|Cohere|Balanced|4|4|128000|~3|k,c,g,m,a,t|primary,worker,coder|h,p|t|c|Cohere's current enterprise flagship for RAG and tool use.
command-a|Command A|Cohere|Balanced|4|4|256000|~2|k,g,m,a,t|primary,worker|h,p|t|c|Previous Command A generation with a longer context window.
command-a-reasoning|Command A Reasoning|Cohere|Specialist|4|3|256000|~3|r,k,g,t,y|planner,validator|h,p|t|c|Reasoning-specialised Command for grounded enterprise analysis.
nova-2-lite|Nova 2 Lite|Amazon|Efficient|3|5|1000000|~1|k,g,a,m,t|worker,primary|h,p|t|c|Fast, cheap reasoning model with code interpreter and web grounding.
nova-2-sonic|Nova 2 Sonic|Amazon|Specialist|4|5|1000000|~2|o,m,t|voice,primary|h,p|t,a|c|Speech-to-speech model for real-time conversation in seven languages.
granite-4-1-30b|Granite 4.1 30B|IBM|Open / local|3|3|128000|local:2|k,c,g,p,a,t|worker,private|w,p|t|u|Apache-licensed enterprise model with a permissive governance story.
granite-4-1-8b|Granite 4.1 8B|IBM|Open / local|2|5|128000|local:1|k,g,p,a|worker,private|w,p,e|t|u|Small Granite for on-premise and edge deployment.
phi-4-mm|Phi-4 Multimodal|Microsoft|Open / local|3|5|128000|local:1|k,c,g,v,p,a|worker,private,vision|w,p,e|t,i,a|u|Small multimodal Phi with strong reasoning for its size.
phi-4-mini|Phi-4 Mini|Microsoft|Open / local|3|5|128000|local:1|k,c,g,p,a|worker,private|w,p,e|t|u|Compact Phi for local and edge inference.
nemotron-3-ultra|Nemotron 3 Ultra|NVIDIA|Open / local|4|2|256000|local:3|r,k,c,g,p,t|planner,private,validator|w,p|t|u|NVIDIA's largest open Nemotron; tenth by routed tokens on OpenRouter.
nemotron-3-nano|Nemotron 3 Nano|NVIDIA|Open / local|3|5|256000|local:1|k,c,g,p,a|worker,private|w,p,e|t|u|Small Nemotron tuned for efficient local serving.
step-3-7-flash|Step 3.7 Flash|StepFun|Open / local|4|5|256000|local:1|k,c,g,a,m|worker,primary|w,p|t,i|u|Efficient open StepFun model for high-volume tasks.
step-3-5-flash|Step 3.5 Flash|StepFun|Open / local|4|5|256000|local:1|k,c,g,a,m|worker|w,p|t,i|u|Previous Step Flash generation, still in common use.
step3-vl-10b|Step3 VL 10B|StepFun|Open / local|3|5|128000|local:1|v,k,g,p|vision,worker,private|w,p,e|t,i|u|Small open vision-language model for local document work.
palmyra-x5|Palmyra X5|Writer|Balanced|4|5|1000000|~2|k,g,m,a,t|primary,worker|h,p|t|u|Long-context enterprise writing and workflow model.
palmyra-x4|Palmyra X4|Writer|Balanced|3|3|128000|~3|k,g,m,a|worker|h,p|t|u|Previous Palmyra generation for existing deployments.
exaone-4-5-33b|EXAONE 4.5 33B|LG AI|Open / local|4|3|256000|local:2|r,k,c,g,p,m,t|planner,private,worker|w,p|t|u|LG's open bilingual model with solid reasoning at 33B.
exaone-4-0-1-2b|EXAONE 4.0 1.2B|LG AI|Open / local|2|5|128000|local:1|k,p,m|worker,private|w,e|t|u|Very small EXAONE for on-device Korean and English work.
hyperclovax-think-32b|HyperCLOVA X SEED Think 32B|NAVER|Open / local|4|3|128000|local:2|r,k,g,p,m,t|planner,private|w,p|t|u|NAVER's open reasoning model, strongest on Korean.
hyperclovax-omni-8b|HyperCLOVA X SEED Omni 8B|NAVER|Open / local|3|5|128000|local:1|k,g,v,o,p,m|worker,private,voice|w,p,e|t,i,a|u|Small any-to-text HyperCLOVA covering text, image and audio.
hyperclovax-vision-3b|HyperCLOVA X SEED Vision 3B|NAVER|Open / local|2|5|128000|local:1|v,k,p|vision,private|w,e|t,i|u|Tiny open vision model for on-device Korean document work.
falcon-h1-34b|Falcon H1 34B|TII|Open / local|4|3|256000|local:2|r,k,c,g,p,m,t|planner,private,worker|w,p|t|u|Hybrid-attention Falcon with strong multilingual coverage.
falcon-h1-7b|Falcon H1 7B|TII|Open / local|3|5|256000|local:1|k,c,g,p,m,a|worker,private|w,p,e|t|u|Efficient Falcon H1 for local multilingual deployment.
falcon-h1-tiny-r-0-6b|Falcon H1 Tiny R 0.6B|TII|Open / local|2|5|128000|local:1|k,p,m|worker,private|w,e|t|u|Sub-billion Falcon for constrained edge hardware.
sonar|Sonar|Perplexity|Specialist|3|5|128000|~1|s,g,k|researcher,worker|h|t|c|Lightweight grounded search model with citations.
sonar-pro|Sonar Pro|Perplexity|Specialist|4|4|200000|~2|s,g,k,r|researcher|h|t|c|Grounded search for complex, multi-turn research questions.
sonar-reason|Sonar Reasoning Pro|Perplexity|Specialist|4|2|128000|~3|s,g,r,k,t|researcher,validator|h|t|c|Chain-of-thought reasoning over live search results.
sonar-research|Sonar Deep Research|Perplexity|Specialist|5|1|managed|~4|s,g,r,k|researcher|h|t|c|Exhaustive managed research runs that return a full sourced report.
`;

/**
 * Entries removed from the catalogue because the provider page no longer lists
 * them. Kept so the audit view can explain a shrinking count rather than
 * silently dropping models a user may have planned around.
 */
export const RETIRED_TABLE = `
grok-4-20|Grok 4.20|xAI|2026-08-18|Replaced by Grok 4.6. docs.x.ai now lists a single flagship text model.
grok-4-5|Grok 4.5|xAI|2026-08-18|Replaced by Grok 4.6.
grok-multi|Grok 4.20 Multi-Agent Preview|xAI|2026-08-18|No longer listed as a separate endpoint on docs.x.ai.
qwen-3-7-max|Qwen 3.7 Max|Alibaba|2026-08-18|Superseded as flagship by Qwen3.8-Max, which ships open weights.
nova-2-pro|Nova 2 Pro Preview|Amazon|2026-08-18|Not listed on aws.amazon.com/nova/models; only Nova 2 Lite and Nova 2 Sonic appear.
voxtral|Voxtral|Mistral|2026-08-18|Split into Voxtral Small, Voxtral TTS and the Voxtral Mini Transcribe endpoints.
`;
