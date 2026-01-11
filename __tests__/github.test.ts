/**
 * Unit tests for GitHub API integration
 */

// Mock @actions/core before imports
jest.mock('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
}));

// Mock @actions/github
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    payload: {
      pull_request: {
        number: 123,
        title: 'Test PR',
        body: 'Test description',
        base: { ref: 'main' },
        head: { ref: 'feature-branch' },
        draft: false,
      },
    },
  },
  getOctokit: jest.fn().mockReturnValue({
    rest: {
      pulls: {
        listFiles: jest.fn().mockResolvedValue({
          data: [
            {
              filename: 'src/index.ts',
              status: 'modified',
              additions: 10,
              deletions: 5,
              patch: '+new line\n-old line',
            },
            {
              filename: 'package-lock.json',
              status: 'modified',
              additions: 100,
              deletions: 100,
              patch: 'large patch content',
            },
          ],
        }),
        listCommits: jest.fn().mockResolvedValue({
          data: [
            {
              sha: 'abc1234567890',
              commit: {
                message: 'Add feature',
                author: { name: 'Developer' },
              },
              author: { login: 'dev' },
            },
          ],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    },
  }),
}));

import { getPRContext, fetchPRDiff, updatePRDescription, createOctokit } from '../src/github';
import * as github from '@actions/github';

describe('GitHub API Integration', () => {
  describe('getPRContext', () => {
    it('should extract PR context from GitHub event', () => {
      const context = getPRContext();
      
      expect(context.owner).toBe('test-owner');
      expect(context.repo).toBe('test-repo');
      expect(context.pullNumber).toBe(123);
      expect(context.title).toBe('Test PR');
      expect(context.currentDescription).toBe('Test description');
      expect(context.baseBranch).toBe('main');
      expect(context.headBranch).toBe('feature-branch');
      expect(context.isDraft).toBe(false);
    });

    it('should throw error when not in PR context', () => {
      // Temporarily remove PR from payload
      const originalPayload = github.context.payload;
      github.context.payload = {};
      
      expect(() => getPRContext()).toThrow('pull_request or pull_request_target');
      
      // Restore
      github.context.payload = originalPayload;
    });
  });

  describe('fetchPRDiff', () => {
    it('should fetch files and commits', async () => {
      const octokit = createOctokit('test-token');
      const diff = await fetchPRDiff(octokit, 'owner', 'repo', 1, 100000, []);
      
      expect(diff.files).toHaveLength(2);
      expect(diff.commits).toHaveLength(1);
      expect(diff.files[0].filename).toBe('src/index.ts');
    });

    it('should filter files by exclude patterns', async () => {
      const octokit = createOctokit('test-token');
      const diff = await fetchPRDiff(octokit, 'owner', 'repo', 1, 100000, ['*.json']);
      
      expect(diff.files).toHaveLength(1);
      expect(diff.files[0].filename).toBe('src/index.ts');
    });

    it('should truncate large diffs', async () => {
      const octokit = createOctokit('test-token');
      const diff = await fetchPRDiff(octokit, 'owner', 'repo', 1, 10, []);
      
      // With very small max, patches should be truncated
      expect(diff.files.some(f => f.patch?.includes('truncated') || f.patch === undefined)).toBe(true);
    });
  });

  describe('updatePRDescription', () => {
    it('should call GitHub API to update PR', async () => {
      const octokit = createOctokit('test-token');
      
      await updatePRDescription(octokit, 'owner', 'repo', 1, 'New description');
      
      expect(octokit.rest.pulls.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
        body: 'New description',
      });
    });
  });

  describe('createOctokit', () => {
    it('should create Octokit instance', () => {
      const octokit = createOctokit('test-token');
      expect(octokit).toBeDefined();
      expect(github.getOctokit).toHaveBeenCalledWith('test-token');
    });
  });
});
