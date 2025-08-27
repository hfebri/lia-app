import { NextResponse } from "next/server";

// Available AI models and their configurations
const AVAILABLE_MODELS = [
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "replicate",
    description:
      "Most advanced language model with superior reasoning and creativity",
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
    ],
    pricing: {
      input: 0.01,
      output: 0.03,
      unit: "1K tokens",
    },
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "replicate",
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
    ],
    pricing: {
      input: 0.005,
      output: 0.015,
      unit: "1K tokens",
    },
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "replicate",
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
    id: "deepseek-ai/deepseek-r1",
    name: "DeepSeek R1",
    provider: "replicate",
    description:
      "A reasoning model trained with reinforcement learning, on par with OpenAI o1. Excellent for complex reasoning tasks",
    maxTokens: 4096,
    contextWindow: 32768,
    isDefault: false,
    capabilities: [
      "reasoning",
      "chain-of-thought",
      "self-verification",
      "reflection",
      "code-generation",
      "math",
    ],
    pricing: {
      input: 0.004,
      output: 0.016,
      unit: "1K tokens",
    },
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    description:
      "Google's fast multimodal AI model with excellent performance for text and image analysis",
    maxTokens: 8192,
    contextWindow: 1000000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "multimodal",
      "instruction-following",
      "creative-writing",
    ],
    pricing: {
      input: 0.00015,
      output: 0.0006,
      unit: "1K tokens",
    },
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "gemini",
    description:
      "Lightweight version of Gemini 2.5 Flash, optimized for speed and cost-efficiency",
    maxTokens: 4096,
    contextWindow: 1000000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "instruction-following",
      "chat",
    ],
    pricing: {
      input: 0.000075,
      output: 0.0003,
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
          "openai/gpt-5",
        totalCount: AVAILABLE_MODELS.length,
      },
    });
  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch available models",
      },
      { status: 500 }
    );
  }
}
