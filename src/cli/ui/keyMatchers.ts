/**
 * Key matching utilities
 * Provides clean key matching functions for keyboard shortcuts
 */

import type { Key } from 'ink';
import type { KeyBinding, KeyBindingConfig } from '../config/keyBindings.js';
import { Command, defaultKeyBindings } from '../config/keyBindings.js';

/**
 * Matches a KeyBinding against an actual Key press from Ink
 */
function matchKeyBinding(keyBinding: KeyBinding, key: Key): boolean {
  // Check if key name matches
  let keyMatches = false;

  // Handle different key representations
  if (keyBinding.key !== undefined) {
    // Map common key variations
    const normalizedKeyName = normalizeKeyName(key);
    keyMatches = keyBinding.key === normalizedKeyName;
  }

  if (!keyMatches) {
    return false;
  }

  // Check modifiers
  // undefined = ignore this modifier
  // true = modifier must be pressed
  // false = modifier must NOT be pressed
  if (keyBinding.ctrl !== undefined && key.ctrl !== keyBinding.ctrl) {
    return false;
  }

  if (keyBinding.shift !== undefined && key.shift !== keyBinding.shift) {
    return false;
  }

  if (keyBinding.meta !== undefined && key.meta !== keyBinding.meta) {
    return false;
  }

  return true;
}

/**
 * Normalize key names to match our configuration
 */
function normalizeKeyName(key: Key): string {
  // Handle special keys
  if (key.escape) return 'escape';
  if (key.return) return 'return';
  if (key.tab) return 'tab';
  if (key.backspace) return 'backspace';
  if (key.delete) return 'delete';
  if (key.upArrow) return 'up';
  if (key.downArrow) return 'down';
  if (key.leftArrow) return 'left';
  if (key.rightArrow) return 'right';

  // For letter keys with ctrl (e.g., Ctrl+C)
  // Ink provides these as the actual character
  // We need to handle this in the input handler
  return '';
}

/**
 * Checks if a key matches any of the bindings for a command
 */
function matchCommand(
  command: Command,
  key: Key,
  config: KeyBindingConfig = defaultKeyBindings,
): boolean {
  const bindings = config[command];
  return bindings.some((binding) => matchKeyBinding(binding, key));
}

/**
 * Key matcher function type
 */
type KeyMatcher = (key: Key) => boolean;

/**
 * Type for key matchers mapped to Command enum
 */
export type KeyMatchers = {
  readonly [C in Command]: KeyMatcher;
};

/**
 * Creates key matchers from a key binding configuration
 */
export function createKeyMatchers(
  config: KeyBindingConfig = defaultKeyBindings,
): KeyMatchers {
  const matchers = {} as { [C in Command]: KeyMatcher };

  for (const command of Object.values(Command)) {
    matchers[command] = (key: Key) => matchCommand(command, key, config);
  }

  return matchers as KeyMatchers;
}

/**
 * Default key binding matchers using the default configuration
 */
export const keyMatchers: KeyMatchers = createKeyMatchers(defaultKeyBindings);

// Re-export Command for convenience
export { Command };