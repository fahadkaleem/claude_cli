#!/usr/bin/env node
/**
 * Simple log viewer for Alfred message logs
 * Usage: node scripts/view-logs.js [--filter=request|response|tool_execution|error]
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const LOG_FILE = join(homedir(), '.alfred', 'logs', 'messages.jsonl');

const args = process.argv.slice(2);
const filterArg = args.find(arg => arg.startsWith('--filter='));
const filter = filterArg ? filterArg.split('=')[1] : null;

try {
  const content = readFileSync(LOG_FILE, 'utf-8');
  const lines = content.trim().split('\n');

  console.log(`\n📋 Alfred Message Log (${lines.length} entries)\n`);
  console.log('='.repeat(80));

  lines.forEach((line, index) => {
    try {
      const entry = JSON.parse(line);

      if (filter && entry.type !== filter) {
        return;
      }

      console.log(`\n[${index + 1}] ${entry.timestamp} - ${entry.type.toUpperCase()}`);
      console.log('-'.repeat(80));

      if (entry.type === 'request') {
        console.log(`Messages: ${entry.data.messageCount}`);
        console.log('\nMessage History:');
        entry.data.messages.forEach((msg, i) => {
          console.log(`\n  ${i + 1}. Role: ${msg.role}`);
          if (typeof msg.content === 'string') {
            console.log(`     Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
          } else if (Array.isArray(msg.content)) {
            console.log(`     Content blocks: ${msg.content.length}`);
            msg.content.forEach((block, bi) => {
              if (block.type === 'text') {
                console.log(`       [${bi}] text: ${block.text?.substring(0, 80)}...`);
              } else if (block.type === 'tool_use') {
                console.log(`       [${bi}] tool_use: ${block.name}`);
              } else if (block.type === 'tool_result') {
                console.log(`       [${bi}] tool_result for: ${block.tool_use_id}`);
              }
            });
          }
        });
      } else if (entry.type === 'response') {
        console.log(`Stop reason: ${entry.data.stop_reason}`);
        console.log(`Content blocks: ${entry.data.content?.length || 0}`);
        if (entry.data.content) {
          entry.data.content.forEach((block, i) => {
            if (block.type === 'text') {
              console.log(`\n  [${i}] Text: ${block.text?.substring(0, 200)}${block.text?.length > 200 ? '...' : ''}`);
            } else if (block.type === 'tool_use') {
              console.log(`\n  [${i}] Tool: ${block.name}`);
              console.log(`      Input: ${JSON.stringify(block.input).substring(0, 100)}...`);
            }
          });
        }
      } else if (entry.type === 'tool_execution') {
        console.log(`Tool: ${entry.data.tool}`);
        console.log(`Input: ${JSON.stringify(entry.data.input).substring(0, 200)}...`);
        console.log(`Result: ${JSON.stringify(entry.data.result).substring(0, 200)}...`);
      } else if (entry.type === 'error') {
        console.log(`Error: ${entry.data.error}`);
        if (entry.data.stack) {
          console.log(`Stack:\n${entry.data.stack}`);
        }
      }
    } catch (err) {
      console.log(`Failed to parse line ${index + 1}: ${err.message}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n✨ Log file: ${LOG_FILE}\n`);
} catch (error) {
  console.error(`Failed to read log file: ${error.message}`);
  console.log(`\nRun Alfred with ALFRED_DEBUG=1 to enable logging.`);
  process.exit(1);
}