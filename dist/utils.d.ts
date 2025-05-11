import { Command } from "commander";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
export declare function toFileSafeString(string: string): string;
export declare function fileSafeLocalDate(): string;
export declare function readFileFromCurrentDir(fileName: string): string;
export declare function writeFileIfNotExistsWithMessages(filePath: string, content: string): void;
export declare function readFileSyncWithMessages(filePath: string, errorMessageIn?: string, noFileMessage?: string): string;
export declare function readStdin(program: Command): Promise<void>;
export declare function spawnCommand(command: string, args: string[], progressMessage: string, successMessage: string): Promise<string>;
export declare function getSlothVersion(): string;
export declare class ProgressIndicator {
    private hasBeenCalled;
    private initialMessage;
    constructor(initialMessage: string);
    indicate(): void;
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
export declare function extractLastMessageContent(output: LLMOutput): string;
/**
 * Dynamically imports a module from a file path from the outside of the installation dir
 * @param filePath - The path to the file to import
 * @returns A promise that resolves to the imported module
 */
export declare function importExternalFile(filePath: string): Promise<any>;
/**
 * Alias for importExternalFile for backward compatibility with tests
 * @param filePath - The path to the file to import
 * @returns A promise that resolves to the imported module
 */
export declare const importFromFilePath: typeof importExternalFile;
/**
 * Reads multiple files from the current directory and returns their contents
 * @param fileNames - Array of file names to read
 * @returns Combined content of all files with proper formatting
 */
export declare function readMultipleFilesFromCurrentDir(fileNames: string | string[]): string;
export declare function execAsync(command: string): Promise<string>;
export declare function createSystemMessage(content: string): SystemMessage;
export declare function createHumanMessage(content: string): HumanMessage;
export {};
