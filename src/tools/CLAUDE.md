# Tool System Guide

## How to Add a New Tool

### Step 1: Choose the Category
- `fetch/` - API calls, weather, web data fetching
- Create new directories as needed: `filesystem/`, `execution/`, `ai/`, etc.

### Step 2: Create Your Tool Class

```typescript
import { Tool } from '../../core/Tool.js';
import { ToolKind, ToolErrorType, type ToolResult, type ToolContext } from '../../core/types.js';

// Define your params interface
interface MyToolParams extends Record<string, unknown> {
  param1: string;
  optionalParam?: number;
}

export class MyTool extends Tool<MyToolParams> {
  // Required: API name the assistant will use
  readonly name = 'my_tool_name';

  // Required: User-friendly display name
  readonly displayName = 'My Tool';

  // Required: Clear description of what the tool does
  readonly description = 'Detailed description of tool functionality';

  // Required: Category - use ToolKind.Other if doesn't fit existing
  readonly kind = ToolKind.Fetch;

  // Required: JSON Schema for parameters
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      param1: {
        type: 'string',
        description: 'What this parameter does',
      },
      optionalParam: {
        type: 'number',
        description: 'Optional parameter description',
      },
    },
    required: ['param1'],
  };

  // Optional: Override for cleaner parameter display
  formatParams(params: MyToolParams): string {
    return params.param1; // Show just the main param instead of JSON
  }

  // Optional: Override for one-line result summary
  summarizeResult(result: ToolResult): string {
    if (!result.success) {
      return `Failed: ${result.error?.message}`;
    }
    return 'Operation completed successfully';
  }

  // Required: Implement the tool logic
  protected async run(params: MyToolParams, context?: ToolContext): Promise<ToolResult> {
    const { param1, optionalParam } = params;

    // Optional: Show progress
    context?.onProgress?.(`Processing ${param1}...`);

    try {
      // Your tool logic here
      const result = await yourApiCall(param1);

      return {
        success: true,
        output: result,
        display: {
          type: 'markdown', // or 'text', 'json', 'error'
          content: `## Result\n\nProcessed: ${result}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: ToolErrorType.EXECUTION_FAILED,
          details: error
        },
        display: {
          type: 'error',
          content: `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }
}
```

### Step 3: Export from Category Index

Add to `src/tools/implementations/[category]/index.ts`:

```typescript
export { MyTool } from './MyTool.js';
```

### Step 4: Done!
The tool is automatically registered when the app starts. No manual registration needed.

## Tool Categories (ToolKind)

Current categories:
- `Fetch` - API calls, web requests, data fetching
- `Other` - Default for uncategorized tools

To add a new category:
1. Add to `ToolKind` enum in `src/tools/core/types.ts`
2. Create new directory in `implementations/`
3. Update `src/tools/index.ts` to export the new category

## Quick Examples

### Simple API Tool
```typescript
export class GitHubUserTool extends Tool<{username: string}> {
  readonly name = 'github_user';
  readonly displayName = 'GitHub User';
  readonly description = 'Get GitHub user information';
  readonly kind = ToolKind.Fetch;

  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      username: { type: 'string', description: 'GitHub username' },
    },
    required: ['username'],
  };

  protected async run(params: {username: string}): Promise<ToolResult> {
    const response = await fetch(`https://api.github.com/users/${params.username}`);
    const data = await response.json();

    return {
      success: true,
      output: data,
      display: {
        type: 'markdown',
        content: `**${data.name}** - ${data.bio}\nFollowers: ${data.followers}`,
      },
    };
  }
}
```

### Tool with Progress Updates
```typescript
protected async run(params: MyParams, context?: ToolContext): Promise<ToolResult> {
  context?.onProgress?.('Starting process...');

  // Long operation
  await step1();
  context?.onProgress?.('Step 1 complete...');

  await step2();
  context?.onProgress?.('Step 2 complete...');

  return { success: true, output: result };
}
```

## Directory Structure
```
src/tools/
├── core/
│   ├── Tool.ts           # Base class
│   ├── ToolRegistry.ts   # Auto-registration
│   └── types.ts          # All types
├── implementations/
│   └── fetch/
│       ├── WeatherTool.ts
│       ├── TimezoneTool.ts
│       └── index.ts      # Export all fetch tools
├── index.ts              # Main export
└── ALFRED.md            # This file
```

## Best Practices

1. **Keep tools focused** - One tool, one job
2. **Use clear names** - Tool name should describe what it does
3. **Provide good descriptions** - Help the assistant understand when to use the tool
4. **Handle errors gracefully** - Always return proper error messages
5. **Use appropriate display types** - markdown for rich content, text for simple, error for failures
6. **Implement formatParams** - Makes tool calls more readable in the UI
7. **Add progress updates** - For long-running operations

## Testing Your Tool

1. Build: `npm run build`
2. Run: `npm start`
3. Ask Alfred to use your tool: "Can you [use your tool] for [params]?"

## Need Help?

- All tools extend `Tool` base class from `core/Tool.ts`
- See `WeatherTool.ts` or `TimezoneTool.ts` for complete examples
- Tools are auto-discovered via `toolRegistry.autoRegister()` in App.tsx
- No manual registration, no defensive code, no backwards compatibility needed