export interface PastedContent {
  readonly id: number;
  readonly type: 'image' | 'text';
  readonly content: string;
  readonly mediaType?: string;
}

export interface HistoryEntry {
  readonly display: string;
  readonly pastedContents: Readonly<Record<string, PastedContent>>;
}

export interface ProjectConfig {
  readonly allowedTools: readonly string[];
  readonly history: readonly HistoryEntry[];
}

export interface AlfredConfig {
  readonly projects: Readonly<Record<string, ProjectConfig>>;
}

export const MAX_HISTORY_ENTRIES = 100;

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  allowedTools: [],
  history: [],
} as const;

export const DEFAULT_ALFRED_CONFIG: AlfredConfig = {
  projects: {},
} as const;