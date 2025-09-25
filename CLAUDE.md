# Alfred CLI

## Overview
Command-line AI assistant similar to Claude Code, powered by Claude AI with React/Ink terminal UI.

## Critical Build Step
**ALWAYS run after code changes:**
```bash
npm run build
```

## Current Tools
- **TaskWriteTool** - Task management system (only tool implemented)
- Location: `src/tools/implementations/workflow/TaskWriteTool.ts`

## Adding New Tools
1. Create tool class extending `Tool` in `src/tools/implementations/[category]/`
2. Export from category's `index.ts`
3. Tools auto-register on startup
4. See `src/tools/CLAUDE.md` for examples

## Quick Reference
- Entry point: `src/cli.tsx`
- Claude API: `src/services/anthropic.ts`
- Tool system: `src/tools/`
- TypeScript project using ESM modules