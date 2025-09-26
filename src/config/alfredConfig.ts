import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { Storage, storage } from './storage.js';
import type {
  AlfredConfig,
  ProjectConfig,
  HistoryEntry,
} from './types.js';
import {
  DEFAULT_ALFRED_CONFIG,
  DEFAULT_PROJECT_CONFIG,
  MAX_HISTORY_ENTRIES,
} from './types.js';

export class ConfigError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ConfigError';
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as NodeJS.ErrnoException).code === 'string'
  );
}

async function getConfig(): Promise<AlfredConfig> {
  const configPath = Storage.getAlfredConfigPath();

  if (!existsSync(configPath)) {
    return { ...DEFAULT_ALFRED_CONFIG };
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content) as AlfredConfig;

    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('Invalid config structure, using defaults');
      return { ...DEFAULT_ALFRED_CONFIG };
    }

    return {
      projects: parsed.projects ?? {},
    };
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { ...DEFAULT_ALFRED_CONFIG };
    }

    console.error('Failed to read Alfred config, using defaults:', error);
    return { ...DEFAULT_ALFRED_CONFIG };
  }
}

async function saveConfig(config: AlfredConfig): Promise<void> {
  const configPath = Storage.getAlfredConfigPath();

  try {
    await mkdir(dirname(configPath), { recursive: true });
    const content = JSON.stringify(config, null, 2);
    await writeFile(configPath, content, 'utf-8');
  } catch (error) {
    throw new ConfigError('Failed to save Alfred configuration', error);
  }
}

export async function getCurrentProjectConfig(): Promise<ProjectConfig> {
  try {
    const absolutePath = resolve(storage.getProjectRoot());
    const config = await getConfig();

    return config.projects[absolutePath] ?? { ...DEFAULT_PROJECT_CONFIG };
  } catch (error) {
    console.error('Failed to get project config, using defaults:', error);
    return { ...DEFAULT_PROJECT_CONFIG };
  }
}

export async function saveCurrentProjectConfig(projectConfig: ProjectConfig): Promise<void> {
  const absolutePath = resolve(storage.getProjectRoot());
  const config = await getConfig();

  const updatedConfig: AlfredConfig = {
    projects: {
      ...config.projects,
      [absolutePath]: projectConfig,
    },
  };

  await saveConfig(updatedConfig);
}

export async function getHistory(): Promise<readonly HistoryEntry[]> {
  try {
    const projectConfig = await getCurrentProjectConfig();
    return [...(projectConfig.history ?? [])];
  } catch (error) {
    console.error('Failed to get history, returning empty array:', error);
    return [];
  }
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  try {
    const projectConfig = await getCurrentProjectConfig();
    const history = [...(projectConfig.history ?? [])];

    if (history.length > 0 && history[0].display === entry.display) {
      return;
    }

    history.unshift(entry);
    const limitedHistory = history.slice(0, MAX_HISTORY_ENTRIES);

    const updatedConfig: ProjectConfig = {
      ...projectConfig,
      history: limitedHistory,
    };

    await saveCurrentProjectConfig(updatedConfig);
  } catch (error) {
    throw new ConfigError('Failed to add entry to history', error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const projectConfig = await getCurrentProjectConfig();
    const updatedConfig: ProjectConfig = {
      ...projectConfig,
      history: [],
    };

    await saveCurrentProjectConfig(updatedConfig);
  } catch (error) {
    throw new ConfigError('Failed to clear history', error);
  }
}