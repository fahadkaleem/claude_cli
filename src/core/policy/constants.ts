// MIT License
// Copyright (c) 2025 Alfred CLI

export const SAFE_COMMANDS = new Set([
  'ls',
  'pwd',
  'echo',
  'cat',
  'grep',
  'find',
  'which',
  'man',
  'whoami',
  'date',
  'uname',
  'tree',
]);

export const BANNED_COMMANDS = [
  'rm -rf /',
  'dd',
  'mkfs',
  'format',
  ':(){:|:&};:',
];