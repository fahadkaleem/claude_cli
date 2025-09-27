# Tools System - Developer Guide

## Architecture Overview

The tools system follows **Gemini's clean architecture pattern**:
- Tools return structured data, not UI components
- UI components consume tool results via type discrimination
- Clear separation: Core (business logic) vs UI (presentation)

## Directory Structure

```
src/tools/
├── core/
│   ├── Tool.ts              # Abstract base class
│   ├── ToolExecutor.ts      # Executes tools by name
│   ├── ToolRegistry.ts      # Tool registration system
│   └── types.ts             # Core type definitions
├── implementations/
│   ├── filesystem/
│   │   └── ReadTool.ts      # Example: file reading
│   └── workflow/
│       └── TaskWriteTool.ts # Example: task management
└── ui/
    ├── components/
    │   └── TaskList.tsx     # Custom display components
    ├── PillBadge.tsx        # Reusable pill badge
    └── ToolMessage.tsx      # Main tool result renderer
```

## Tool Result Interface (Gemini Pattern)

**CRITICAL**: Tools must return this exact structure:

```typescript
export interface ToolResult {
  llmContent: string;               // Required: What Claude sees in conversation
  returnDisplay: ToolResultDisplay; // Required: What user sees in UI
  error?: ToolError;                // Optional: If present, tool failed
}
```

**Success is determined by absence of `error` field, NOT a boolean flag.**

## Return Display Types

Tools can return different display types via discriminated union:

```typescript
export type ToolResultDisplay =
  | string              // Markdown or plain text
  | FileDiff            // File edit diffs
  | AnsiOutput          // Terminal output with ANSI codes
  | TaskListDisplay;    // Custom task lists
```

### Type 1: String (Markdown/Text)

**Use for:** File reads, simple outputs, formatted text

```typescript
return {
  llmContent: `Successfully read file: ${filePath}`,
  returnDisplay: `## File: ${filePath}\n\n\`\`\`\n${content}\n\`\`\``
};
```

**UI Rendering:**
- Automatically detects markdown patterns
- Renders with `<Markdown>` component if patterns found
- Falls back to plain `<Text>` otherwise

### Type 2: FileDiff

**Use for:** Edit/Write tools showing before/after changes

```typescript
export interface FileDiff {
  fileDiff: string;           // Unified diff format
  fileName: string;
  originalContent: string | null;
  newContent: string;
  diffStat?: DiffStat;
  rejected?: boolean;         // True if user rejected this write
  action?: 'create' | 'update'; // Type of file operation
  hunks?: Array<{             // Structured hunks for UnifiedDiff rendering
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: string[];
  }>;
}

return {
  llmContent: `Updated ${fileName} with ${additions} additions`,
  returnDisplay: {
    fileDiff: unifiedDiffString,
    fileName: 'path/to/file.ts',
    originalContent: oldContent,
    newContent: newContent,
    diffStat: { additions: 5, deletions: 2, changes: 7 }
  }
};
```

**UI Rendering:**
- Shows file name prominently
- Displays diff with syntax highlighting
- Shows stats if provided

### Type 3: AnsiOutput

**Use for:** Shell/terminal outputs with colors

```typescript
export interface AnsiOutput {
  type: 'ansi';
  content: string;  // Content with ANSI escape codes
}

return {
  llmContent: `Command executed with exit code ${exitCode}`,
  returnDisplay: {
    type: 'ansi',
    content: rawTerminalOutput  // Keeps ANSI color codes
  }
};
```

**UI Rendering:**
- Preserves ANSI color codes
- Renders in terminal-like display

### Type 4: TaskListDisplay

**Use for:** Task management, checklists, multi-step operations

```typescript
export interface TaskListDisplay {
  type: 'task-list';
  tasks: Array<{
    content: string;
    activeForm: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  }>;
  stats?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
}

return {
  llmContent: `Updated task list with ${stats.total} items`,
  returnDisplay: {
    type: 'task-list',
    tasks: [
      { content: 'Task 1', activeForm: 'Doing task 1', status: 'in_progress' },
      { content: 'Task 2', activeForm: 'Doing task 2', status: 'pending' }
    ],
    stats: { total: 2, pending: 1, inProgress: 1, completed: 0, cancelled: 0 }
  }
};
```

**UI Rendering:**
- Shows checkboxes with status indicators: `[ ]` `[◐]` `[✓]` `[x]`
- Color-coded by status: pending=gray, in_progress=yellow, completed=green, cancelled=red
- Displays in compact list format under pill badge

## Error Handling

**When tool fails, include error field:**

```typescript
return {
  llmContent: `Error: File not found: ${filePath}`,
  returnDisplay: `File not found: ${filePath}`,
  error: {
    message: `File does not exist: ${filePath}`,
    type: ToolErrorType.FILE_NOT_FOUND,
    details: error
  }
};
```

## Creating New Tools

### Step 1: Create Tool Class

```typescript
// src/tools/implementations/category/YourTool.ts
import { Tool } from '../../core/Tool.js';
import type { ToolResult, ToolContext } from '../../core/types.js';

interface YourToolParams {
  param1: string;
  param2?: number;
}

