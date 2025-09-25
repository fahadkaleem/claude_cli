/**
 * Keyboard shortcuts configuration
 * Centralized command definitions for the entire CLI
 */

/**
 * Command enum for all available keyboard shortcuts
 */
export enum Command {
  // Interrupt/Abort
  ABORT = 'abort',

  // Input clearing
  CLEAR_INPUT = 'clearInput',
  CLEAR_INPUT_DOUBLE_ESC = 'clearInputDoubleEsc',

  // Line operations
  DELETE_LINE = 'deleteLine',
  KILL_LINE_RIGHT = 'killLineRight',
  KILL_LINE_LEFT = 'killLineLeft',
  DELETE_WORD_BACKWARD = 'deleteWordBackward',

  // Navigation
  HOME = 'home',
  END = 'end',
  HISTORY_UP = 'historyUp',
  HISTORY_DOWN = 'historyDown',
  NAVIGATION_UP = 'navigationUp',
  NAVIGATION_DOWN = 'navigationDown',

  // Submission
  SUBMIT = 'submit',
  NEWLINE = 'newline',

  // Screen control
  CLEAR_SCREEN = 'clearScreen',

  // Completion
  ACCEPT_SUGGESTION = 'acceptSuggestion',
  COMPLETION_UP = 'completionUp',
  COMPLETION_DOWN = 'completionDown',
}

/**
 * Data-driven key binding structure
 */
export interface KeyBinding {
  /** The key name (e.g., 'escape', 'return', 'tab', 'backspace') */
  key?: string;
  /** Control key requirement */
  ctrl?: boolean;
  /** Shift key requirement */
  shift?: boolean;
  /** Command/meta key requirement (Cmd on Mac, Win key on Windows) */
  meta?: boolean;
  /** For double-press detection (e.g., double ESC) */
  sequence?: number;
}

/**
 * Configuration type mapping commands to their key bindings
 */
export type KeyBindingConfig = {
  readonly [C in Command]: readonly KeyBinding[];
};

/**
 * Default key binding configuration
 */
export const defaultKeyBindings: KeyBindingConfig = {
  // Interrupt/Abort - Single ESC
  [Command.ABORT]: [{ key: 'escape' }],

  // Clear input - Ctrl+C or Double ESC
  [Command.CLEAR_INPUT]: [{ key: 'c', ctrl: true }],
  [Command.CLEAR_INPUT_DOUBLE_ESC]: [{ key: 'escape', sequence: 2 }],

  // Delete word backward - CMD+Backspace (Mac) or Ctrl+W
  [Command.DELETE_WORD_BACKWARD]: [
    { key: 'backspace', meta: true },  // Mac: Cmd+Backspace
    { key: 'delete', meta: true },     // Mac: Cmd+Delete
    { key: 'w', ctrl: true },          // Universal: Ctrl+W
  ],

  // Delete entire line - kept for future use with multi-line input
  [Command.DELETE_LINE]: [
    { key: 'backspace', ctrl: true, shift: true },  // Reserved for future use
  ],

  // Line editing
  [Command.KILL_LINE_RIGHT]: [{ key: 'k', ctrl: true }],
  [Command.KILL_LINE_LEFT]: [{ key: 'u', ctrl: true }],

  // Cursor movement
  [Command.HOME]: [{ key: 'a', ctrl: true }],
  [Command.END]: [{ key: 'e', ctrl: true }],

  // History navigation
  [Command.HISTORY_UP]: [
    { key: 'up' },
    { key: 'p', ctrl: true }
  ],
  [Command.HISTORY_DOWN]: [
    { key: 'down' },
    { key: 'n', ctrl: true }
  ],
  [Command.NAVIGATION_UP]: [{ key: 'up' }],
  [Command.NAVIGATION_DOWN]: [{ key: 'down' }],

  // Screen control
  [Command.CLEAR_SCREEN]: [{ key: 'l', ctrl: true }],

  // Submission
  [Command.SUBMIT]: [{ key: 'return' }],
  [Command.NEWLINE]: [
    { key: 'return', shift: true },
    { key: 'return', ctrl: true },
  ],

  // Completion
  [Command.ACCEPT_SUGGESTION]: [{ key: 'tab' }],
  [Command.COMPLETION_UP]: [{ key: 'up' }],
  [Command.COMPLETION_DOWN]: [{ key: 'down' }],
};