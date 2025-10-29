import { NextResponse } from "next/server";

// Available AI models and their configurations
const AVAILABLE_MODELS = [
  {
    id: "gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "openai",
    descriptor: "Strategic",
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
    descriptor: "Versatile",
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
    descriptor: "Conversational",
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
    descriptor: "Swift",
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
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    descriptor: "Analytical",
    description:
      "Our smartest model for complex agents and coding. Enhanced intelligence with native vision and PDF support",
    maxTokens: 8192,
    contextWindow: 200000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "instruction-following",
      "native-vision",
      "native-pdf",
      "image-analysis",
      "document-analysis",
      "complex-agents",
      "extended-thinking",
      "web-search",
    ],
    pricing: {
      input: 0.003,
      output: 0.015,
      unit: "1K tokens",
    },
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    descriptor: "Efficient",
    description:
      "Our fastest model with near-frontier intelligence. Native vision and PDF support",
    maxTokens: 8192,
    contextWindow: 200000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "instruction-following",
      "native-vision",
      "native-pdf",
      "image-analysis",
      "document-analysis",
      "fast-response",
      "extended-thinking",
      "web-search",
    ],
    pricing: {
      input: 0.001,
      output: 0.005,
      unit: "1K tokens",
    },
  },
  {
    id: "claude-opus-4-1-20250805",
    name: "Claude Opus 4.1",
    provider: "anthropic",
    descriptor: "Specialist",
    description:
      "Exceptional model for specialized reasoning tasks. Native vision and PDF support",
    maxTokens: 8192,
    contextWindow: 200000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "advanced-reasoning",
      "code-generation",
      "instruction-following",
      "native-vision",
      "native-pdf",
      "image-analysis",
      "document-analysis",
      "specialized-reasoning",
      "extended-thinking",
      "web-search",
    ],
    pricing: {
      input: 0.015,
      output: 0.075,
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
