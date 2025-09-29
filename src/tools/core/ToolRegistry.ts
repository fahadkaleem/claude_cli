import { Tool } from './Tool.js';
import { ToolKind, type ToolSchema } from './types.js';

type ToolConstructor = new () => Tool;

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  registerAll(tools: Tool[]): void {
    tools.forEach(tool => this.register(tool));
  }

  registerClasses(toolClasses: ToolConstructor[]): void {
    toolClasses.forEach(ToolClass => {
      this.register(new ToolClass());
    });
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getByKind(kind: ToolKind): Tool[] {
    return this.getAll().filter(tool => tool.kind === kind);
  }

  getSchemas(): ToolSchema[] {
    return this.getAll().map(tool => tool.schema);
  }

  clear(): void {
    this.tools.clear();
  }

  // Auto-discover and register all exported tool classes from modules
  async autoRegister(...modules: Record<string, unknown>[]): Promise<void> {
    const toolClasses: ToolConstructor[] = [];

    for (const module of modules) {
      for (const [key, value] of Object.entries(module)) {
        // Check if it's a class that extends Tool
        if (
          typeof value === 'function' &&
          value.prototype instanceof Tool
        ) {
          toolClasses.push(value as ToolConstructor);
        }
      }
    }

    this.registerClasses(toolClasses);
  }
}