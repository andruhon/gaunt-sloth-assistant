#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function safeRm(targetPath) {
  try {
    // Get the absolute path of the current working directory
    const currentDir = process.cwd();

    // Resolve the target path to an absolute path
    const absoluteTargetPath = path.resolve(currentDir, targetPath);

    // Security check: ensure the target is within the current directory
    const relativePath = path.relative(currentDir, absoluteTargetPath);

    // Check if the relative path starts with '..' or is an absolute path outside current dir
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      console.error(`Error: Cannot remove '${targetPath}' - path is outside current directory`);
      console.error('This tool only allows removing files within the current directory for safety');
      process.exit(1);
    }

    // Additional check: ensure the path doesn't contain any directory traversal sequences
    if (targetPath.includes('..') || targetPath.includes('~/')) {
      console.error(`Error: Invalid path '${targetPath}' - contains directory traversal sequences`);
      process.exit(1);
    }

    // Check if file/directory exists
    try {
      await fs.access(absoluteTargetPath);
    } catch {
      console.error(`Error: '${targetPath}' does not exist`);
      process.exit(1);
    }

    // Get file stats to determine if it's a file or directory
    const stats = await fs.stat(absoluteTargetPath);

    if (stats.isDirectory()) {
      // Remove directory recursively
      await fs.rm(absoluteTargetPath, { recursive: true, force: true });
      console.log(`Directory '${targetPath}' removed successfully`);
    } else {
      // Remove file
      await fs.unlink(absoluteTargetPath);
      console.log(`File '${targetPath}' removed successfully`);
    }
  } catch (error) {
    console.error(`Error removing '${targetPath}':`, error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Safe Remove Tool - Only removes files/directories within current directory

Usage: node safeRm.js <file-or-directory>

Examples:
  node safeRm.js temp.txt          # Remove a file
  node safeRm.js temp/             # Remove a directory
  node safeRm.js ./build/dist      # Remove nested directory

Security Features:
- Only allows removal within current working directory
- Prevents directory traversal attacks (../, ~/, etc.)
- Validates all paths before deletion
- Shows clear error messages for unsafe operations

This tool is designed to be a safer alternative to 'rm' by preventing
accidental deletion of files outside the current project directory.
`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.length !== 1) {
  console.error('Error: Please provide exactly one file or directory to remove');
  console.error('Use --help for usage information');
  process.exit(1);
}

const targetPath = args[0];
await safeRm(targetPath);
