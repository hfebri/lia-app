"use client";

import type { AIMessage, AIResponse } from "./types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamingChatResponse {
  content: string;
  isComplete: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatServiceOptions {
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export class ChatService {
  private static instance: ChatService;
  private baseUrl: string;
  private messageCounter: number = 0;

  constructor() {
    // Use relative URL for API calls
    this.baseUrl = "/api";
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Send a chat message and get a response
   */
  async sendMessage(
    messages: ChatMessage[],
    options: ChatServiceOptions = {}
  ): Promise<AIResponse> {
    const {
      model = "openai/gpt-5",
      temperature = 0.7,
      maxTokens = 1000,
    } = options;

    // Convert messages to AI format
    const aiMessages: AIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: aiMessages,
        model,
        stream: false,
        temperature,
        maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to get AI response");
    }

    return data.data;
  }

  /**
   * Send a chat message and get a streaming response
   */
  async *sendStreamingMessage(
    messages: ChatMessage[],
    options: ChatServiceOptions = {}
  ): AsyncGenerator<StreamingChatResponse> {
    const {
      model = "openai/gpt-5",
      temperature = 0.7,
      maxTokens = 1000,
    } = options;

    // Convert messages to AI format
    const aiMessages: AIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: aiMessages,
        model,
        stream: true,
        temperature,
        maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body available");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              yield {
                content: parsed.content || "",
                isComplete: parsed.isComplete || false,
                usage: parsed.usage,
              };

              if (parsed.isComplete) {
                return;
              }
            } catch (parseError) {
              console.warn("Failed to parse streaming data:", data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get available AI models
   */
  async getAvailableModels() {
    const response = await fetch(`${this.baseUrl}/ai/models`);

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch models");
    }

    return data.data;
  }

  /**
   * Create a new chat message
   */
  createMessage(
    role: "user" | "assistant" | "system",
    content: string,
    options: Partial<ChatMessage> = {}
  ): ChatMessage {
    // Generate a more robust unique ID
    this.messageCounter += 1;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const counter = this.messageCounter.toString(36);

    return {
      id: `msg_${timestamp}_${counter}_${random}`,
      role,
      content,
      timestamp: new Date(),
      ...options,
    };
  }

  /**
   * Validate message content
   */
  validateMessage(content: string): { isValid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: "Message content cannot be empty" };
    }

    if (content.length > 10000) {
      return {
        isValid: false,
        error: "Message content is too long (max 10,000 characters)",
      };
    }

    return { isValid: true };
  }
}
