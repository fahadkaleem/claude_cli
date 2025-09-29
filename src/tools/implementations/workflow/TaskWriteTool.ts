import { Tool } from '../../core/Tool.js';
import { ToolKind, ToolErrorType, type ToolResult, type ToolContext } from '../../core/types.js';
import { TASK_STATUS_INDICATORS, type TaskStatus } from '../../ui/constants/taskIndicators.js';

// Constants

const ANSI_CODES = {
  STRIKETHROUGH: '\x1b[9m',
  RESET: '\x1b[0m'
} as const;

const TASK_TITLE = 'Tasks';

export interface Task {
  content: string;        // Imperative form: "Run tests"
  activeForm: string;     // Present continuous: "Running tests"
  status: TaskStatus;
}

interface TaskWriteParams extends Record<string, unknown> {
  tasks: Task[];
}

/**
 * Tool for managing a structured task list during work sessions.
 * Helps track progress on complex multi-step tasks with visual indicators.
 */
export class TaskWriteTool extends Tool<TaskWriteParams> {
  readonly name = 'TasksWrite';
  readonly displayName = 'Tasks';
  readonly description = `Use this tool to create and manage a structured task list for your current work session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.

## When to Use This Tool
Use this tool proactively in these scenarios:

1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. After receiving new instructions - Immediately capture user requirements as todos
6. When you start working on a task - Mark it as in_progress BEFORE beginning work. Ideally you should only have one todo as in_progress at a time
7. After completing a task - Mark it as completed and add any new follow-up tasks discovered during implementation

## When NOT to Use This Tool

Skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no organizational benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

NOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.

## Examples of When to Use the Todo List

<example>
User: I want to add a dark mode toggle to the application settings. Make sure you run the tests and build when you're done!
Assistant: I'll help add a dark mode toggle to your application settings. Let me create a todo list to track this implementation.
*Creates todo list with the following items:*
1. Create dark mode toggle component in Settings page
2. Add dark mode state management (context/store)
3. Implement CSS-in-JS styles for dark theme
4. Update existing components to support theme switching
5. Run tests and build process, addressing any failures or errors that occur
*Begins working on the first task*

<reasoning>
The assistant used the todo list because:
1. Adding dark mode is a multi-step feature requiring UI, state management, and styling changes
2. The user explicitly requested tests and build be run afterward
3. The assistant inferred that tests and build need to pass by adding "Ensure tests and build succeed" as the final task
</reasoning>
</example>

<example>
User: Help me rename the function getCwd to getCurrentWorkingDirectory across my project
Assistant: Let me first search through your codebase to find all occurrences of 'getCwd'.
*Uses grep or search tools to locate all instances of getCwd in the codebase*
Assistant: I've found 15 instances of 'getCwd' across 8 different files. Let me create a todo list to track these changes.
*Creates todo list with specific items for each file that needs updating*

<reasoning>
The assistant used the todo list because:
1. First, the assistant searched to understand the scope of the task
2. Upon finding multiple occurrences across different files, it determined this was a complex task with multiple steps
3. The todo list helps ensure every instance is tracked and updated systematically
4. This approach prevents missing any occurrences and maintains code consistency
</reasoning>
</example>


<example>
User: I need to implement these features for my e-commerce site: user registration, product catalog, shopping cart, and checkout flow.
Assistant: I'll help implement these features. First, let's add all the features to the todo list.
*Creates a todo list breaking down each feature into specific tasks based on the project architecture*
Assistant: Let's start with user registration. This will involve creating database models, API endpoints, and frontend forms that integrate with your existing authentication system.

<reasoning>
The assistant used the todo list because:
1. The user provided multiple complex features to implement in a comma separated list
2. The todo list helps organize these large features into manageable tasks
3. This approach allows for tracking progress across the entire implementation
</reasoning>
</example>

<example>
User: Can you help optimize my React application? It's rendering slowly and has performance issues.
Assistant: I'll help optimize your React application. First, let me examine your codebase to identify potential performance bottlenecks.
*Reviews component structure, render patterns, state management, and data fetching*
Assistant: After analyzing your codebase, I've identified several performance issues. Let me create a todo list to track our optimization efforts.
*Creates todo list with items like: 1) Implement memoization for expensive calculations in ProductList, 2) Add virtualization for long lists in Dashboard, 3) Optimize image loading in Gallery component, 4) Fix state update loops in ShoppingCart, 5) Review bundle size and implement code splitting*
Let's start by implementing memoization for the expensive calculations in your ProductList component.

<reasoning>
The assistant used the todo list because:
1. First, the assistant examined the codebase to identify specific performance issues
2. Based on this analysis, it identified multiple optimization opportunities
3. Performance optimization is a non-trivial task requiring multiple steps
4. The todo list helps methodically track improvements across different components
5. This systematic approach ensures all performance bottlenecks are addressed
</reasoning>
</example>

## Examples of When NOT to Use the Todo List

<example>
User: How do I print 'Hello World' in Python?
Assistant: In Python, you can print "Hello World" with this simple code:

python
print("Hello World")

This will output the text "Hello World" to the console when executed.

<reasoning>
The assistant did not use the todo list because this is a single, trivial task that can be completed in one step. There's no need to track multiple tasks or steps for such a straightforward request.
</reasoning>
</example>

<example>
User: What does the git status command do?
Assistant: The git status command shows the current state of your working directory and staging area. It displays which changes have been staged, which haven't, and which files aren't being tracked by Git. This is a fundamental command for understanding the current state of your repository before making commits.

<reasoning>
The assistant did not use the todo list because this is an informational request with no actual coding task to complete. The user is simply asking for an explanation, not for the assistant to perform multiple steps or tasks.
</reasoning>
</example>

<example>
User: Can you add a comment to the calculateTotal function to explain what it does?
Assistant: Sure, let me add a comment to the calculateTotal function to explain what it does.
* Uses the Edit tool to add a comment to the calculateTotal function *

<reasoning>
The assistant did not use the todo list because this is a single, straightforward task confined to one location in the code. Adding a comment doesn't require tracking multiple steps or systematic organization.
</reasoning>
</example>

<example>
User: Run npm install for me and tell me what happens.
Assistant: I'll run the npm install command for you.

*Executes: npm install*

The command completed successfully. Here's the output:
[Output of npm install command]

All dependencies have been installed according to your package.json file.

<reasoning>
The assistant did not use the todo list because this is a single command execution with immediate results. There are no multiple steps to track or organize, making the todo list unnecessary for this straightforward task.
</reasoning>
</example>

## Task States and Management

1. **Task States**: Use these states to track progress:
   - pending: Task not yet started
   - in_progress: Currently working on (limit to ONE task at a time)
   - completed: Task finished successfully
   - cancelled: Task no longer needed (use when task becomes irrelevant)

2. **Task Management**:
   - Update task status in real-time as you work
   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)
   - Only have ONE task in_progress at any time
   - Complete current tasks before starting new ones
   - Mark tasks as cancelled when they are no longer relevant

3. **Task Completion Requirements**:
   - ONLY mark a task as completed when you have FULLY accomplished it
   - If you encounter errors, blockers, or cannot finish, keep the task as in_progress
   - When blocked, create a new task describing what needs to be resolved
   - Never mark a task as completed if:
     - Tests are failing
     - Implementation is partial
     - You encountered unresolved errors
     - You couldn't find necessary files or dependencies

4. **Task Breakdown**:
   - Create specific, actionable items
   - Break complex tasks into smaller, manageable steps
   - Use clear, descriptive task names
   - Each task should have both:
     - content: The imperative form describing what needs to be done (e.g., "Run tests")
     - activeForm: The present continuous form shown during execution (e.g., "Running tests")

When in doubt, use this tool. Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.`;

