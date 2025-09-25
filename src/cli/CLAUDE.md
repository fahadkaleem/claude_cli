# CLI Directory Structure and Rules

This directory follows Gemini's architecture for clean, maintainable CLI code.

## Directory Structure

```
cli/
├── config/         # Application-wide configuration
│   └── keyBindings.ts  # Centralized keyboard shortcuts
├── ui/
│   ├── commands/   # Slash command implementations
│   ├── components/ # React components (FLAT structure)
│   ├── contexts/   # React contexts for state management
│   ├── hooks/      # Custom React hooks
│   ├── utils/      # UI utility functions
│   ├── constants.ts # UI constants (colors, messages, etc.)
│   ├── types.ts    # UI-specific TypeScript types
│   └── keyMatchers.ts # Key matching utilities
```

## Architecture Philosophy

Following Gemini's pattern, we separate:
- **Config**: Application-wide settings (keyboard shortcuts, models, etc.)
- **UI**: All presentation and interaction logic

This separation allows config to be shared across different interfaces (CLI, future web UI, etc.)

## CRITICAL RULES

### 1. Components Directory - FLAT Structure
- **NEVER create subdirectories** in components/
- **ALL components go directly in components/**
- Only exception: `components/shared/` for truly shared utilities
- Each component = one file (no component folders)
- Tests go next to components: `ComponentName.test.tsx`

❌ WRONG:
```
components/
  forms/
    InputForm.tsx
  modals/
    ConfirmModal.tsx
```

✅ CORRECT:
```
components/
  InputForm.tsx
  ConfirmModal.tsx
  InputForm.test.tsx
  shared/
    text-buffer.ts  # Shared utilities only
```

### 2. File Naming Conventions

**Config Files**: camelCase
- `keyBindings.ts`
- `modelConfig.ts`

**Components**: PascalCase
- `InputPrompt.tsx`
- `SuggestionsDisplay.tsx`
- `MessageList.tsx`

**Hooks**: camelCase with 'use' prefix
- `useKeypress.ts`
- `useCommandCompletion.tsx`
- `useInputHistory.ts`

**Utils**: camelCase
- `textUtils.ts`
- `commandParser.ts`
- `keyMatchers.ts`

**Commands**: camelCase with 'Command' suffix
- `clearCommand.ts`
- `helpCommand.ts`

### 3. Import Paths

**Within CLI directory**: Use relative paths
```typescript
// From ui/components/InputPrompt.tsx
import { SuggestionsDisplay } from './SuggestionsDisplay.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { Colors } from '../constants.js';
import { Command } from '../../config/keyBindings.js';
```

**From outside CLI**: Use full paths
```typescript
// From ui/components/App.tsx
import { chatService } from '../../../services/anthropic.js';
import { toolRegistry } from '../../../tools/index.js';
```

### 4. Component Organization Rules

**Single Responsibility**: Each component does ONE thing
- `InputPrompt.tsx` - ONLY renders input UI
- `useCommandCompletion.tsx` - ONLY handles completion logic
- `SuggestionsDisplay.tsx` - ONLY displays suggestions

**Logic Extraction**: Business logic goes in hooks
```typescript
// ❌ WRONG - Logic in component
export const InputPrompt = () => {
  // Complex completion logic here
  const suggestions = calculateSuggestions(input);
  // More logic...
}

// ✅ CORRECT - Logic in hook
export const InputPrompt = () => {
  const { suggestions } = useCommandCompletion(input);
  // Just rendering
}
```

### 5. Config vs UI Separation

**Config Directory** (`cli/config/`):
- Application-wide settings
- Keyboard shortcuts
- Model configurations
- Feature flags

**UI Directory** (`cli/ui/`):
- Components and rendering
- User interaction handling
- Display logic
- UI-specific utilities

### 6. Keyboard Shortcuts Pattern (Gemini Style)

```typescript
// config/keyBindings.ts
export enum Command {
  ABORT = 'abort',
  CLEAR_INPUT = 'clearInput',
  DELETE_LINE = 'deleteLine'
}

export const defaultKeyBindings = {
  [Command.ABORT]: [{ key: 'escape' }],
  [Command.CLEAR_INPUT]: [{ key: 'escape', sequence: 2 }],
  [Command.DELETE_LINE]: [{ key: 'backspace', command: true }]
}
```

```typescript
// ui/keyMatchers.ts
import { Command, defaultKeyBindings } from '../config/keyBindings.js';

export const keyMatchers = createKeyMatchers(defaultKeyBindings);
```

```typescript
// ui/components/InputPrompt.tsx
if (keyMatchers[Command.ESCAPE](key)) {
  // Handle escape
}
```

### 7. Constants and Types

**UI Constants** go in `ui/constants.ts`:
```typescript
export const Colors = {
  User: 'cyan',
  Assistant: 'white',
  Error: 'red'
};

export const MessageIndicators = {
  User: '>',
  Assistant: '◆',
  System: '⚡'
};
```

**UI Types** go in `ui/types.ts`:
```typescript
export interface Message { ... }
export interface ChatState { ... }
export type StreamingState = 'idle' | 'streaming' | 'complete';
```

### 8. Hooks Organization

**Naming Pattern**: Describe what it provides, not how
- `useChat` - Provides chat functionality
- `useKeypress` - Provides keypress handling
- `useCommandCompletion` - Provides command completion

**File Structure**:
```typescript
// hooks/useFeatureName.ts
export function useFeatureName(params) {
  // Hook implementation
  return {
    // Returned values/functions
  };
}
```

### 9. Commands Directory

**Each command** = separate file:
```typescript
// commands/clearCommand.ts
import { SlashCommand } from './types.js';

export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear the chat',
  action: (context) => { ... }
};
```

**Register all** in `commands/index.ts`:
```typescript
export const allCommands = [
  clearCommand,
  helpCommand,
  // ...
];
```

### 10. Context Usage

**Contexts** for cross-component state:
```typescript
// contexts/SettingsContext.tsx
export const SettingsContext = createContext<SettingsState>(...);
export const useSettings = () => useContext(SettingsContext);
```

**Use contexts sparingly** - prefer props for simple cases

### 11. Testing Convention

**Test files** next to source:
```
components/
  InputPrompt.tsx
  InputPrompt.test.tsx
  SuggestionsDisplay.tsx
  SuggestionsDisplay.test.tsx
```

### 12. No Business Logic in UI

**UI layer should NOT**:
- Make API calls directly
- Handle tool execution
- Manage complex state transformations

**UI layer SHOULD**:
- Render components
- Handle user input
- Display data
- Delegate actions to services/hooks

## Adding New Features

### Adding Keyboard Shortcuts:
1. Add command to `config/keyBindings.ts` enum
2. Add binding to `defaultKeyBindings`
3. Use in component via `keyMatchers`

### Adding a Component:
1. Create in `ui/components/` (flat)
2. Export from the file
3. Import where needed

### Adding a Hook:
1. Create in `ui/hooks/`
2. Name with `use` prefix
3. Export the hook function

### Adding a Command:
1. Create in `ui/commands/`
2. Implement `SlashCommand` interface
3. Add to `commands/index.ts`

### Adding Constants:
1. Add to `ui/constants.ts`
2. Export with descriptive name
3. Group related constants

## Common Patterns

### 1. Keyboard Handling (Gemini Pattern)
```typescript
// Use centralized keyMatchers
import { keyMatchers, Command } from '../keyMatchers.js';

if (keyMatchers[Command.ESCAPE](key)) {
  // Handle escape
}
```

### 2. Component + Hook Pattern
```typescript
// Component: Pure UI
export const Feature = () => {
  const { data, actions } = useFeature();
  return <UI data={data} {...actions} />;
};

// Hook: Logic
export const useFeature = () => {
  // All business logic here
  return { data, actions };
};
```

### 3. Suggestion Display Pattern
```typescript
// Always separate:
// 1. Calculation (hook)
// 2. Display (component)
const { suggestions } = useCompletion(input);
return <SuggestionsDisplay suggestions={suggestions} />;
```

## Migration Notes

### Recent Changes (Following Gemini):
1. Created `cli/` directory to match Gemini's structure
2. Moved `ui/` under `cli/`
3. Added `cli/config/` for application-wide config
4. Updated all import paths accordingly

### Next Steps:
1. Copy `keyBindings.ts` from Gemini to `config/`
2. Copy `keyMatchers.ts` from Gemini to `ui/`
3. Copy `text-buffer.ts` from Gemini to `ui/components/shared/`
4. Implement keyboard shortcuts in `InputPrompt.tsx`

## DON'T DO (Common Mistakes)

1. ❌ Don't create nested component folders
2. ❌ Don't put business logic in components
3. ❌ Don't make API calls from components
4. ❌ Don't create "utils" grab-bag files
5. ❌ Don't mix UI and service code
6. ❌ Don't create circular dependencies
7. ❌ Don't put types in random places
8. ❌ Don't put UI-specific config in `config/` directory

## References

This structure is based on:
- Gemini's clean architecture (Google's CLI tool)
- Separation of concerns principles
- Testability and maintainability best practices
- Single responsibility principle for components