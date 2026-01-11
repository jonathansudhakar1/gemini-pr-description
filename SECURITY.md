# Security Policy

## Security Model

The Gemini PR Description action is designed with security as a primary concern. Here's how we keep your repository safe:

### No Code Execution

**This action never checks out or executes any code from pull requests.**

The action only:
1. Reads PR metadata (title, description) via GitHub API
2. Fetches the diff (file changes) via GitHub API
3. Sends this information to Gemini AI
4. Updates the PR description via GitHub API

### Safe with Fork PRs

This action is designed to work safely with the `pull_request_target` event, which allows PRs from forks to trigger workflows while keeping your secrets secure.

```yaml
on:
  pull_request_target:
    types: [opened, synchronize]
```

**Why `pull_request_target` is safe for this action:**
- No code is checked out from the PR
- Secrets (like `GEMINI_API_KEY`) are accessed from the base repository
- The action only reads PR metadata, which is already public

### What NOT to Do

⚠️ **Never combine this action with `actions/checkout` on fork PRs:**

```yaml
# ❌ DANGEROUS - Don't do this!
- uses: actions/checkout@v4
  with:
    ref: ${{ github.event.pull_request.head.ref }}
- uses: your-username/gemini-pr-description@v1
```

The checkout could allow malicious code execution before our action runs.

### Minimal Permissions

The action only requires:
- `pull-requests: write` - To update PR descriptions

```yaml
permissions:
  pull-requests: write
```

### API Key Protection

- Your Gemini API key is never logged or exposed
- It's only used to authenticate with the Gemini API
- Store it as a GitHub secret, never in your workflow file

## Reporting Vulnerabilities

If you discover a security vulnerability, please:

1. **Do not** open a public issue
2. Email security concerns to [your-email@example.com]
3. Include details about the vulnerability and steps to reproduce

We will respond within 48 hours and work to address the issue promptly.

## Best Practices

### Repository Settings

1. **Protect secrets**: Use repository secrets, not environment variables in workflow files
2. **Limit access**: Only give necessary permissions to the workflow
3. **Review PRs**: Always review external PRs before merging

### Workflow Configuration

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
        uses: your-username/gemini-pr-description@v1
        with:
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
```

## References

- [GitHub Security Lab: Keeping your GitHub Actions and workflows secure](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)
- [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target)
