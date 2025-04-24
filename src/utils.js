import {display, displayError, displaySuccess, displayWarning} from "./consoleUtils.js";
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {slothContext} from "./config.js";
import {resolve} from "node:path";
import {spawn} from "node:child_process";

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
        process.exit(1); // Exit gracefully after error
    }
}

export function readStdin(program) {
    return new Promise((resolve) => {
        if(process.stdin.isTTY) {
            program.parseAsync().then(resolve);
        } else {
            // Support piping diff into gsloth
            process.stdout.write('reading STDIN.');
            process.stdin.on('readable', function() {
                const chunk = this.read();
                process.stdout.write('.');
                if (chunk !== null) {
                    slothContext.stdin += chunk;
                }
            });
            process.stdin.on('end', function() {
                process.stdout.write('.\n');
                program.parseAsync(process.argv).then(resolve);
            });
        }
    });
}

export async function spawnCommand(command, args, progressMessage, successMessage) {
    return new Promise((resolve, reject) => {
        const out = {stdout: '', stderr: ''};
        const spawned = spawn(command, args);
        spawned.stdout.on('data', async (stdoutChunk, dd) => {
            display(progressMessage);
            out.stdout += stdoutChunk.toString();
        });
        spawned.stderr.on('data', (err) => {
            displayError(progressMessage);
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
            process.stdout.write('.');
        } else {
            this.hasBeenCalled = true;
            process.stdout.write(this.initialMessage);
        }
    }

}