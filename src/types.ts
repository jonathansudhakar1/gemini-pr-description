/**
 * Type definitions for the Gemini PR Description Action
 */

export type UpdateMode = 'empty' | 'append' | 'replace' | 'smart';

export interface ActionInputs {
  geminiApiKey: string;
  githubToken: string;
  model: string;
  updateMode: UpdateMode;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  customInstructions: string;
  includeFileChanges: boolean;
  includeCommitMessages: boolean;
  maxDiffSize: number;
  excludePatterns: string[];
  generationMarker: string;
  language: string;
}

export interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  currentDescription: string;
  baseBranch: string;
  headBranch: string;
  isDraft: boolean;
}

export interface FileChange {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PRDiff {
  files: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
  commits: CommitInfo[];
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
}

export interface GenerationContext {
  prTitle: string;
  prDescription: string;
  baseBranch: string;
  headBranch: string;
  files: FileChange[];
  commits: CommitInfo[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface GenerationResult {
  description: string;
  model: string;
  generated: boolean;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}
