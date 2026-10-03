/**
 * Unit tests for Gemini API integration
 */

import {
  generateDescription,
  validateApiKey,
  validateModel,
  getAvailableModels,
} from '../src/gemini';

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
  describe('generateDescription', () => {
    it.each(['gemini-3.7-flash', 'models/gemini-3.7-flash'])(
      'omits unsupported temperature configuration for Gemini 3.7 Flash model ID %s',
      async model => {
        await generateDescription(
          {
            apiKey: 'this-is-a-valid-length-api-key-12345',
            model,
            maxTokens: 8192,
            temperature: 0.7,
          },
          'System prompt',
          'User prompt'
        );

        const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
        const client = GoogleGenerativeAI.mock.results.at(-1).value;

        expect(client.getGenerativeModel).toHaveBeenCalledWith(
          expect.objectContaining({
            generationConfig: {
              maxOutputTokens: 8192,
            },
          })
        );
      }
    );

    it('keeps temperature configuration for earlier Gemini models', async () => {
      await generateDescription(
        {
          apiKey: 'this-is-a-valid-length-api-key-12345',
          model: 'gemini-2.5-flash',
          maxTokens: 8192,
          temperature: 0.7,
        },
        'System prompt',
        'User prompt'
      );

      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      const client = GoogleGenerativeAI.mock.results.at(-1).value;

      expect(client.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.7,
          },
        })
      );
    });
    it('retries with a rewording instruction after a RECITATION block', async () => {
      const generateContent = jest
        .fn()
        .mockRejectedValueOnce(
          new Error('[GoogleGenerativeAI Error]: Candidate was blocked due to RECITATION')
        )
        .mockResolvedValueOnce({ response: { text: () => 'Reworded description' } });
      const { GoogleGenerativeAI } = jest.requireMock('@google/generative-ai');
      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({ generateContent }),
      }));

      const result = await generateDescription(
        {
          apiKey: 'this-is-a-valid-length-api-key-12345',
          model: 'gemini-3.7-flash',
          maxTokens: 8192,
          temperature: 0.7,
        },
        'System prompt',
        'User prompt'
      );

      expect(result).toBe('Reworded description');
      expect(generateContent).toHaveBeenCalledTimes(2);
      expect(generateContent.mock.calls[0][0]).toBe('User prompt');
      expect(generateContent.mock.calls[1][0]).toContain('in your own words');

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@actions/core').warning.mockClear();
    });
  });

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
      
      validateModel('gemini-3-flash-preview');
      expect(core.warning).not.toHaveBeenCalled();

      validateModel('models/gemini-3.7-flash');
      expect(core.warning).not.toHaveBeenCalled();
      
      validateModel('gemini-2.5-pro');
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
      
      expect(models).toContain('gemini-3.7-flash');
      expect(models).toContain('gemini-3.6-flash');
      expect(models).toContain('gemini-2.5-pro');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
