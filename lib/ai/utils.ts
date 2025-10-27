/**
 * AI utility functions
 */

/**
 * Check if a model name is a Claude model
 * Claude models should skip OCR processing and send files directly
 */
export function isClaudeModel(modelName: string): boolean {
  return modelName.startsWith("claude-") || modelName.includes("claude");
}

/**
 * Check if a model is a GPT model
 */
export function isGPTModel(modelName: string): boolean {
  return modelName.startsWith("gpt-");
}

/**
 * Check if a model supports native vision
 * (can process images without OCR)
 */
export function supportsNativeVision(modelName: string): boolean {
  return isClaudeModel(modelName) || isGPTModel(modelName);
}

/**
 * Check if a model supports native PDF processing
 * (can process PDFs without conversion)
 */
export function supportsNativePDF(modelName: string): boolean {
  return isClaudeModel(modelName);
}
