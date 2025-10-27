import { NextResponse } from "next/server";

// Available AI models and their configurations
const AVAILABLE_MODELS = [
  {
    id: "gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "openai",
    description:
      "Premium GPT-5 tier tuned for complex strategy, long-form synthesis, and high-stakes analysis with web search capabilities.",
    maxTokens: 8192,
    contextWindow: 32768,
    isDefault: false,
    capabilities: [
      "advanced-reasoning",
      "long-form",
      "strategy",
      "code-generation",
      "analysis",
      "tool-use",
      "web-search",
      "native-vision",
    ],
    pricing: {
      input: 0.02,
      output: 0.06,
      unit: "1K tokens",
    },
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    description:
      "Most advanced language model with superior reasoning, creativity, and web search capabilities",
    maxTokens: 4096,
    contextWindow: 32768,
    isDefault: true,
    capabilities: [
      "text-generation",
      "reasoning",
      "creative-writing",
      "code-generation",
      "analysis",
      "tool-use",
      "web-search",
      "native-vision",
    ],
    pricing: {
      input: 0.01,
      output: 0.03,
      unit: "1K tokens",
    },
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    description:
      "Faster version of GPT-5 with balanced speed and cost, ideal for chat and medium-difficulty reasoning",
    maxTokens: 4096,
    contextWindow: 32768,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "chat",
      "instruction-following",
      "web-search",
      "native-vision",
    ],
    pricing: {
      input: 0.005,
      output: 0.015,
      unit: "1K tokens",
    },
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    description:
      "Fastest, most cost-effective GPT-5 model, great for fast, simple tasks like classification",
    maxTokens: 2048,
    contextWindow: 16384,
    isDefault: false,
    capabilities: [
      "text-generation",
      "classification",
      "simple-reasoning",
      "coding",
      "web-search",
      "native-vision",
    ],
    pricing: {
      input: 0.002,
      output: 0.008,
      unit: "1K tokens",
    },
  },
  {
    id: "anthropic/claude-4-sonnet",
    name: "Claude 4 Sonnet",
    provider: "replicate",
    description:
      "Hybrid reasoning model with both near-instant responses and extended thinking capabilities. Superior coding and reasoning performance",
    maxTokens: 4096,
    contextWindow: 200000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "extended-thinking",
      "instruction-following",
      "tool-execution",
    ],
    pricing: {
      input: 0.003,
      output: 0.015,
      unit: "1K tokens",
    },
  },
  {
    id: "anthropic/claude-4.5-sonnet",
    name: "Claude 4.5 Sonnet",
    provider: "replicate",
    description:
      "Latest Claude model with improved intelligence and performance. Does not support extended thinking mode",
    maxTokens: 8192,
    contextWindow: 200000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "instruction-following",
      "tool-execution",
      "image-analysis",
    ],
    pricing: {
      input: 0.003,
      output: 0.015,
      unit: "1K tokens",
    },
  },
  {
    id: "anthropic/claude-4.5-haiku",
    name: "Claude 4.5 Haiku",
    provider: "replicate",
    description:
      "Fastest Claude model optimized for speed and efficiency. Does not support extended thinking mode",
    maxTokens: 8192,
    contextWindow: 200000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "instruction-following",
      "image-analysis",
      "fast-response",
    ],
    pricing: {
      input: 0.001,
      output: 0.005,
      unit: "1K tokens",
    },
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        models: AVAILABLE_MODELS,
        defaultModel:
          AVAILABLE_MODELS.find((model) => model.isDefault)?.id ||
          "gpt-5",
        totalCount: AVAILABLE_MODELS.length,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch available models",
      },
      { status: 500 }
    );
  }
}
