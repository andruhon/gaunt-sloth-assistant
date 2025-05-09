export function toFileSafeString(string: any): any;
export function fileSafeLocalDate(): any;
export function readFileFromCurrentDir(fileName: any): string | undefined;
export function writeFileIfNotExistsWithMessages(filePath: any, content: any): void;
export function readFileSyncWithMessages(filePath: any, errorMessageIn: any, noFileMessage: any): string | undefined;
export function readStdin(program: any): Promise<any>;
export function spawnCommand(command: any, args: any, progressMessage: any, successMessage: any): Promise<any>;
export function getSlothVersion(): string;
/**
 * Extracts the content of the last message from an LLM response
 * @param {Object} output - The output from the LLM containing messages
 * @returns {string} The content of the last message
 */
export function extractLastMessageContent(output: Object): string;
/**
 * Dynamically imports a module from a file path from the outside of the installation dir
 * @param {string} filePath - The path to the file to import
 * @returns {Promise} A promise that resolves to the imported module
 */
export function importExternalFile(filePath: string): Promise<any>;
/**
 * Reads multiple files from the current directory and returns their contents
 * @param {string[]} fileNames - Array of file names to read
 * @returns {string} Combined content of all files with proper formatting
 */
export function readMultipleFilesFromCurrentDir(fileNames: string[]): string;
export class ProgressIndicator {
    constructor(initialMessage: any);
    hasBeenCalled: boolean;
    initialMessage: any;
    indicate(): void;
}
/**
 * Dynamically imports a module from a file path from the outside of the installation dir
 * @param {string} filePath - The path to the file to import
 * @returns {Promise} A promise that resolves to the imported module
 */
export function importFromFilePath(filePath: string): Promise<any>;
