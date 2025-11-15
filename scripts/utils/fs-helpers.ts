import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Slugify a string for use in file paths and IDs
 * Converts to lowercase, replaces spaces and special chars with hyphens
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Read and parse a JSON file
 */
export function readJSON<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write data to a JSON file with pretty formatting
 */
export function writeJSON(filePath: string, data: any): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Append a message to a log file
 */
export function appendLog(logPath: string, message: string): void {
  ensureDir(path.dirname(logPath));
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, logEntry, 'utf-8');
}

/**
 * Get all files in a directory recursively matching a pattern
 */
export function getFilesRecursive(
  dir: string,
  filePattern?: RegExp
): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...getFilesRecursive(fullPath, filePattern));
    } else if (!filePattern || filePattern.test(item)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

/**
 * Check if a directory exists
 */
export function dirExists(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * Get the relative path from project root
 */
export function getRelativePath(absolutePath: string): string {
  const projectRoot = path.resolve(__dirname, '../..');
  return path.relative(projectRoot, absolutePath);
}

/**
 * Get the absolute path from project root
 */
export function getAbsolutePath(relativePath: string): string {
  const projectRoot = path.resolve(__dirname, '../..');
  return path.join(projectRoot, relativePath);
}

/**
 * Read all subdirectories in a directory
 */
export function getSubdirectories(dir: string): string[] {
  if (!dirExists(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((item) => {
      const fullPath = path.join(dir, item);
      return fs.statSync(fullPath).isDirectory();
    })
    .map((item) => path.join(dir, item));
}

/**
 * Get directory name from path
 */
export function getDirectoryName(dirPath: string): string {
  return path.basename(dirPath);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file size
 */
export function getFileSize(filePath: string): number {
  if (!fileExists(filePath)) {
    return 0;
  }
  return fs.statSync(filePath).size;
}
