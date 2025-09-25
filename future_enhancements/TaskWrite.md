# TaskWrite Tool Enhancements

## 1. Task Persistence

### Current Limitation
Tasks are only stored in memory (`private static currentTasks: Task[] = []`) and are lost when the application restarts.

### Required Enhancement
- Implement persistent storage for tasks (file-based or database)
- Options:
  - Simple: Write to `.alfred/tasks.json` file
  - Advanced: SQLite database for task history
- Restore tasks on application startup
- Maintain task history across sessions

## 2. Explicit Task Communication to AI Agent

### Current Implementation (Claude Code)
Tasks are sent to the AI through system reminders:
- When TodoWrite is used, a `<system-reminder>` is sent with updated list
- Periodic reminders sent if tool hasn't been used recently
- This keeps the AI aware of current tasks throughout the conversation

### Required for Alfred
- **Implement system message injection** after each TaskWrite tool use
- **Format**:
  ```
  <system-reminder>
  Current tasks:
  [1. [pending] Task description
   2. [in_progress] Active task description
   3. [completed] Finished task]
  </system-reminder>
  ```
- **Periodic reminders**: Send task list to AI if no task updates for X minutes
- **Critical**: Without this, the AI loses track of tasks between tool calls

### Implementation Notes
- The host application (App.tsx or anthropic service) must:
  1. Monitor `TaskWriteTool.getTasks()` for changes
  2. Inject task updates as system messages into the conversation
  3. Send periodic reminders to maintain task awareness
- This creates a feedback loop that keeps the AI informed about task state

## Priority
**HIGH** - Both features are essential for Alfred to function as a planning/task management tool. Without persistence and AI communication, tasks become ephemeral and useless.