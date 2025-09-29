import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const TEMP_DIR_NAME = 'alfred-cli-images';
const CLEANUP_AGE_MS = 60 * 60 * 1000; // 1 hour

export interface ImageData {
  base64: string;
  filePath: string;
}

export async function saveClipboardImage(
  base64Image: string,
  imageNumber: number
): Promise<ImageData | null> {
  try {
    const tempDir = path.join(os.tmpdir(), TEMP_DIR_NAME);
    await fs.mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `image-${imageNumber}-${timestamp}.png`;
    const filePath = path.join(tempDir, filename);

    const buffer = Buffer.from(base64Image, 'base64');
    await fs.writeFile(filePath, buffer);

    return {
      base64: base64Image,
      filePath
    };
  } catch (error) {
    console.error('Error saving clipboard image:', error);
    return null;
  }
}

export function toRelativePathIfPossible(
  absolutePath: string,
  cwd: string = process.cwd()
): string {
  try {
    const relative = path.relative(cwd, absolutePath);

    // If relative path doesn't go up directories (no ..), use it
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      return relative;
    }

    // Otherwise use absolute path
    return absolutePath;
  } catch {
    return absolutePath;
  }
}

export async function cleanupOldClipboardImages(): Promise<void> {
  try {
    const tempDir = path.join(os.tmpdir(), TEMP_DIR_NAME);
    const files = await fs.readdir(tempDir);
    const cutoffTime = Date.now() - CLEANUP_AGE_MS;

    for (const file of files) {
      if (file.startsWith('image-') && file.endsWith('.png')) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtimeMs < cutoffTime) {
            await fs.unlink(filePath);
          }
        } catch {
          // Ignore errors for individual files
        }
      }
    }
  } catch {
    // Ignore errors in cleanup (directory might not exist yet)
  }
}

export function formatTextPastePlaceholder(
  text: string,
  pasteNumber: number
): string {
  const newlineCount = (text.match(/\r\n|\r|\n/g) || []).length;
  return `[Pasted text #${pasteNumber} +${newlineCount} lines]`;
}

export function formatImagePlaceholder(imageNumber: number): string {
  return `[Image #${imageNumber}]`;
}

export function expandTextPastes(
  value: string,
  pastedTexts: Map<number, string>
): string {
  let result = value;

  pastedTexts.forEach((text, number) => {
    const regex = new RegExp(`\\[Pasted text #${number} \\+\\d+ lines\\]`, 'g');
    result = result.replace(regex, text);
  });

  return result;
}

export function expandImagePastes(
  value: string,
  pastedImages: Map<number, ImageData>,
  useRelativePaths: boolean = true
): string {
  let result = value;

  pastedImages.forEach((imageData, number) => {
    const placeholder = formatImagePlaceholder(number);
    const filePath = useRelativePaths
      ? toRelativePathIfPossible(imageData.filePath)
      : imageData.filePath;

    result = result.replace(placeholder, `@${filePath}`);
  });

  return result;
}