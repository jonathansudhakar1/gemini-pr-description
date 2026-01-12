/**
 * GitHub API integration for PR operations
 */

import * as github from '@actions/github';
import * as core from '@actions/core';
import { minimatch } from 'minimatch';
import { PRContext, PRDiff, FileChange, CommitInfo } from './types';

type Octokit = ReturnType<typeof github.getOctokit>;

/**
 * Get PR context from the GitHub event
 */
export function getPRContext(): PRContext {
  const context = github.context;
  
  if (!context.payload.pull_request) {
    throw new Error('This action must be run on a pull_request or pull_request_target event');
  }
  
  const pr = context.payload.pull_request;
  
  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pullNumber: pr.number,
    title: pr.title || '',
    currentDescription: pr.body || '',
    baseBranch: pr.base?.ref || 'main',
    headBranch: pr.head?.ref || '',
    isDraft: pr.draft || false,
  };
}

/**
 * Fetch the PR diff and commits
 */
export async function fetchPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  maxDiffSize: number,
  excludePatterns: string[]
): Promise<PRDiff> {
  core.debug(`Fetching diff for PR #${pullNumber} in ${owner}/${repo}`);
  
  // Fetch files changed in the PR
  const { data: filesData } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100, // Maximum allowed
  });
  
  // Filter files based on exclude patterns
  let files: FileChange[] = filesData
    .filter(file => !shouldExcludeFile(file.filename, excludePatterns))
    .map(file => ({
      filename: file.filename,
      status: file.status as FileChange['status'],
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    }));
  
  // Calculate total diff size and truncate if needed
  const totalDiffSize = files.reduce((sum, f) => sum + (f.patch?.length || 0), 0);
  
  if (totalDiffSize > maxDiffSize) {
    core.info(`Diff size (${totalDiffSize}) exceeds max (${maxDiffSize}), truncating patches`);
    files = truncatePatches(files, maxDiffSize);
  }
  
  // Fetch commits
  const { data: commitsData } = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  
  const commits: CommitInfo[] = commitsData.map(commit => ({
    sha: commit.sha,
    message: commit.commit.message,
    author: commit.commit.author?.name || commit.author?.login || 'unknown',
  }));
  
  // Calculate totals
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
  
  core.debug(`Found ${files.length} changed files, ${commits.length} commits`);
  core.debug(`Total changes: +${totalAdditions} -${totalDeletions}`);
  
  return {
    files,
    totalAdditions,
    totalDeletions,
    commits,
  };
}

/**
 * Check if a file should be excluded based on glob patterns
 */
function shouldExcludeFile(filename: string, excludePatterns: string[]): boolean {
  if (excludePatterns.length === 0) {
    return false;
  }
  
  return excludePatterns.some(pattern => {
    try {
      return minimatch(filename, pattern, { dot: true });
    } catch {
      core.warning(`Invalid exclude pattern: ${pattern}`);
      return false;
    }
  });
}

/**
 * Truncate patches to fit within the max diff size
 */
function truncatePatches(files: FileChange[], maxDiffSize: number): FileChange[] {
  // Sort files by patch size (largest first) so we truncate less important (larger) patches first
  const sortedFiles = [...files].sort((a, b) => 
    (b.patch?.length || 0) - (a.patch?.length || 0)
  );
  
  let currentSize = 0;
  const result: FileChange[] = [];
  
  // Process each file
  for (const file of sortedFiles) {
    const patchSize = file.patch?.length || 0;
    
    if (currentSize + patchSize <= maxDiffSize) {
      // Include full patch
      result.push(file);
      currentSize += patchSize;
    } else if (currentSize < maxDiffSize) {
      // Truncate this patch to fit
      const remainingSpace = maxDiffSize - currentSize;
      const truncatedPatch = file.patch?.substring(0, remainingSpace);
      result.push({
        ...file,
        patch: truncatedPatch ? `${truncatedPatch}\n... (truncated)` : undefined,
      });
      currentSize = maxDiffSize;
    } else {
      // No more space for patches, include file info without patch
      result.push({
        ...file,
        patch: undefined,
      });
    }
  }
  
  // Re-sort by original order (by filename)
  return result.sort((a, b) => a.filename.localeCompare(b.filename));
}

/**
 * Update the PR description
 */
export async function updatePRDescription(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  newDescription: string
): Promise<void> {
  core.debug(`Updating PR #${pullNumber} description (${newDescription.length} characters)`);
  
  await octokit.rest.pulls.update({
    owner,
    repo,
    pull_number: pullNumber,
    body: newDescription,
  });
  
  core.info(`Successfully updated PR #${pullNumber} description`);
}

/**
 * Create an Octokit instance
 */
export function createOctokit(token: string): Octokit {
  return github.getOctokit(token);
}
