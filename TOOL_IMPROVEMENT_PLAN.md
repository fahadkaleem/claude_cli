# Tool System Improvement Plan

## Phase 1: Core Architecture Refactor (Foundation)

### 1.1 Implement Tool Invocation Pattern
- Create `ToolInvocation` interface for execution instances
- Refactor `Tool` base class to be a builder that creates invocations
- Separate validation from execution logic

**Files to create:**
- `src/tools/core/ToolInvocation.ts` - Invocation interface & base class
- `src/tools/core/DeclarativeTool.ts` - New base tool class

### 1.2 Enhanced Tool Registry
- Add tool discovery mechanism
- Support for tool categories/kinds (Read, Edit, Execute, Search)
- Better duplicate handling

**Files to update:**
- `src/tools/core/ToolRegistry.ts` - Add discovery, categories

---

## Phase 2: Tool Lifecycle & Scheduling

### 2.1 Tool Scheduler
- Create `ToolScheduler` for managing execution
- Support parallel execution
- Add lifecycle states (validating → executing → complete)
- Implement cancellation with AbortSignal

**Files to create:**
- `src/tools/core/ToolScheduler.ts` - Execution management
- `src/tools/core/ToolCall.ts` - Tool call state types

### 2.2 Live Output Streaming
- Add output streaming support for long-running tools
- Update UI to show live output

---

## Phase 3: Safety & Confirmations

### 3.1 Confirmation System
- Add pre-execution confirmation
- Track tool impact (file locations)
- Different confirmation modes

**Files to create:**
- `src/tools/core/ToolConfirmation.ts` - Confirmation logic

---

## Phase 4: Tool Discovery & Extensions

### 4.1 Dynamic Tool Discovery
- Load tools from external scripts
- Support tool packages
- Hot-reload capability

### 4.2 Tool Categories
- Organize tools by function (filesystem, network, exec, etc.)
- Permission system per category

---

## Implementation Example: Refactored Weather Tool

```typescript
// New pattern following Gemini
export class WeatherTool extends DeclarativeTool<WeatherParams, WeatherResult> {
  constructor() {
    super(
      'get_weather',
      'Weather',
      'Get current weather for a city',
      ToolKind.Fetch,
      weatherSchema
    );
  }

  // Create invocation instance with validated params
  build(params: WeatherParams): ToolInvocation<WeatherParams, WeatherResult> {
    const validationError = this.validateParams(params);
    if (validationError) {
      throw new Error(validationError);
    }
    return new WeatherToolInvocation(params);
  }
}

class WeatherToolInvocation extends BaseToolInvocation<WeatherParams, WeatherResult> {
  getDescription(): string {
    return `Fetching weather for ${this.params.city}`;
  }

  async execute(signal: AbortSignal): Promise<WeatherResult> {
    // Actual execution logic here
  }
}
```

## Benefits of This Architecture

1. **Clear Separation**: Validation vs Execution
2. **Reusability**: Same tool, multiple invocations
3. **Testability**: Can test validation and execution separately
4. **Extensibility**: Easy to add new tool types
5. **Safety**: Pre-execution checks and confirmations
6. **Performance**: Parallel execution support

## Quick Wins (Implement First)

1. Tool categories/kinds enum
2. Tool invocation pattern
3. Basic scheduler for parallel execution
4. Improve registry with categories

## Directory Structure

```
src/tools/
├── core/
│   ├── Tool.ts                 # Base tool class (builder)
│   ├── ToolInvocation.ts       # Invocation classes
│   ├── ToolRegistry.ts         # Enhanced registry
│   ├── ToolScheduler.ts        # Execution management
│   ├── ToolConfirmation.ts     # Confirmation system
│   └── types.ts                # All types
├── implementations/
│   ├── filesystem/
│   │   ├── ReadFile.ts
│   │   ├── WriteFile.ts
│   │   └── ListFiles.ts
│   ├── network/
│   │   ├── Weather.ts
│   │   └── WebFetch.ts
│   └── execution/
│       └── Shell.ts
└── ui/
    └── ToolMessage.tsx          # UI components
```