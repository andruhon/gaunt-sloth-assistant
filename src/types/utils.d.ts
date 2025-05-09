import { Command } from 'commander';

export function getSlothVersion(): string;
export function readStdin(program: Command): Promise<void>;
export function readMultipleFilesFromCurrentDir(files: string[]): string;
export function importExternalFile(filePath: string): Promise<any>;
export function writeFileIfNotExistsWithMessages(filePath: string, content: string): void;
export function readFileFromCurrentDir(fileName: string): string | undefined;
export function readFileSyncWithMessages(filePath: string, errorMessageIn?: string, noFileMessage?: string): string | undefined;
export function toFileSafeString(str: string): string;
export function spawnCommand(command: string, args: string[], progressMessage: string, successMessage: string): Promise<void>;

export class ProgressIndicator {
    constructor(initialMessage: string);
    update(message: string): void;
    complete(message: string): void;
}

export function getLastMessageContent(output: { messages: Array<{ content: string }> }): string; 