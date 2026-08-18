/**
 * A dated, deliberately narrow real-world usage signal.
 *
 * OpenRouter publishes the volume of prompt + completion tokens routed through
 * its own API. That is a popularity measurement of one gateway's traffic — not a
 * user count, not market share, and emphatically not a quality test. It is
 * included because "lots of teams are actually running this in production" is
 * genuinely useful information when you are choosing what to build on, and
 * excluded from carrying much scoring weight for exactly the same reason.
 */
export interface UsageEntry {
  readonly rank: number;
  readonly tokensTrillion: number;
  readonly note?: string;
}

export const OPENROUTER_USAGE = {
  sourceName: "OpenRouter rankings",
  sourceUrl: "https://openrouter.ai/rankings",
  asOf: "2026-08-17",
  license: "CC BY 4.0",
  method:
    "Prompt plus completion tokens routed through the OpenRouter API. Dated snapshot of one gateway's traffic; not a user count, market share or quality measurement.",
  models: {
    "deepseek-v4-flash": {
      rank: 1,
      tokensTrillion: 16.07,
      note: "Two dated OpenRouter variants combined (11.3T for 0731 plus 4.77T for 0423), because this catalogue keeps one record per variant.",
    },
    "hunyuan-hy3": { rank: 2, tokensTrillion: 9.7 },
    "gpt-5-6-luna": { rank: 3, tokensTrillion: 5.57 },
    "mimo-v2-5": { rank: 4, tokensTrillion: 4.99 },
    "glm-5-2": { rank: 6, tokensTrillion: 4.41 },
    "gemini-3-6-flash": { rank: 7, tokensTrillion: 2.77 },
    "claude-opus-5": { rank: 8, tokensTrillion: 2.7 },
    "deepseek-v4-pro": { rank: 9, tokensTrillion: 2.66 },
    "nemotron-3-ultra": { rank: 10, tokensTrillion: 2.39 },
  } as Readonly<Record<string, UsageEntry>>,
} as const;
