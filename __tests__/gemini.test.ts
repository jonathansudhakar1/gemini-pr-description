/**
 * Unit tests for Gemini API integration
 */

import { validateApiKey, validateModel, getAvailableModels } from '../src/gemini';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn(),
  setOutput: jest.fn(),
}));

// Mock @google/generative-ai
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Generated description',
        },
      }),
    }),
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  },
}));

describe('Gemini API Integration', () => {
  describe('validateApiKey', () => {
    it('should throw error for empty API key', () => {
      expect(() => validateApiKey('')).toThrow('Gemini API key is required');
    });

    it('should throw error for whitespace-only API key', () => {
      expect(() => validateApiKey('   ')).toThrow('Gemini API key is required');
    });

    it('should throw error for too short API key', () => {
      expect(() => validateApiKey('short')).toThrow('Gemini API key appears to be invalid');
    });

    it('should not throw for valid-length API key', () => {
      expect(() => validateApiKey('this-is-a-valid-length-api-key-12345')).not.toThrow();
    });
  });

  describe('validateModel', () => {
    it('should not warn for known models', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const core = require('@actions/core');
      
      validateModel('gemini-2.0-flash');
      expect(core.warning).not.toHaveBeenCalled();
      
      validateModel('gemini-1.5-pro');
      expect(core.warning).not.toHaveBeenCalled();
    });

    it('should warn for unknown non-gemini models', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const core = require('@actions/core');
      core.warning.mockClear();
      
      validateModel('gpt-4');
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('not a recognized Gemini model')
      );
    });

    it('should not warn for unknown gemini models', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const core = require('@actions/core');
      core.warning.mockClear();
      
      validateModel('gemini-3.0-ultra');
      expect(core.warning).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of known models', () => {
      const models = getAvailableModels();
      
      expect(models).toContain('gemini-2.0-flash');
      expect(models).toContain('gemini-1.5-pro');
      expect(models).toContain('gemini-1.5-flash');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
