/**
 * Gemini PR Description Action
 * 
 * Main entry point for the GitHub Action that generates PR descriptions
 * using Google Gemini AI.
 */

import * as core from '@actions/core';
import { ActionInputs, UpdateMode, GeminiConfig } from './types';
import { validateApiKey, validateModel } from './gemini';
import { getPRContext, fetchPRDiff, updatePRDescription, createOctokit } from './github';
import { 
  generatePRDescription, 
  shouldGenerate, 
  applyUpdateMode,
  DEFAULT_MARKER 
} from './description';

/**
 * Parse action inputs from the workflow
 */
function parseInputs(): ActionInputs {
  const geminiApiKey = core.getInput('gemini_api_key', { required: true });
  const githubToken = core.getInput('github_token', { required: true });
  const model = core.getInput('model') || 'gemini-3-flash';
  const updateMode = (core.getInput('update_mode') || 'smart') as UpdateMode;
  const maxTokens = parseInt(core.getInput('max_tokens') || '8192', 10);
  const temperature = parseFloat(core.getInput('temperature') || '0.7');
  const systemPrompt = core.getInput('system_prompt') || '';
  const customInstructions = core.getInput('custom_instructions') || '';
  const includeFileChanges = core.getInput('include_file_changes') !== 'false';
  const includeCommitMessages = core.getInput('include_commit_messages') !== 'false';
  const maxDiffSize = parseInt(core.getInput('max_diff_size') || '50000', 10);
  const excludePatternsRaw = core.getInput('exclude_patterns') || '';
  const excludePatterns = excludePatternsRaw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  const generationMarker = core.getInput('generation_marker') || DEFAULT_MARKER;
  const language = core.getInput('language') || 'en';

  // Validate inputs
  if (!['empty', 'append', 'replace', 'smart'].includes(updateMode)) {
    throw new Error(`Invalid update_mode: ${updateMode}. Must be one of: empty, append, replace, smart`);
  }

  if (maxTokens < 1 || maxTokens > 32768) {
    throw new Error(`Invalid max_tokens: ${maxTokens}. Must be between 1 and 32768`);
  }

  if (temperature < 0 || temperature > 2) {
    throw new Error(`Invalid temperature: ${temperature}. Must be between 0.0 and 2.0`);
  }

  return {
    geminiApiKey,
    githubToken,
    model,
    updateMode,
    maxTokens,
    temperature,
    systemPrompt,
    customInstructions,
    includeFileChanges,
    includeCommitMessages,
    maxDiffSize,
    excludePatterns,
    generationMarker,
    language,
  };
}

/**
 * Main action logic
 */
async function run(): Promise<void> {
  try {
    core.info('🚀 Starting Gemini PR Description Action');

    // Parse inputs
    const inputs = parseInputs();
    core.debug(`Using model: ${inputs.model}`);
    core.debug(`Update mode: ${inputs.updateMode}`);

    // Validate API key and model
    validateApiKey(inputs.geminiApiKey);
    validateModel(inputs.model);

    // Get PR context
    const prContext = getPRContext();
    core.info(`Processing PR #${prContext.pullNumber}: ${prContext.title}`);

    // Check if we should generate
    const { shouldGenerate: generate, reason } = shouldGenerate(
      prContext.currentDescription,
      inputs.updateMode,
      inputs.generationMarker
    );

    if (!generate) {
      core.info(`⏭️ Skipping generation: ${reason}`);
      core.setOutput('description', prContext.currentDescription);
      core.setOutput('generated', 'false');
      core.setOutput('model_used', inputs.model);
      return;
    }

    core.info(`📝 ${reason}`);

    // Create GitHub client
    const octokit = createOctokit(inputs.githubToken);

    // Fetch PR diff and commits
    const diff = await fetchPRDiff(
      octokit,
      prContext.owner,
      prContext.repo,
      prContext.pullNumber,
      inputs.maxDiffSize,
      inputs.excludePatterns
    );

    core.info(`📊 Found ${diff.files.length} changed files, ${diff.commits.length} commits`);
    core.info(`   +${diff.totalAdditions} additions, -${diff.totalDeletions} deletions`);

    // Configure Gemini
    const geminiConfig: GeminiConfig = {
      apiKey: inputs.geminiApiKey,
      model: inputs.model,
      maxTokens: inputs.maxTokens,
      temperature: inputs.temperature,
    };

    // Generate description
    const generatedContent = await generatePRDescription(
      geminiConfig,
      prContext.title,
      prContext.baseBranch,
      prContext.headBranch,
      diff.commits,
      diff.files,
      diff.totalAdditions,
      diff.totalDeletions,
      prContext.currentDescription,
      inputs.systemPrompt,
      inputs.customInstructions,
      inputs.language,
      inputs.includeFileChanges,
      inputs.includeCommitMessages
    );

    // Apply update mode
    const finalDescription = applyUpdateMode(
      prContext.currentDescription,
      generatedContent,
      inputs.updateMode,
      inputs.generationMarker
    );

    // Update PR description
    await updatePRDescription(
      octokit,
      prContext.owner,
      prContext.repo,
      prContext.pullNumber,
      finalDescription
    );

    core.info('✅ PR description updated successfully!');

    // Set outputs
    core.setOutput('description', finalDescription);
    core.setOutput('generated', 'true');
    core.setOutput('model_used', inputs.model);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`❌ Action failed: ${message}`);
  }
}

// Run the action
run();
