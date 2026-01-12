/**
 * Description generation and manipulation logic
 */

import * as core from '@actions/core';
import { UpdateMode, FileChange, CommitInfo, GeminiConfig } from './types';
import { getSystemPrompt, buildUserPrompt } from './prompts';
import { generateDescription as geminiGenerate } from './gemini';

const DEFAULT_MARKER = '<!-- gemini-pr-description -->';
const END_MARKER_SUFFIX = '-end';

/**
 * Generate start and end markers
 */
function getMarkers(marker: string): { start: string; end: string } {
  const baseMarker = marker.replace(/\s*-->$/, '').trim();
  return {
    start: marker,
    end: `${baseMarker}${END_MARKER_SUFFIX} -->`,
  };
}

/**
 * Check if description contains generated content markers
 */
export function hasGeneratedContent(description: string, marker: string): boolean {
  const { start, end } = getMarkers(marker);
  return description.includes(start) && description.includes(end);
}

/**
 * Extract user content and generated content from description
 */
export function parseDescription(description: string, marker: string): {
  beforeMarker: string;
  generatedContent: string;
  afterMarker: string;
} {
  const { start, end } = getMarkers(marker);
  
  const startIdx = description.indexOf(start);
  const endIdx = description.indexOf(end);
  
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    return {
      beforeMarker: description,
      generatedContent: '',
      afterMarker: '',
    };
  }
  
  return {
    beforeMarker: description.substring(0, startIdx).trim(),
    generatedContent: description.substring(startIdx + start.length, endIdx).trim(),
    afterMarker: description.substring(endIdx + end.length).trim(),
  };
}

/**
 * Wrap content with markers
 */
export function wrapWithMarkers(content: string, marker: string): string {
  const { start, end } = getMarkers(marker);
  return `${start}\n\n${content}\n\n${end}`;
}

/**
 * Determine if we should generate a description based on update mode
 */
export function shouldGenerate(
  currentDescription: string,
  updateMode: UpdateMode,
  _marker: string
): { shouldGenerate: boolean; reason: string } {
  const trimmedDescription = currentDescription.trim();
  
  switch (updateMode) {
    case 'empty':
      if (trimmedDescription.length === 0) {
        return { shouldGenerate: true, reason: 'Description is empty' };
      }
      return { shouldGenerate: false, reason: 'Description is not empty (mode: empty)' };
    
    case 'append':
      return { shouldGenerate: true, reason: 'Appending to existing description' };
    
    case 'replace':
      return { shouldGenerate: true, reason: 'Replacing entire description' };
    
    case 'smart':
      return { shouldGenerate: true, reason: 'Using smart mode with markers' };
    
    default:
      return { shouldGenerate: true, reason: 'Default mode' };
  }
}

/**
 * Apply the update mode to combine existing and generated content
 */
export function applyUpdateMode(
  existingDescription: string,
  generatedContent: string,
  updateMode: UpdateMode,
  marker: string
): string {
  const wrappedContent = wrapWithMarkers(generatedContent, marker);
  
  switch (updateMode) {
    case 'empty':
      // If we're here, description was empty
      return wrappedContent;
    
    case 'append':
      // Add generated content after existing content
      if (existingDescription.trim()) {
        return `${existingDescription.trim()}\n\n---\n\n${wrappedContent}`;
      }
      return wrappedContent;
    
    case 'replace':
      // Replace everything
      return wrappedContent;
    
    case 'smart':
      // Replace only the marked section, keep user content
      if (hasGeneratedContent(existingDescription, marker)) {
        const { beforeMarker, afterMarker } = parseDescription(existingDescription, marker);
        const parts = [beforeMarker, wrappedContent, afterMarker]
          .filter(p => p.trim().length > 0);
        return parts.join('\n\n');
      }
      // No existing markers, append with markers
      if (existingDescription.trim()) {
        return `${existingDescription.trim()}\n\n${wrappedContent}`;
      }
      return wrappedContent;
    
    default:
      return wrappedContent;
  }
}

/**
 * Generate a PR description using Gemini
 */
export async function generatePRDescription(
  geminiConfig: GeminiConfig,
  prTitle: string,
  baseBranch: string,
  headBranch: string,
  commits: CommitInfo[],
  files: FileChange[],
  totalAdditions: number,
  totalDeletions: number,
  existingDescription: string,
  customSystemPrompt: string,
  customInstructions: string,
  language: string,
  includeFileChanges: boolean,
  includeCommitMessages: boolean
): Promise<string> {
  core.info('Generating PR description with Gemini...');
  
  // Build prompts
  const systemPrompt = getSystemPrompt(customSystemPrompt, language);
  const userPrompt = buildUserPrompt(
    prTitle,
    baseBranch,
    headBranch,
    commits,
    files,
    totalAdditions,
    totalDeletions,
    existingDescription,
    customInstructions,
    includeFileChanges,
    includeCommitMessages
  );
  
  core.debug(`System prompt length: ${systemPrompt.length}`);
  core.debug(`User prompt length: ${userPrompt.length}`);
  
  // Generate using Gemini
  const generatedContent = await geminiGenerate(geminiConfig, systemPrompt, userPrompt);
  
  core.info(`Generated description: ${generatedContent.length} characters`);
  
  return generatedContent;
}

export { DEFAULT_MARKER };