  readonly kind = ToolKind.Other;

  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      tasks: {
        type: 'array',
        description: 'The complete list of task items. This will replace the existing list.',
        items: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The imperative form describing what needs to be done (e.g., "Run tests")',
            },
            activeForm: {
              type: 'string',
              description: 'The present continuous form shown during execution (e.g., "Running tests")',
            },
            status: {
              type: 'string',
              description: 'The current status of the task',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            },
          },
          required: ['content', 'activeForm', 'status'],
        },
      },
    },
    required: ['tasks'],
  };

  private static currentTasks: Task[] = [];

  /**
   * Get a copy of the current task list
   */
  static getTasks(): Task[] {
    return [...TaskWriteTool.currentTasks];
  }

  /**
   * Clear all tasks from the list
   */
  static clearTasks(): void {
    TaskWriteTool.currentTasks = [];
  }

  /**
   * Get the current tasks (compatibility alias for getTasks)
   * @deprecated Use getTasks() instead
   */
  static getTodos(): Task[] {
    return TaskWriteTool.getTasks();
  }

  /**
   * Clear all tasks (compatibility alias for clearTasks)
   * @deprecated Use clearTasks() instead
   */
  static clearTodos(): void {
    TaskWriteTool.clearTasks();
  }

  formatParams(params: TaskWriteParams): string {
    const count = params.tasks?.length || 0;
    if (count === 0) {
      return 'Clear tasks';
    }
    const inProgress = params.tasks.find(t => t.status === 'in_progress');
    if (inProgress) {
      return inProgress.activeForm;
    }
    return `${count} task${count !== 1 ? 's' : ''}`;
  }

  summarizeResult(result: ToolResult): string {
    if (result.error) {
      return `Failed: ${result.error.message}`;
    }
    const stats = this.getTaskStatistics();
    return `${stats.pending} pending, ${stats.inProgress} active, ${stats.completed} done`;
  }

  /**
   * Validates the structure and content of task parameters
   */
  protected validateToolParamValues(params: TaskWriteParams): string | null {
    const baseValidation = super.validate(params);
    if (baseValidation) return baseValidation;

    const { tasks } = params;
    if (!Array.isArray(tasks)) {
      return 'tasks parameter must be an array';
    }

    for (const task of tasks) {
      if (!task || typeof task !== 'object') {
        return 'Each task item must be an object';
      }
      if (!task.content || typeof task.content !== 'string' || !task.content.trim()) {
        return 'Each task must have a non-empty content string';
      }
      if (!task.activeForm || typeof task.activeForm !== 'string' || !task.activeForm.trim()) {
        return 'Each task must have a non-empty activeForm string';
      }
      if (!this.isValidTaskStatus(task.status)) {
        return 'Each task must have a valid status (pending, in_progress, completed, or cancelled)';
      }
    }

    // Validate business logic constraints
    return this.validateTaskConstraints(tasks);
  }

  /**
   * Alias for validateToolParamValues to maintain Tool base class compatibility
   */
  validate(params: TaskWriteParams): string | null {
    return this.validateToolParamValues(params);
  }

  /**
   * Validates business logic constraints for tasks
   */
  private validateTaskConstraints(tasks: Task[]): string | null {
    const inProgressCount = this.countTasksByStatus(tasks, 'in_progress');
    if (inProgressCount > 1) {
      return 'Only one task can be "in_progress" at a time';
    }
    return null;
  }

  /**
   * Type guard for valid task status
   */
  private isValidTaskStatus(status: string): status is TaskStatus {
    return ['pending', 'in_progress', 'completed', 'cancelled'].includes(status);
  }

  protected async run(params: TaskWriteParams, context?: ToolContext): Promise<ToolResult> {
    const { tasks } = params;

    // Update the static tasks list
    TaskWriteTool.currentTasks = [...tasks];

    // Format the tasks for display
    const taskDisplay = tasks.length === 0
      ? 'Task list cleared'
      : this.formatTasksAsMarkdown(tasks);

    // Get summary statistics
    const stats = this.calculateTaskStatistics(tasks);

    // Format task list for LLM
    const taskListString = tasks
      .map((task, index) => `${index + 1}. [${task.status}] ${task.content}`)
      .join('\n');

    const llmContent = tasks.length > 0
      ? `Successfully updated the task list. The current list is now:\n${taskListString}`
      : 'Successfully cleared the task list';

    return {
      llmContent,
      returnDisplay: {
        type: 'task-list',
        tasks,
        stats,
      },
    };
  }

  /**
   * Formats tasks for markdown display in the chat
   */
  private formatTasksAsMarkdown(tasks: Task[]): string {
    if (tasks.length === 0) {
      return 'No tasks';
    }

    const lines: string[] = [];

    // Add title with task count
    lines.push(this.formatTitle(tasks.length));

    // Add each task with appropriate indicator
    tasks.forEach(task => {
      lines.push(` ${this.formatTaskLine(task)}`);
    });

    // Add completion message if all done
    if (this.allTasksCompleted(tasks)) {
      lines.push('');
      lines.push('All tasks completed!');
    }

    return lines.join('\n');
  }

  /**
   * Format the title line with task count
   */
  private formatTitle(count: number): string {
    const plural = count !== 1 ? 's' : '';
    return `${TASK_TITLE}(${count} task${plural})`;
  }

  /**
   * Format a single task line with appropriate indicator and styling
   */
  private formatTaskLine(task: Task): string {
    const indicator = TASK_STATUS_INDICATORS[task.status];

    switch (task.status) {
      case 'completed':
        return `${indicator} ${ANSI_CODES.STRIKETHROUGH}${task.content}${ANSI_CODES.RESET}`;
      case 'cancelled':
        return `${indicator} ${ANSI_CODES.STRIKETHROUGH}${task.content}${ANSI_CODES.RESET} (cancelled)`;
      case 'in_progress':
      case 'pending':
      default:
        return `${indicator} ${task.content}`;
    }
  }

  /**
   * Count tasks by status
   */
  private countTasksByStatus(tasks: Task[], status: TaskStatus): number {
    return tasks.filter(t => t.status === status).length;
  }

  /**
   * Get statistics for the current task list
   */
  private getTaskStatistics() {
    return this.calculateTaskStatistics(TaskWriteTool.currentTasks);
  }

  /**
   * Calculate statistics for a given task list
   */
  private calculateTaskStatistics(tasks: Task[]) {
    return {
      total: tasks.length,
      pending: this.countTasksByStatus(tasks, 'pending'),
      inProgress: this.countTasksByStatus(tasks, 'in_progress'),
      completed: this.countTasksByStatus(tasks, 'completed'),
      cancelled: this.countTasksByStatus(tasks, 'cancelled'),
    };
  }

  /**
   * Check if all tasks are completed or cancelled
   */
  private allTasksCompleted(tasks: Task[]): boolean {
    return tasks.length > 0 &&
           tasks.every(t => t.status === 'completed' || t.status === 'cancelled');
  }
}