export class YourTool extends Tool<YourToolParams> {
  name = 'your_tool';
  displayName = 'Your Tool';
  description = 'What your tool does';

  getInputSchema() {
    return {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Parameter description' },
        param2: { type: 'number', description: 'Optional parameter' }
      },
      required: ['param1']
    };
  }

  protected async run(params: YourToolParams, context?: ToolContext): Promise<ToolResult> {
    // Your tool logic here

    return {
      llmContent: 'Summary for Claude',
      returnDisplay: 'Display for user'
    };
  }

  formatParams(params: Record<string, unknown>): string {
    return params.param1 as string;
  }

  summarizeResult(result: ToolResult): string {
    if (result.error) {
      return `Error: ${result.error.message}`;
    }
    return 'Completed successfully';
  }
}
```

### Step 2: Export from Category Index

```typescript
// src/tools/implementations/category/index.ts
export * from './YourTool.js';
```

### Step 3: Tool Auto-Registration

Tools are automatically registered on startup via `ToolRegistry.ts`. No manual registration needed!

## Creating Custom Display Components

If you need a new display type (beyond string/FileDiff/AnsiOutput/TaskList):

### Step 1: Define Type in types.ts

```typescript
// src/tools/core/types.ts
export interface CustomDisplay {
  type: 'custom';
  // Your custom fields
  data: SomeData;
}

export type ToolResultDisplay =
  | string
  | FileDiff
  | AnsiOutput
  | TaskListDisplay
  | CustomDisplay;  // Add your type
```

### Step 2: Create Component

```typescript
// src/tools/ui/components/CustomDisplay.tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { CustomDisplay } from '../../core/types.js';

interface CustomDisplayProps {
  display: CustomDisplay;
}

export const CustomDisplay: React.FC<CustomDisplayProps> = ({ display }) => {
  return (
    <Box>
      <Text>Your custom rendering here</Text>
    </Box>
  );
};
```

### Step 3: Add to ToolMessage Renderer

```typescript
// src/tools/ui/ToolMessage.tsx
import { CustomDisplay } from './components/CustomDisplay.js';

// In ToolResultRenderer component:
if (typeof resultDisplay === 'object' && 'type' in resultDisplay && resultDisplay.type === 'custom') {
  return <CustomDisplay display={resultDisplay as CustomDisplay} />;
}
```

## UI Display Patterns

### Pill Badge (Tool Header)

All tools display with a colored pill badge:
- **Green** = Success (completed)
- **Red** = Error (failed)
- **Gray/Yellow** = In progress (executing)

Format: `ToolName(params)`

### Branch Indicator

Description/output shown below pill with `└>` indicator:
```
ToolName(param)
└> Description here
   Output line 1
   Output line 2
```

### Special Cases

**Tasks**: Show only pill + task list (no `└>` branch)
```
Tasks(7 tasks)
 [ ] Task 1
 [◐] Task 2
 [✓] Task 3
```

**Images**: Hidden from tool display (handled specially in message list)

## Best Practices

1. **Always provide both `llmContent` and `returnDisplay`**
   - `llmContent`: Concise summary for Claude's context
   - `returnDisplay`: Rich formatted output for user

2. **Choose appropriate display type**
   - Simple output? Use string with markdown
   - File changes? Use FileDiff
   - Terminal commands? Use AnsiOutput
   - Multi-step tasks? Use TaskListDisplay

3. **Keep components focused**
   - One component per display type
   - Place in `src/tools/ui/components/`
   - Import in `ToolMessage.tsx`

4. **Follow Gemini patterns**
   - Static service classes (not instances)
   - Type discrimination for rendering
   - No UI logic in tool classes

5. **Error handling**
   - Always catch errors in tool execution
   - Provide helpful error messages
   - Include error type for categorization

## Testing Tools

```bash
# Build after changes
npm run build

# Test in CLI
npm start
# Then trigger your tool in the conversation
```

## Common Patterns

### File Operations
```typescript
return {
  llmContent: `Read ${totalLines} lines from ${filePath}`,
  returnDisplay: `## File: ${filePath}\n\n\`\`\`\n${content}\n\`\`\``
};
```

### Status Updates
```typescript
return {
  llmContent: `Updated ${count} items`,
  returnDisplay: {
    type: 'task-list',
    tasks: updatedTasks,
    stats: calculateStats(tasks)
  }
};
```

### Error Cases
```typescript
return {
  llmContent: `Error: ${errorMessage}`,
  returnDisplay: `Operation failed: ${errorMessage}`,
  error: {
    message: errorMessage,
    type: ToolErrorType.EXECUTION_FAILED,
    details: originalError
  }
};
```

## Key Files Reference

- `src/tools/core/types.ts` - Type definitions (start here for types)
- `src/tools/core/Tool.ts` - Base class (extend this)
- `src/tools/ui/ToolMessage.tsx` - Main renderer (type discrimination)
- `src/tools/ui/components/` - Display components (add new ones here)

## Questions?

1. Does your tool need a custom display? → Add to `ToolResultDisplay` union
2. Is your display reusable? → Create in `ui/components/`
3. Is it tool-specific logic? → Keep in tool class
4. Is it presentation logic? → Move to UI component

Remember: **Tools provide data, UI components render it.**