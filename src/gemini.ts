/**
 * Gemini API integration for PR description generation
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as core from '@actions/core';
import { GeminiConfig } from './types';

/**
 * Initialize the Gemini client
 */
export function initializeGemini(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate content using Gemini
 */
export async function generateDescription(
  config: GeminiConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const genAI = initializeGemini(config.apiKey);
  
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });

  core.debug(`Using Gemini model: ${config.model}`);
  core.debug(`Max tokens: ${config.maxTokens}, Temperature: ${config.temperature}`);

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.debug(`Generation attempt ${attempt}/${maxRetries}`);
      
      const result = await model.generateContent(userPrompt);
      const response = result.response;
      
      if (!response) {
        throw new Error('No response received from Gemini API');
      }

      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response received from Gemini API');
      }

      core.debug(`Successfully generated description (${text.length} characters)`);
      return text.trim();
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      core.warning(`Attempt ${attempt} failed: ${lastError.message}`);
      
      // Check if error is retryable
      if (isRetryableError(lastError)) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          core.debug(`Waiting ${delay}ms before retry...`);
          await sleep(delay);
        }
      } else {
        // Non-retryable error, throw immediately
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Failed to generate description after all retries');
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('quota')) {
    return true;
  }
  
  // Service unavailable
  if (message.includes('503') || message.includes('service unavailable')) {
    return true;
  }
  
  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return true;
  }
  
  // Internal server error
  if (message.includes('500') || message.includes('internal server error')) {
    return true;
  }
  
  return false;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate the Gemini API key format
 */
export function validateApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Gemini API key is required');
  }
  
  // Basic format validation (API keys are typically 39 characters)
  if (apiKey.length < 20) {
    throw new Error('Gemini API key appears to be invalid (too short)');
  }
}

/**
 * Get available model names
 */
export function getAvailableModels(): string[] {
  return [
    'gemini-3-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
  ];
}

/**
 * Validate model name
 */
export function validateModel(model: string): void {
  const availableModels = getAvailableModels();
  
  // Allow any model name but warn if not in known list
  if (!availableModels.includes(model) && !model.startsWith('gemini-')) {
    core.warning(`Model '${model}' is not a recognized Gemini model. Known models: ${availableModels.join(', ')}`);
  }
}
