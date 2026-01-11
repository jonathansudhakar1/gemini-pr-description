/**
 * Prompt templates for PR description generation
 */

const DEFAULT_SYSTEM_PROMPT = `You are an expert software engineer helping generate clear, comprehensive pull request descriptions.

Your task is to analyze the provided code changes and generate a well-structured PR description.

## Output Format

Generate a PR description with the following sections:

### Summary
A concise 2-3 sentence summary of what this PR does and why.

### Changes Made
A bullet-point list of the specific changes made in this PR:
- Group related changes together
- Be specific about what was added, modified, or removed
- Reference file names when helpful

### Type of Change
Indicate the type(s) of change (check all that apply):
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (code change that neither fixes a bug nor adds a feature)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Test update

### Testing
Describe how these changes can be tested or verified.

### Additional Notes
Any additional context, screenshots, or information reviewers should know.

## Guidelines
- Be concise but comprehensive
- Use technical terms appropriately
- Focus on WHAT changed and WHY, not HOW (the code shows how)
- If the changes are trivial, keep the description brief
- If breaking changes exist, clearly highlight them
- Use markdown formatting for readability`;

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: 'Write the description in English.',
  es: 'Escribe la descripción en español.',
  fr: 'Rédigez la description en français.',
  de: 'Schreiben Sie die Beschreibung auf Deutsch.',
  ja: '説明を日本語で書いてください。',
  zh: '请用中文写描述。',
  ko: '설명을 한국어로 작성하세요.',
  pt: 'Escreva a descrição em português.',
  it: 'Scrivi la descrizione in italiano.',
  ru: 'Напишите описание на русском языке.',
};

/**
 * Get the system prompt for PR description generation
 */
export function getSystemPrompt(customPrompt?: string, language?: string): string {
  const basePrompt = customPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
  
  if (language && language !== 'en' && LANGUAGE_INSTRUCTIONS[language]) {
    return `${basePrompt}\n\n${LANGUAGE_INSTRUCTIONS[language]}`;
  }
  
  return basePrompt;
}

/**
 * Build the user prompt with PR context
 */
export function buildUserPrompt(
  prTitle: string,
  baseBranch: string,
  headBranch: string,
  commits: Array<{ sha: string; message: string; author: string }>,
  files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>,
  totalAdditions: number,
  totalDeletions: number,
  existingDescription: string,
  customInstructions?: string,
  includeFileChanges: boolean = true,
  includeCommitMessages: boolean = true
): string {
  const parts: string[] = [];
  
  parts.push(`# Pull Request: ${prTitle}`);
  parts.push(`**Base Branch:** ${baseBranch}`);
  parts.push(`**Head Branch:** ${headBranch}`);
  parts.push(`**Total Changes:** +${totalAdditions} -${totalDeletions}`);
  parts.push('');
  
  // Add existing description if present (for context)
  if (existingDescription.trim()) {
    parts.push('## Existing Description');
    parts.push(existingDescription.trim());
    parts.push('');
  }
  
  // Add commits
  if (includeCommitMessages && commits.length > 0) {
    parts.push('## Commits');
    for (const commit of commits) {
      const shortSha = commit.sha.substring(0, 7);
      const firstLine = commit.message.split('\n')[0];
      parts.push(`- \`${shortSha}\` ${firstLine} (${commit.author})`);
    }
    parts.push('');
  }
  
  // Add file changes
  if (includeFileChanges && files.length > 0) {
    parts.push('## Changed Files');
    for (const file of files) {
      const stats = `+${file.additions} -${file.deletions}`;
      parts.push(`- **${file.status}**: \`${file.filename}\` (${stats})`);
    }
    parts.push('');
    
    // Add patches for modified files (truncated)
    const filesWithPatches = files.filter(f => f.patch);
    if (filesWithPatches.length > 0) {
      parts.push('## Code Changes');
      for (const file of filesWithPatches) {
        parts.push(`### ${file.filename}`);
        parts.push('```diff');
        parts.push(file.patch || '');
        parts.push('```');
        parts.push('');
      }
    }
  }
  
  // Add custom instructions
  if (customInstructions?.trim()) {
    parts.push('## Additional Instructions');
    parts.push(customInstructions.trim());
    parts.push('');
  }
  
  parts.push('---');
  parts.push('Please generate a comprehensive PR description based on the above information.');
  
  return parts.join('\n');
}

export { DEFAULT_SYSTEM_PROMPT };
