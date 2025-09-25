# Alfred CLI Architecture Plan

## Overview
Restructuring the Alfred CLI to follow a modular, scalable architecture with clean separation of concerns. This will enable easy addition of features and better maintainability.

## Component Structure

```
src/
├── components/
│   ├── core/                  # Core app structure
│   │   ├── App.tsx            # Main application container
│   │   ├── AppHeader.tsx      # Optional header/banner
│   │   ├── MainContent.tsx    # Chat history area
│   │   ├── Composer.tsx       # Input area wrapper
│   │   └── Footer.tsx         # Status bar with model info
│   │
│   ├── messages/              # Message display components
│   │   ├── UserMessage.tsx    # User message display
│   │   ├── AssistantMessage.tsx # AI response display
│   │   ├── SystemMessage.tsx  # System notifications
│   │   ├── ErrorMessage.tsx   # Error message display
│   │   └── MessageList.tsx    # Message container
│   │
│   ├── dialogs/               # Modal/Dialog components
│   │   ├── DialogManager.tsx  # Manages active dialogs
│   │   ├── SettingsDialog.tsx # Settings configuration
│   │   ├── ModelDialog.tsx    # Model selection
│   │   ├── ContextDialog.tsx  # Context management
│   │   └── HelpDialog.tsx     # Help/documentation
│   │
│   ├── input/                 # Input-related components
│   │   ├── ChatInput.tsx      # Text input component
│   │   ├── InputPrompt.tsx    # Input with prompt
│   │   └── SuggestionList.tsx # Auto-complete suggestions
│   │
│   ├── status/                # Status & indicators
│   │   ├── LoadingIndicator.tsx # Loading/thinking animation
│   │   ├── StatusBar.tsx      # General status display
│   │   ├── ContextSummary.tsx # Active context display
│   │   ├── TokenCounter.tsx   # Token usage display
│   │   └── ConnectionStatus.tsx # API connection status
│   │
│   └── shared/                # Reusable UI components
│       ├── Button.tsx         # Button component
│       ├── Select.tsx         # Selection component
│       ├── Spinner.tsx        # Loading spinner
│       └── Box.tsx            # Layout component
│
├── contexts/                  # State management
│   ├── AppContext.tsx         # Global app state
│   ├── ChatContext.tsx        # Chat state management
│   ├── SettingsContext.tsx    # User preferences
│   ├── DialogContext.tsx      # Dialog state
│   └── ThemeContext.tsx       # Theme management
│
├── hooks/                     # Custom hooks
│   ├── useChat.ts             # Chat functionality
│   ├── useSettings.ts         # Settings management
│   ├── useKeyboard.ts         # Keyboard shortcuts
│   └── useTerminalSize.ts     # Terminal dimensions
│
├── services/                  # External services
│   ├── anthropic.ts           # Anthropic API client
│   ├── config.ts              # Configuration loader
│   └── storage.ts             # Local storage
│
├── utils/                     # Utility functions
│   ├── formatters.ts          # Text formatting
│   ├── validators.ts          # Input validation
│   └── helpers.ts             # Helper functions
│
└── types/                     # TypeScript types
    └── index.ts               # Type definitions
```

## Key Benefits

### 1. Scalability
- Easy to add new features
- Clear component organization
- Modular structure for growth

### 2. Maintainability
- Separated concerns
- Clear file locations
- Consistent patterns

### 3. Feature Additions
Ready to support:
- Multiple chat sessions
- File context management
- Settings UI
- Theme customization
- Plugin system
- Command palette
- Keyboard shortcuts
- Export functionality

## Implementation Phases

### Phase 1: Core Restructure
1. Create new directory structure
2. Move existing components to appropriate locations
3. Maintain current functionality

### Phase 2: Context Management
1. Implement Context providers
2. Move state to contexts
3. Remove prop drilling

### Phase 3: Enhanced Components
1. Add Settings Dialog
2. Add Model Selector
3. Add Context Manager
4. Add Help System

### Phase 4: Advanced Features
1. Multi-session support
2. File browser
3. Export/Import chats
4. Plugin system

## Design Principles

1. **Modular**: Each component has a single responsibility
2. **Reusable**: Shared components for common UI elements
3. **Configurable**: User preferences control visibility
4. **Accessible**: Keyboard navigation and screen reader support
5. **Performant**: Optimize for terminal rendering
6. **Extensible**: Easy to add new features

## Current State vs Future State

### Current (Minimal) Structure:
- Simple component structure
- Direct prop passing
- Basic functionality
- Clean but limited

### Future (Modular) Structure:
- Organized by feature
- Context-based state
- Rich functionality
- Scalable architecture

## Next Steps

1. Start with Phase 1 restructuring
2. Keep app functional during migration
3. Test thoroughly after each change
4. Document new patterns
5. Add features incrementally

## Notes

- Following clean architecture principles
- Focus on our specific needs
- Maintain simplicity where possible
- Progressive enhancement approach

## Tool System Architecture

### Overview
Implementing a modular tool system that integrates with Anthropic's function calling capabilities, allowing the assistant to execute actions like fetching weather, running calculations, or interacting with external services.

### Tool Components

```
src/
├── tools/
│   ├── core/
│   │   ├── Tool.ts                 # Base tool class and interfaces
│   │   ├── ToolRegistry.ts         # Tool registration and discovery
│   │   ├── ToolExecutor.ts         # Handles tool execution
│   │   └── types.ts                # Tool-related TypeScript types
│   │
│   ├── implementations/
│   │   ├── WeatherTool.ts          # Example: Weather fetching tool
│   │   ├── CalculatorTool.ts       # Math calculations
│   │   └── index.ts                # Export all tools
│   │
│   └── ui/
│       ├── ToolMessage.tsx         # Display tool calls in chat
│       └── ToolResult.tsx          # Render tool results
```

### Tool Interface

```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute(params: any): Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  output: any;
  display?: {
    type: 'text' | 'markdown' | 'json';
    content: string;
  };
}
```

### Integration Flow

1. **Tool Registration**: Tools register their schemas with the system
2. **API Request**: Include tool schemas in Anthropic API calls
3. **Tool Detection**: Parse streaming response for tool_use blocks
4. **Tool Execution**: Execute requested tools with provided parameters
5. **Result Display**: Show tool execution and results in chat UI
6. **Continuation**: Send tool results back to model if needed

### Example Tool: Weather

The weather tool demonstrates the pattern:
- Defines schema for city input
- Fetches weather data from API
- Returns formatted result
- Displays nicely in chat UI

### Implementation Phases

#### Phase 1: Core Infrastructure (Current)
- Base Tool class
- Tool Registry
- Basic executor
- Weather tool example

#### Phase 2: UI Integration
- Tool message components
- Result rendering
- Status indicators

#### Phase 3: Advanced Tools
- Calculator tool
- File system tool
- Web search tool
- Custom user tools

#### Phase 4: Enhanced Features
- Tool confirmation dialogs
- Streaming tool output
- Tool chaining
- Error recovery

### Benefits

1. **Extensibility**: Easy to add new tools
2. **Type Safety**: Full TypeScript support
3. **User Control**: Optional confirmation for actions
4. **Clean UI**: Consistent tool display in chat
5. **Modularity**: Each tool is self-contained