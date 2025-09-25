# UI Directory Structure and Rules

This directory follows industry best practices for clean, maintainable UI code architecture.

## Directory Structure

```
ui/
├── commands/       # Slash command implementations
├── components/     # React components (FLAT structure)
├── contexts/       # React contexts for state management
├── hooks/          # Custom React hooks
├── utils/          # UI utility functions
├── constants.ts    # UI constants (colors, messages, etc.)
└── types.ts        # UI-specific TypeScript types
```

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
```

### 2. File Naming Conventions

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

**Commands**: camelCase with 'Command' suffix
- `clearCommand.ts`
- `helpCommand.ts`

### 3. Import Paths

**Within UI directory**: Use relative paths
```typescript
// From components/InputPrompt.tsx
import { SuggestionsDisplay } from './SuggestionsDisplay.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { Colors } from '../constants.js';
```

**From outside UI**: Use full paths
```typescript
// From components/App.tsx
import { chatService } from '../../services/anthropic.js';
import { toolRegistry } from '../../tools/index.js';
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

### 5. Constants and Types

**UI Constants** go in `constants.ts`:
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

**UI Types** go in `types.ts`:
```typescript
export interface Message { ... }
export interface ChatState { ... }
export type StreamingState = 'idle' | 'streaming' | 'complete';
```

### 6. Hooks Organization

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

### 7. Commands Directory

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

### 8. Context Usage

**Contexts** for cross-component state:
```typescript
// contexts/SettingsContext.tsx
export const SettingsContext = createContext<SettingsState>(...);
export const useSettings = () => useContext(SettingsContext);
```

**Use contexts sparingly** - prefer props for simple cases

### 9. Testing Convention

**Test files** next to source:
```
components/
  InputPrompt.tsx
  InputPrompt.test.tsx
  SuggestionsDisplay.tsx
  SuggestionsDisplay.test.tsx
```

### 10. No Business Logic in UI

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

### Adding a Component:
1. Create in `components/` (flat)
2. Export from the file
3. Import where needed

### Adding a Hook:
1. Create in `hooks/`
2. Name with `use` prefix
3. Export the hook function

### Adding a Command:
1. Create in `commands/`
2. Implement `SlashCommand` interface
3. Add to `commands/index.ts`

### Adding Constants:
1. Add to `constants.ts`
2. Export with descriptive name
3. Group related constants

## Common Patterns

### 1. Keyboard Handling
```typescript
// Use centralized keyMatchers pattern
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

## DON'T DO (Common Mistakes)

1. ❌ Don't create nested component folders
2. ❌ Don't put business logic in components
3. ❌ Don't make API calls from components
4. ❌ Don't create "utils" grab-bag files
5. ❌ Don't mix UI and service code
6. ❌ Don't create circular dependencies
7. ❌ Don't put types in random places

## References

This structure is based on clean architecture principles:
- Separation of concerns is paramount
- Testability and maintainability are key
- Each component has a single responsibility
- Business logic is separated from UI