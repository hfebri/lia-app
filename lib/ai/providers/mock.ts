import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIGenerationOptions,
} from "../types";

export class MockProvider implements AIProvider {
  public readonly name = "replicate";
  public readonly models = [
    "openai/gpt-5",
    "openai/gpt-5-mini",
    "openai/gpt-5-nano",
    "anthropic/claude-4-sonnet",
    "deepseek-ai/deepseek-r1",
  ];

  async generateResponse(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    // Simulate API delay
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    const userMessage = messages[messages.length - 1]?.content || "";
    const model = options.model || "openai/gpt-5";

    // Generate mock response based on the model
    const mockResponse = this.generateMockResponse(userMessage, model);

    return {
      content: mockResponse,
      model,
      provider: this.name,
      usage: {
        prompt_tokens: Math.floor(userMessage.length / 4),
        completion_tokens: Math.floor(mockResponse.length / 4),
        total_tokens: Math.floor(
          (userMessage.length + mockResponse.length) / 4
        ),
      },
    };
  }

  async *generateStream(
    messages: AIMessage[],
    options: AIGenerationOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    const userMessage = messages[messages.length - 1]?.content || "";
    const model = options.model || "openai/gpt-5";

    const fullResponse = this.generateMockResponse(userMessage, model);
    const words = fullResponse.split(" ");

    // Stream response word by word
    let accumulatedContent = "";
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      accumulatedContent += (i > 0 ? " " : "") + word;

      // Simulate typing delay
      await new Promise((resolve) =>
        setTimeout(resolve, 50 + Math.random() * 100)
      );

      yield {
        content: word + (i < words.length - 1 ? " " : ""),
        isComplete: i === words.length - 1,
        usage:
          i === words.length - 1
            ? {
                prompt_tokens: Math.floor(userMessage.length / 4),
                completion_tokens: Math.floor(fullResponse.length / 4),
                total_tokens: Math.floor(
                  (userMessage.length + fullResponse.length) / 4
                ),
              }
            : undefined,
      };
    }
  }

  private generateMockResponse(userMessage: string, model: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // Model-specific response styles
    if (model.includes("gpt-5-nano")) {
      return this.generateNanoResponse(lowerMessage);
    } else if (model.includes("gpt-5-mini")) {
      return this.generateMiniResponse(lowerMessage);
    } else if (model.includes("claude-4-sonnet")) {
      return this.generateClaudeResponse(lowerMessage);
    } else if (model.includes("deepseek-r1")) {
      return this.generateDeepSeekResponse(lowerMessage);
    } else {
      return this.generateGPT5Response(lowerMessage);
    }
  }

  private generateNanoResponse(message: string): string {
    const responses = [
      "Quick answer: Yes, that's correct.",
      "Classification: This is a valid request.",
      "Result: Processing complete.",
      "Status: Task completed successfully.",
      "Brief response: Understood and processed.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateMiniResponse(message: string): string {
    if (message.includes("code") || message.includes("programming")) {
      return "I can help with coding! This is GPT-5 Mini providing a balanced response with medium-difficulty reasoning. What specific programming task would you like assistance with?";
    }
    return "Hello! I'm GPT-5 Mini, offering a great balance between speed and capability. I'm designed for chat and medium-difficulty reasoning tasks. How can I assist you today?";
  }

  private generateClaudeResponse(message: string): string {
    if (message.includes("code") || message.includes("programming")) {
      return "Greetings! I'm Claude 4 Sonnet, and I excel at coding tasks. I can provide both quick responses and deep thinking when needed. Let me help you with your programming challenge using my hybrid reasoning capabilities.";
    }
    return "Hello! I'm Claude 4 Sonnet, featuring hybrid reasoning with both near-instant responses and extended thinking capabilities. I'm particularly strong at coding and complex reasoning. How may I assist you?";
  }

  private generateDeepSeekResponse(message: string): string {
    return `Let me think about this step by step...

    🤔 **Reasoning Process:**
    1. Analyzing your question: "${message}"
    2. Considering multiple approaches
    3. Verifying my reasoning chain

    **Response:** As DeepSeek R1, I'm designed for complex reasoning tasks. I use reinforcement learning and chain-of-thought processing to provide thorough, well-reasoned responses. 

    **Self-verification:** This response demonstrates my reasoning capabilities while being helpful and informative.`;
  }

  private generateGPT5Response(message: string): string {
    if (message.includes("hello") || message.includes("hi")) {
      return "Hello! I'm GPT-5, OpenAI's most advanced language model. I'm designed for complex reasoning, creative tasks, and sophisticated problem-solving. How can I help you today?";
    } else if (message.includes("code") || message.includes("programming")) {
      return "I'd be happy to help with coding! As GPT-5, I have advanced capabilities in code generation, debugging, and explaining complex programming concepts. What programming challenge are you working on?";
    } else if (message.includes("creative") || message.includes("write")) {
      return "Excellent! Creative writing is one of my strengths. I can help with storytelling, poetry, creative fiction, or any other creative endeavor. What kind of creative project are you working on?";
    }

    return `Thank you for your message! As GPT-5, I'm here to help with complex tasks, detailed analysis, and creative problem-solving. I notice you mentioned: "${message}". Let me provide a thoughtful response based on my advanced reasoning capabilities.

    Is there something specific you'd like me to elaborate on or help you with?`;
  }
}
