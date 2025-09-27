import { isAbsolute, resolve } from 'path';

const readFileAllowedDirectories: Set<string> = new Set();
const writeFileAllowedDirectories: Set<string> = new Set();

let originalCwd: string = process.cwd();

export function setOriginalCwd(cwd: string): void {
  originalCwd = cwd;
}

export function getOriginalCwd(): string {
  return originalCwd;
}

export function toAbsolutePath(path: string): string {
  const cwd = process.cwd();
  return isAbsolute(path) ? resolve(path) : resolve(cwd, path);
}

export function pathInOriginalCwd(path: string): boolean {
  const absolutePath = toAbsolutePath(path);
  return absolutePath.startsWith(toAbsolutePath(originalCwd));
}

export function hasReadPermission(directory: string): boolean {
  const absolutePath = toAbsolutePath(directory);

  for (const allowedPath of readFileAllowedDirectories) {
    if (absolutePath.startsWith(allowedPath)) {
      return true;
    }
  }
  return false;
}

export function hasWritePermission(directory: string): boolean {
  const absolutePath = toAbsolutePath(directory);

  for (const allowedPath of writeFileAllowedDirectories) {
    if (absolutePath.startsWith(allowedPath)) {
      return true;
    }
  }
  return false;
}

function saveReadPermission(directory: string): void {
  const absolutePath = toAbsolutePath(directory);

  for (const allowedPath of readFileAllowedDirectories) {
    if (allowedPath.startsWith(absolutePath)) {
      readFileAllowedDirectories.delete(allowedPath);
    }
  }
  readFileAllowedDirectories.add(absolutePath);
}

function saveWritePermission(directory: string): void {
  const absolutePath = toAbsolutePath(directory);

  for (const allowedPath of writeFileAllowedDirectories) {
    if (allowedPath.startsWith(absolutePath)) {
      writeFileAllowedDirectories.delete(allowedPath);
    }
  }
  writeFileAllowedDirectories.add(absolutePath);
}

export function grantReadPermissionForOriginalDir(): void {
  const originalProjectDir = getOriginalCwd();
  saveReadPermission(originalProjectDir);
}

export function grantWritePermissionForOriginalDir(): void {
  const originalProjectDir = getOriginalCwd();
  saveWritePermission(originalProjectDir);
}

export function revokeWritePermission(directory: string): void {
  const absolutePath = toAbsolutePath(directory);
  writeFileAllowedDirectories.delete(absolutePath);
}

export function clearFilePermissions(): void {
  readFileAllowedDirectories.clear();
  writeFileAllowedDirectories.clear();
}