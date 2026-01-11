/**
 * Unit tests for prompt generation
 */

import { getSystemPrompt, buildUserPrompt, DEFAULT_SYSTEM_PROMPT } from '../src/prompts';

describe('Prompts', () => {
  describe('getSystemPrompt', () => {
    it('should return default prompt when no custom prompt provided', () => {
      const result = getSystemPrompt();
      expect(result).toBe(DEFAULT_SYSTEM_PROMPT);
    });

    it('should return custom prompt when provided', () => {
      const customPrompt = 'You are a helpful assistant.';
      const result = getSystemPrompt(customPrompt);
      expect(result).toBe(customPrompt);
    });

    it('should add language instruction for non-English languages', () => {
      const result = getSystemPrompt(undefined, 'es');
      expect(result).toContain(DEFAULT_SYSTEM_PROMPT);
      expect(result).toContain('español');
    });

    it('should not add language instruction for English', () => {
      const result = getSystemPrompt(undefined, 'en');
      expect(result).toBe(DEFAULT_SYSTEM_PROMPT);
    });

    it('should handle empty custom prompt', () => {
      const result = getSystemPrompt('  ', 'en');
      expect(result).toBe(DEFAULT_SYSTEM_PROMPT);
    });
  });

  describe('buildUserPrompt', () => {
    const commits = [
      { sha: 'abc1234567890', message: 'Add new feature', author: 'developer' },
      { sha: 'def9876543210', message: 'Fix bug\n\nDetailed description', author: 'dev2' },
    ];

    const files = [
      { filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5, patch: '+new line\n-old line' },
      { filename: 'README.md', status: 'added', additions: 20, deletions: 0 },
    ];

    it('should include PR title', () => {
      const result = buildUserPrompt(
        'Add feature X',
        'main',
        'feature-x',
        commits,
        files,
        30,
        5,
        ''
      );
      expect(result).toContain('Add feature X');
    });

    it('should include branch information', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        ''
      );
      expect(result).toContain('main');
      expect(result).toContain('feature');
    });

    it('should include commit messages when enabled', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        '',
        undefined,
        true,
        true
      );
      expect(result).toContain('abc1234');
      expect(result).toContain('Add new feature');
      expect(result).toContain('developer');
    });

    it('should exclude commit messages when disabled', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        '',
        undefined,
        true,
        false
      );
      expect(result).not.toContain('abc1234');
      expect(result).not.toContain('Commits');
    });

    it('should include file changes when enabled', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        '',
        undefined,
        true,
        true
      );
      expect(result).toContain('src/index.ts');
      expect(result).toContain('README.md');
      expect(result).toContain('modified');
      expect(result).toContain('added');
    });

    it('should exclude file changes when disabled', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        '',
        undefined,
        false,
        true
      );
      expect(result).not.toContain('src/index.ts');
      expect(result).not.toContain('Changed Files');
    });

    it('should include custom instructions when provided', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        '',
        'Focus on security',
        true,
        true
      );
      expect(result).toContain('Focus on security');
      expect(result).toContain('Additional Instructions');
    });

    it('should include existing description when present', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        'Existing description content',
        undefined,
        true,
        true
      );
      expect(result).toContain('Existing description content');
      expect(result).toContain('Existing Description');
    });

    it('should include diff patches', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        '',
        undefined,
        true,
        true
      );
      expect(result).toContain('+new line');
      expect(result).toContain('-old line');
      expect(result).toContain('```diff');
    });

    it('should include total changes', () => {
      const result = buildUserPrompt(
        'Test PR',
        'main',
        'feature',
        commits,
        files,
        30,
        5,
        ''
      );
      expect(result).toContain('+30');
      expect(result).toContain('-5');
    });
  });
});
