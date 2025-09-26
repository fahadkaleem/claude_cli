// UI Constants - Single source of truth for all UI strings and styling

export const MessageIndicators = {
  User: '>',
  Assistant: '●',
  Tool: '●',
  ToolResult: '⎿',
  System: '⎿',
} as const;

export const Colors = {
  User: 'white',
  Assistant: 'white',
  Tool: {
    Pending: 'yellow',
    Executing: 'yellow',
    Completed: 'green',
    Failed: 'red',
    Default: 'gray',
  },
  Error: 'red',
  Success: 'green',
  Loading: 'green',
  Gray: 'gray',
} as const;

export const DisplayType = {
  Markdown: 'markdown',
  Text: 'text',
  Json: 'json',
  Error: 'error',
} as const;

export const LoadingMessages = {
  Thinking: 'Thinking...',
  Processing: 'Processing...',
  Fetching: 'Fetching...',
} as const;

export const SpinnerType = {
  Default: 'dots',
} as const;

export const InterruptedIndicator = '⎿  Interrupted' as const;

export type DisplayTypeValue = typeof DisplayType[keyof typeof DisplayType];