import { display, displayError, displaySuccess, displayWarning } from "./consoleUtils.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { slothContext } from "./config.js";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { exit, stdin, stdout, argv } from "./systemUtils.js";
import url from "node:url";
import { Command } from "commander";
import type { SlothContext } from "./config.js";

export function toFileSafeString(string: string): string {
    return string.replace(/[^A-Za-z0-9]/g, '-');
}

export function fileSafeLocalDate(): string {
    const date = new Date();
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal = date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, 19);
    return toFileSafeString(isoLocal);
}

export function readFileFromCurrentDir(fileName: string): string {
    const filePath = resolve(slothContext.currentDir, fileName);
    display(`Reading file ${fileName}...`);
    return readFileSyncWithMessages(filePath);
}

export function writeFileIfNotExistsWithMessages(filePath: string, content: string): void {
    display(`checking ${filePath} existence`);
    if (!existsSync(filePath)) {
        writeFileSync(filePath, content);
        displaySuccess(`Created ${filePath}`);
    } else {
        displayWarning(`${filePath} already exists`);
    }
}

export function readFileSyncWithMessages(
    filePath: string,
    errorMessageIn?: string,
    noFileMessage?: string
): string {
    const errorMessage = errorMessageIn ?? 'Error reading file at: ';
    try {
        return readFileSync(filePath, { encoding: 'utf8' });
    } catch (error) {
        displayError(errorMessage + filePath);
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            displayWarning(noFileMessage ?? 'Please ensure the file exists.');
        } else {
            displayError((error as Error).message);
        }
        exit(1); // Exit gracefully after error
        throw error; // This line will never be reached due to exit(1), but satisfies TypeScript
    }
}

export function readStdin(program: Command): Promise<void> {
    return new Promise((resolvePromise) => {
        // TODO use progress indicator here
        if (stdin.isTTY) {
            program.parseAsync().then(() => resolvePromise());
        } else {
            // Support piping diff into gsloth
            stdout.write('reading STDIN.');
            stdin.on('readable', function(this: NodeJS.ReadStream) {
                const chunk = this.read();
                stdout.write('.');
                if (chunk !== null) {
                    const chunkStr = chunk.toString('utf8');
                    (slothContext as { stdin: string }).stdin = slothContext.stdin + chunkStr;
                }
            });
            stdin.on('end', function() {
                stdout.write('.\n');
                program.parseAsync(argv).then(() => resolvePromise());
            });
        }
    });
}

interface SpawnOutput {
    stdout: string;
    stderr: string;
}

export async function spawnCommand(
    command: string,
    args: string[],
    progressMessage: string,
    successMessage: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        // TODO use progress indicator
        const out: SpawnOutput = { stdout: '', stderr: '' };
        const spawned = spawn(command, args);
        spawned.stdout.on('data', async (stdoutChunk) => {
            display(progressMessage);
            out.stdout += stdoutChunk.toString();
        });
        spawned.stderr.on('data', (err) => {
            display(progressMessage);
            out.stderr += err.toString();
        });
        spawned.on('error', (err) => {
            reject(err.toString());
        });
        spawned.on('close', (code) => {
            if (code === 0) {
                display(successMessage);
                resolve(out.stdout);
            } else {
                displayError(`Failed to spawn command with code ${code}`);
                reject(out.stdout + ' ' + out.stderr);
            }
        });
    });
}

export function getSlothVersion(): string {
    return '0.0.0';
    // const jsonPath = resolve(slothContext.installDir, 'package.json');
    // const projectJson = readFileSync(jsonPath, { encoding: 'utf8' });
    // return JSON.parse(projectJson).version;
}

export class ProgressIndicator {
    private hasBeenCalled: boolean;
    private initialMessage: string;

    constructor(initialMessage: string) {
        this.hasBeenCalled = false;
        this.initialMessage = initialMessage;
    }

    indicate(): void {
        if (this.hasBeenCalled) {
            stdout.write('.');
        } else {
            this.hasBeenCalled = true;
            stdout.write(this.initialMessage);
        }
    }
}

interface LLMOutput {
    messages: Array<{
        content: string;
    }>;
}

/**
 * Extracts the content of the last message from an LLM response
 * @param output - The output from the LLM containing messages
 * @returns The content of the last message
 */
export function extractLastMessageContent(output: LLMOutput): string {
    if (!output || !output.messages || !output.messages.length) {
        return '';
    }
    return output.messages[output.messages.length - 1].content;
}

/**
 * Dynamically imports a module from a file path from the outside of the installation dir
 * @param filePath - The path to the file to import
 * @returns A promise that resolves to the imported module
 */
export function importExternalFile(filePath: string): Promise<any> {
    const configFileUrl = url.pathToFileURL(filePath).toString();
    return import(configFileUrl);
}

/**
 * Alias for importExternalFile for backward compatibility with tests
 * @param filePath - The path to the file to import
 * @returns A promise that resolves to the imported module
 */
export const importFromFilePath = importExternalFile;

/**
 * Reads multiple files from the current directory and returns their contents
 * @param fileNames - Array of file names to read
 * @returns Combined content of all files with proper formatting
 */
export function readMultipleFilesFromCurrentDir(fileNames: string | string[]): string {
    if (!Array.isArray(fileNames)) {
        return readFileFromCurrentDir(fileNames);
    }
    
    return fileNames.map(fileName => {
        const content = readFileFromCurrentDir(fileName);
        return `${fileName}:\n\`\`\`\n${content}\n\`\`\``;
    }).join('\n\n');
}

export async function execAsync(command: string): Promise<string> {
    const { exec } = await import('node:child_process');
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(new Error(stderr));
                return;
            }
            resolve(stdout.trim());
        });
    });
}
