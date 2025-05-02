import {display, displayError, displaySuccess, displayWarning} from "./consoleUtils.js";
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {slothContext} from "./config.js";
import {resolve} from "node:path";
import {spawn} from "node:child_process";
import {exit, stdin, stdout, argv} from "./systemUtils.js";
import url from "node:url";

export function toFileSafeString(string) {
    return string.replace(/[^A-Za-z0-9]/g, '-');
}

export function fileSafeLocalDate() {
    const date = new Date();
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal =  date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, 19);
    return toFileSafeString(isoLocal);
}

export function readFileFromCurrentDir(fileName) {
    const filePath = resolve(slothContext.currentDir, fileName);
    display(`Reading file ${fileName}...`);
    return readFileSyncWithMessages(filePath);
}

export function writeFileIfNotExistsWithMessages(filePath, content) {
    display(`checking ${filePath} existence`);
    if (!existsSync(filePath)) {
        writeFileSync(filePath, content);
        displaySuccess(`Created ${filePath}`);
    } else {
        displayWarning(`${filePath} already exists`);
    }
}

export function readFileSyncWithMessages(filePath, errorMessageIn, noFileMessage) {
    const errorMessage = errorMessageIn ?? 'Error reading file at: ';
    try {
        return readFileSync(filePath, { encoding: 'utf8' });
    } catch (error) {
        displayError(errorMessage + filePath);
        if (error.code === 'ENOENT') {
            displayWarning(noFileMessage ?? 'Please ensure the file exists.');
        } else {
            displayError(error.message);
        }
        exit(1); // Exit gracefully after error
    }
}

export function readStdin(program) {
    return new Promise((resolve) => {
        // TODO use progress indicator here
        if(stdin.isTTY) {
            program.parseAsync().then(resolve);
        } else {
            // Support piping diff into gsloth
            stdout.write('reading STDIN.');
            stdin.on('readable', function() {
                const chunk = this.read();
                stdout.write('.');
                if (chunk !== null) {
                    slothContext.stdin += chunk;
                }
            });
            stdin.on('end', function() {
                stdout.write('.\n');
                program.parseAsync(argv).then(resolve);
            });
        }
    });
}

export async function spawnCommand(command, args, progressMessage, successMessage) {
    return new Promise((resolve, reject) => {
        // TODO use progress indicator
        const out = {stdout: '', stderr: ''};
        const spawned = spawn(command, args);
        spawned.stdout.on('data', async (stdoutChunk, dd) => {
            display(progressMessage);
            out.stdout += stdoutChunk.toString();
        });
        spawned.stderr.on('data', (err) => {
            display(progressMessage);
            out.stderr += err.toString();
        })
        spawned.on('error', (err) => {
            reject(err.toString());
        })
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

export function getSlothVersion() {
    const jsonPath = resolve(slothContext.installDir, 'package.json');
    const projectJson = readFileSync(jsonPath, { encoding: 'utf8' });
    return JSON.parse(projectJson).version;
}


export class ProgressIndicator {

    constructor(initialMessage) {
        this.hasBeenCalled = false;
        this.initialMessage = initialMessage;
    }

    indicate() {
        if (this.hasBeenCalled) {
            stdout.write('.');
        } else {
            this.hasBeenCalled = true;
            stdout.write(this.initialMessage);
        }
    }

}

/**
 * Extracts the content of the last message from an LLM response
 * @param {Object} output - The output from the LLM containing messages
 * @returns {string} The content of the last message
 */
export function extractLastMessageContent(output) {
    if (!output || !output.messages || !output.messages.length) {
        return '';
    }
    return output.messages[output.messages.length - 1].content;
}

/**
 * Dynamically imports a module from a file path from the outside of the installation dir
 * @param {string} filePath - The path to the file to import
 * @returns {Promise} A promise that resolves to the imported module
 */
export function importExternalFile(filePath) {
    const configFileUrl = url.pathToFileURL(filePath);
    return import(configFileUrl);
}

/**
 * Alias for importExternalFile for backward compatibility with tests
 * @param {string} filePath - The path to the file to import
 * @returns {Promise} A promise that resolves to the imported module
 */
export const importFromFilePath = importExternalFile;

/**
 * Reads multiple files from the current directory and returns their contents
 * @param {string[]} fileNames - Array of file names to read
 * @returns {string} Combined content of all files with proper formatting
 */
export function readMultipleFilesFromCurrentDir(fileNames) {
    if (!Array.isArray(fileNames)) {
        return readFileFromCurrentDir(fileNames);
    }
    
    return fileNames.map(fileName => {
        const content = readFileFromCurrentDir(fileName);
        return `${fileName}:\n\`\`\`\n${content}\n\`\`\``;
    }).join('\n\n');
}
