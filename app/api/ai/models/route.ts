import { NextResponse } from "next/server";

// Basic instruction for all models
export const LIA_SYSTEM_INSTRUCTION = `You are LIA (Leverate Intelligent Assistant), an AI assistant designed to help all Leveratians with their various needs. Your primary goal is to provide helpful, accurate, and relevant assistance to Leverate team members across different tasks and inquiries.`;

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
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    description:
      "Google's most capable multimodal AI model with advanced reasoning and creative capabilities",
    maxTokens: 8192,
    contextWindow: 2000000,
    isDefault: false,
    capabilities: [
      "text-generation",
      "reasoning",
      "code-generation",
      "multimodal",
      "instruction-following",
      "creative-writing",
      "advanced-reasoning",
    ],
    pricing: {
      input: 0.00125,
      output: 0.005,
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
