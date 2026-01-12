# Contributing to Gemini PR Description

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jonathansudhakar1/gemini-pr-description.git
   cd gemini-pr-description
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
gemini-pr-description/
├── src/                    # TypeScript source files
│   ├── index.ts           # Main entry point
│   ├── gemini.ts          # Gemini API integration
│   ├── github.ts          # GitHub API integration
│   ├── prompts.ts         # Prompt templates
│   ├── description.ts     # Description logic
│   └── types.ts           # Type definitions
├── __tests__/             # Test files
├── dist/                  # Compiled JavaScript (generated)
├── action.yml             # GitHub Action definition
└── package.json           # Project configuration
```

## Development Workflow

### Making Changes

1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes in `src/`

3. Run type checking
   ```bash
   npm run typecheck
   ```

4. Run linting
   ```bash
   npm run lint
   ```

5. Run tests
   ```bash
   npm test
   ```

6. Build the action
   ```bash
   npm run build
   ```

### Testing Locally

To test the action locally, you can:

1. Create a `.env` file with test values (don't commit this!)
2. Use the compiled `dist/index.js` in a test workflow

### Pull Request Guidelines

- Keep PRs focused and atomic
- Include tests for new functionality
- Update documentation if needed
- Ensure all tests pass
- Follow existing code style

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for public functions
- Keep functions small and focused

## Testing

We use Jest for testing. Tests are located in `__tests__/`.

- **Unit tests**: Test individual functions
- **Integration tests**: Test the full action flow (with mocks)

Run specific tests:
```bash
npm test -- --testPathPattern=gemini
```

Run with coverage:
```bash
npm test -- --coverage
```

## Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## Questions?

Open an issue for questions or discussions about contributing.
