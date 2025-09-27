export enum PolicyDecision {
  ALLOW = 'allow',
  DENY = 'deny',
  ASK_USER = 'ask_user',
}

export interface PermissionConfig {
  allow: string[];
  deny: string[];
  ask: string[];
}

export interface ProjectSettings {
  permissions?: PermissionConfig;
}