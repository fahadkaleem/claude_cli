import fs from 'node:fs';
import path from 'node:path';
import type { PermissionConfig, ProjectSettings } from './types.js';

export class PermissionStorage {
  private static readonly SETTINGS_DIR = '.alfred';
  private static readonly SETTINGS_FILE = 'settings.local.json';

  constructor(private readonly workspaceRoot: string) {}

  private getSettingsPath(): string {
    return path.join(
      this.workspaceRoot,
      PermissionStorage.SETTINGS_DIR,
      PermissionStorage.SETTINGS_FILE,
    );
  }

  private ensureSettingsDirectory(): void {
    const settingsDir = path.join(
      this.workspaceRoot,
      PermissionStorage.SETTINGS_DIR,
    );
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
  }

  load(): PermissionConfig {
    const settingsPath = this.getSettingsPath();

    if (!fs.existsSync(settingsPath)) {
      return {
        allow: [],
        deny: [],
        ask: [],
      };
    }

    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings: ProjectSettings = JSON.parse(content);
      return settings.permissions || { allow: [], deny: [], ask: [] };
    } catch (error) {
      console.error(`Failed to load permissions from ${settingsPath}:`, error);
      return {
        allow: [],
        deny: [],
        ask: [],
      };
    }
  }

  save(permissions: PermissionConfig): void {
    this.ensureSettingsDirectory();
    const settingsPath = this.getSettingsPath();

    let settings: ProjectSettings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        const content = fs.readFileSync(settingsPath, 'utf-8');
        settings = JSON.parse(content);
      } catch (error) {
        console.error(`Failed to read existing settings:`, error);
      }
    }

    settings.permissions = permissions;

    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save permissions to ${settingsPath}:`, error);
      throw error;
    }
  }

  addPermission(permissionKey: string): void {
    const permissions = this.load();
    if (!permissions.allow.includes(permissionKey)) {
      permissions.allow.push(permissionKey);
      permissions.allow.sort();
      this.save(permissions);
    }
  }

  removePermission(permissionKey: string): void {
    const permissions = this.load();
    permissions.allow = permissions.allow.filter((key) => key !== permissionKey);
    this.save(permissions);
  }

  hasPermission(permissionKey: string): boolean {
    const permissions = this.load();
    return permissions.allow.includes(permissionKey);
  }

  hasMatchingPrefix(permissionKey: string): boolean {
    const permissions = this.load();

    const match = permissionKey.match(/^Bash\((.+)\)$/);
    if (!match) {
      return false;
    }
    const command = match[1];

    return permissions.allow.some((allowedKey) => {
      if (allowedKey.endsWith(':*)')) {
        const prefixMatch = allowedKey.match(/^Bash\((.+):\*\)$/);
        if (!prefixMatch) return false;

        const prefix = prefixMatch[1];
        return command === prefix || command.startsWith(prefix + ' ');
      }
      return false;
    });
  }
}