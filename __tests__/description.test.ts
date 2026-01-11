/**
 * Unit tests for description generation logic
 */

import {
  hasGeneratedContent,
  parseDescription,
  wrapWithMarkers,
  shouldGenerate,
  applyUpdateMode,
  DEFAULT_MARKER,
} from '../src/description';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
}));

describe('Description Logic', () => {
  const marker = DEFAULT_MARKER;
  const endMarker = '<!-- gemini-pr-description-end -->';

  describe('hasGeneratedContent', () => {
    it('should return false for empty description', () => {
      expect(hasGeneratedContent('', marker)).toBe(false);
    });

    it('should return false for description without markers', () => {
      expect(hasGeneratedContent('Some regular description', marker)).toBe(false);
    });

    it('should return false for description with only start marker', () => {
      expect(hasGeneratedContent(`${marker}\nSome content`, marker)).toBe(false);
    });

    it('should return true for description with both markers', () => {
      const content = `${marker}\nGenerated content\n${endMarker}`;
      expect(hasGeneratedContent(content, marker)).toBe(true);
    });
  });

  describe('parseDescription', () => {
    it('should return full content as beforeMarker when no markers present', () => {
      const result = parseDescription('Regular content', marker);
      expect(result.beforeMarker).toBe('Regular content');
      expect(result.generatedContent).toBe('');
      expect(result.afterMarker).toBe('');
    });

    it('should correctly parse content with markers', () => {
      const content = `Before content\n\n${marker}\nGenerated\n${endMarker}\n\nAfter content`;
      const result = parseDescription(content, marker);
      
      expect(result.beforeMarker).toBe('Before content');
      expect(result.generatedContent).toBe('Generated');
      expect(result.afterMarker).toBe('After content');
    });

    it('should handle markers with no before content', () => {
      const content = `${marker}\nGenerated\n${endMarker}\n\nAfter`;
      const result = parseDescription(content, marker);
      
      expect(result.beforeMarker).toBe('');
      expect(result.generatedContent).toBe('Generated');
      expect(result.afterMarker).toBe('After');
    });

    it('should handle markers with no after content', () => {
      const content = `Before\n\n${marker}\nGenerated\n${endMarker}`;
      const result = parseDescription(content, marker);
      
      expect(result.beforeMarker).toBe('Before');
      expect(result.generatedContent).toBe('Generated');
      expect(result.afterMarker).toBe('');
    });
  });

  describe('wrapWithMarkers', () => {
    it('should wrap content with start and end markers', () => {
      const result = wrapWithMarkers('Test content', marker);
      
      expect(result).toContain(marker);
      expect(result).toContain(endMarker);
      expect(result).toContain('Test content');
    });

    it('should preserve content integrity', () => {
      const content = 'Multi\nline\ncontent';
      const result = wrapWithMarkers(content, marker);
      
      expect(result).toContain(content);
    });
  });

  describe('shouldGenerate', () => {
    describe('empty mode', () => {
      it('should generate when description is empty', () => {
        const result = shouldGenerate('', 'empty', marker);
        expect(result.shouldGenerate).toBe(true);
        expect(result.reason).toContain('empty');
      });

      it('should generate when description is whitespace only', () => {
        const result = shouldGenerate('   \n\n  ', 'empty', marker);
        expect(result.shouldGenerate).toBe(true);
      });

      it('should not generate when description has content', () => {
        const result = shouldGenerate('Some existing content', 'empty', marker);
        expect(result.shouldGenerate).toBe(false);
      });
    });

    describe('append mode', () => {
      it('should always generate', () => {
        expect(shouldGenerate('', 'append', marker).shouldGenerate).toBe(true);
        expect(shouldGenerate('Existing', 'append', marker).shouldGenerate).toBe(true);
      });
    });

    describe('replace mode', () => {
      it('should always generate', () => {
        expect(shouldGenerate('', 'replace', marker).shouldGenerate).toBe(true);
        expect(shouldGenerate('Existing', 'replace', marker).shouldGenerate).toBe(true);
      });
    });

    describe('smart mode', () => {
      it('should always generate', () => {
        expect(shouldGenerate('', 'smart', marker).shouldGenerate).toBe(true);
        expect(shouldGenerate('Existing', 'smart', marker).shouldGenerate).toBe(true);
      });
    });
  });

  describe('applyUpdateMode', () => {
    const generatedContent = 'New generated content';

    describe('empty mode', () => {
      it('should return wrapped content', () => {
        const result = applyUpdateMode('', generatedContent, 'empty', marker);
        expect(result).toContain(marker);
        expect(result).toContain(generatedContent);
      });
    });

    describe('append mode', () => {
      it('should append to existing content with separator', () => {
        const result = applyUpdateMode('Existing', generatedContent, 'append', marker);
        
        expect(result).toContain('Existing');
        expect(result).toContain('---');
        expect(result).toContain(generatedContent);
        expect(result.indexOf('Existing')).toBeLessThan(result.indexOf(generatedContent));
      });

      it('should just return wrapped content when existing is empty', () => {
        const result = applyUpdateMode('', generatedContent, 'append', marker);
        expect(result).not.toContain('---');
        expect(result).toContain(generatedContent);
      });
    });

    describe('replace mode', () => {
      it('should replace entire description', () => {
        const result = applyUpdateMode('Old content', generatedContent, 'replace', marker);
        
        expect(result).not.toContain('Old content');
        expect(result).toContain(generatedContent);
        expect(result).toContain(marker);
      });
    });

    describe('smart mode', () => {
      it('should replace only marked section when markers exist', () => {
        const existing = `User content\n\n${marker}\nOld generated\n${endMarker}\n\nMore user content`;
        const result = applyUpdateMode(existing, generatedContent, 'smart', marker);
        
        expect(result).toContain('User content');
        expect(result).toContain('More user content');
        expect(result).toContain(generatedContent);
        expect(result).not.toContain('Old generated');
      });

      it('should append when no markers exist', () => {
        const result = applyUpdateMode('User content', generatedContent, 'smart', marker);
        
        expect(result).toContain('User content');
        expect(result).toContain(generatedContent);
      });

      it('should just return wrapped content when existing is empty', () => {
        const result = applyUpdateMode('', generatedContent, 'smart', marker);
        
        expect(result).toContain(generatedContent);
        expect(result).toContain(marker);
      });
    });
  });
});
