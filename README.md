# Gemini PR Description

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Gemini%20PR%20Description-blue?logo=github)](https://github.com/marketplace/actions/gemini-pr-description)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Tests](https://github.com/jonathansudhakar1/gemini-pr-description/workflows/Tests/badge.svg)](https://github.com/jonathansudhakar1/gemini-pr-description/actions)

Automatically generate rich, comprehensive pull request descriptions using Google Gemini AI.

![Demo](https://raw.githubusercontent.com/jonathansudhakar1/gemini-pr-description/main/demo.gif)

## Features

- 🤖 **AI-Powered**: Uses Google Gemini AI (default: `gemini-3-flash-preview`) for intelligent description generation
- 📝 **Rich Descriptions**: Generates structured descriptions with summary, changes, type, and testing notes
- 🔄 **Smart Updates**: Multiple update modes - replace, append, smart (preserves user content), or empty-only
- 🌍 **Multi-Language**: Generate descriptions in English, Spanish, French, German, Japanese, Chinese, and more
- 🔒 **Secure**: Works safely with fork PRs using `pull_request_target` - never checks out untrusted code
- ⚙️ **Configurable**: Customize prompts, models, and behavior to match your workflow

## Quick Start

### 1. Get a Gemini API Key

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

### 2. Add the Secret

Add your API key as a repository secret:
- Go to **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret**
- Name: `GEMINI_API_KEY`
- Value: Your API key

### 3. Create the Workflow

Create `.github/workflows/pr-description.yml`:

```yaml
name: Generate PR Description

on:
  pull_request_target:
    types: [opened, synchronize]

permissions:
  pull-requests: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate PR Description
        uses: jonathansudhakar1/gemini-pr-description@v1
        with:
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
```

That's it! The action will now automatically generate descriptions for new PRs and update them when new commits are pushed.

## Configuration

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `gemini_api_key` | ✅ | - | Google Gemini API key |
| `github_token` | ❌ | `github.token` | GitHub token for API access |
| `model` | ❌ | `gemini-3-flash-preview` | Gemini model to use |
| `update_mode` | ❌ | `smart` | How to handle existing descriptions (see below) |
| `max_tokens` | ❌ | `8192` | Maximum tokens for response |
| `temperature` | ❌ | `0.7` | Temperature (0.0-2.0) |
| `system_prompt` | ❌ | Built-in | Custom system prompt |
| `custom_instructions` | ❌ | - | Additional instructions |
| `include_file_changes` | ❌ | `true` | Include file changes in context |
| `include_commit_messages` | ❌ | `true` | Include commit messages |
| `max_diff_size` | ❌ | `50000` | Max diff size in characters |
| `exclude_patterns` | ❌ | - | Glob patterns to exclude files |
| `generation_marker` | ❌ | `<!-- gemini-pr-description -->` | Marker for AI content |
| `language` | ❌ | `en` | Output language |

### Update Modes

| Mode | Description |
|------|-------------|
| `empty` | Only generate if description is empty |
| `append` | Add generated content below existing content |
| `replace` | Replace the entire description |
| `smart` | Replace only AI-generated content (between markers), preserve user content |

### Outputs

| Output | Description |
|--------|-------------|
| `description` | The generated/updated PR description |
| `generated` | `true` if description was generated |
| `model_used` | The Gemini model that was used |

## Examples

### Basic Usage

```yaml
- uses: jonathansudhakar1/gemini-pr-description@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
```

### With Custom Instructions

```yaml
- uses: jonathansudhakar1/gemini-pr-description@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
    custom_instructions: |
      Focus on security implications.
      Mention any breaking changes prominently.
```

### Generate in Spanish

```yaml
- uses: jonathansudhakar1/gemini-pr-description@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
    language: es
```

### Only Generate for Empty Descriptions

```yaml
- uses: jonathansudhakar1/gemini-pr-description@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
    update_mode: empty
```

### Use Different Model

```yaml
- uses: jonathansudhakar1/gemini-pr-description@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
    model: gemini-1.5-pro
```

### Exclude Lock Files

```yaml
- uses: jonathansudhakar1/gemini-pr-description@v1
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
    exclude_patterns: "*.lock,package-lock.json,yarn.lock"
```

### Update on Every Push

```yaml
name: Generate PR Description

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: jonathansudhakar1/gemini-pr-description@v1
        with:
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
          update_mode: smart
```

## Security

This action is designed with security in mind:

- **No Code Checkout**: Never checks out or executes PR code
- **Minimal Permissions**: Only requires `pull-requests: write`
- **Fork Safe**: Works with `pull_request_target` without exposing secrets
- **Content Filtering**: Gemini safety settings enabled by default

See [SECURITY.md](SECURITY.md) for detailed security information.

## Available Models

- `gemini-3-flash-preview` (default) - Latest Gemini 3 flash model
- `gemini-3-pro-preview` - Gemini 3 pro model
- `gemini-2.5-flash` - Gemini 2.5 flash
- `gemini-2.5-flash-preview-09-2025` - Gemini 2.5 flash preview
- `gemini-2.5-flash-lite` - Lightweight 2.5 flash
- `gemini-2.5-pro` - Gemini 2.5 pro
- `gemini-2.0-flash` - Gemini 2.0 flash
- `gemini-2.0-flash-lite` - Lightweight 2.0 flash

## Troubleshooting

### "Gemini API key is required"

Make sure you've added `GEMINI_API_KEY` to your repository secrets.

### "This action must be run on a pull_request or pull_request_target event"

Ensure your workflow is triggered by PR events:
```yaml
on:
  pull_request_target:
    types: [opened]
```

### Description not updating

Check the `update_mode` setting. Use `smart` or `replace` to update existing descriptions.

### Large PRs timing out

Reduce `max_diff_size` or add more `exclude_patterns` for large files.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the [Apache 2.0 License](LICENSE).
