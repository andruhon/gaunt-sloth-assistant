#!/usr/bin/env node
import {Command} from 'commander';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {spawn} from 'node:child_process';
import {display, displayError, displayWarning} from "./consoleUtils.js";
import {fileURLToPath} from "url";

const program = new Command();

// TODO figure out some way to have sloth globals everywhere, maybe exports from config file
const INTERNAL_PREAMBLE =  '.gsloth.preamble.internal.md';
const PR_PREAMBLE = '.gsloth.preamble.review.md';
const CURRENT_DIR = process.cwd();
const global = {stdin: '', installDir: dirname(fileURLToPath(import.meta.url))};

program
    .name('gsloth')
    .description('Gaunt Sloth Assistant reviewing your PRs')
    .version('0.0.1');

program.command('pr')
    .description('Review a PR in current git directory (assuming that GH cli is installed and authenticated for current project')
    .argument('<prNumber>', 'PR number to review')
    .option('-f, --file <file>', 'Input file. Context of this file will be added BEFORE the diff')
    // TODO add option consuming extra message as argument
    .action(async (pr, options) => {
        if (global.stdin) {
            displayError('gsloth pr does not expect stdin');
            return;
        }
        console.log('Starting review of', pr);
        const diff = await getPrDiff(pr);
        const preamble = [readInternalPreamble(), readPreamble(PR_PREAMBLE)];
        if (options.input) {
            preamble.push(readFile(options.input));
        }
        const { review } = await import('./codeReview.js');
        await review('sloth-PR-review-'+pr, preamble.join("\n"), diff);
    });

program.command('review')
    .description('Review provided diff or other content')
    .option('-f, --file <file>', 'Input file. Context of this file will be added BEFORE the diff')
    // TODO add option consuming extra message as argument
    .action(async (options) => {
        if (!global.stdin) {
            displayError('gsloth review expects stdin with github diff stdin');
            return
        }
        const preamble = [readInternalPreamble(), readPreamble(PR_PREAMBLE)];
        if (options.input) {
            preamble.push(readFile(options.input));
        }
        const { review } = await import('./codeReview.js');
        await review('sloth-DIFF-review', preamble.join("\n"), global.stdin);
    });

// TODO add question command

// TODO add general interactive chat command

if(process.stdin.isTTY) {
    program.parse();
} else {
    // Support piping diff into gsloth
    process.stdin.on('readable', function() {
        const chunk = this.read();
        console.log('reading STDIN...');
        if (chunk !== null) {
            global.stdin += chunk;
        }
    });
    process.stdin.on('end', function() {
        program.parse(process.argv);
    });
}

function readInternalPreamble() {
    const filePath = resolve(global.installDir, INTERNAL_PREAMBLE);
    return readFileSyncWithMessages(filePath, "Error reading internal preamble file at:")
}

function readPreamble(preambleFilename) {
    const filePath = resolve(CURRENT_DIR, preambleFilename);
    return readFileSyncWithMessages(filePath, "Error reading preamble file at:")
}

function readFile(fileName) {
    const filePath = resolve(CURRENT_DIR, fileName);
    return readFileSyncWithMessages(filePath);
}

function readFileSyncWithMessages(filePath, errorMessageIn) {
    const errorMessage = errorMessageIn ?? 'Error reading file at: ';
    try {
        return readFileSync(filePath, { encoding: 'utf8' });
    } catch (error) {
        displayError(errorMessage + filePath);
        if (error.code === 'ENOENT') {
            displayWarning('Please ensure the file exists.');
        } else {
            displayError(error.message);
        }
        process.exit(1); // Exit gracefully after error
    }
}

async function getPrDiff(pr) {
    return spawnCommand('gh', ['pr', 'diff', pr], 'Loading PR diff...', 'Loaded PR diff.');
}

async function spawnCommand(command, args, progressMessage, successMessage) {
    return new Promise((resolve, reject) => {
        const out = {stdout: ''};
        const spawned = spawn(command, args);
        spawned.stdout.on('data', async (stdoutChunk) => {
            display(progressMessage);
            out.stdout += stdoutChunk.toString();
        });
        spawned.on('error', (err) => {
            reject(err);
        })
        spawned.on('close', (code) => {
            display(successMessage);
            resolve(out.stdout);
        });
    });
}
