#!/usr/bin/env node
import { Command } from 'commander';
import { askCommand } from "./commands/askCommand.js";
import { initCommand } from "./commands/initCommand.js";
import { reviewCommand } from "./commands/reviewCommand.js";
import type { SlothContext } from './config.js';
import { slothContext } from "./config.js";
import { getCurrentDir, getInstallDir, setEntryPoint } from "./systemUtils.js";
import { getSlothVersion, readStdin } from "./utils.js";


const program = new Command();

setEntryPoint(import.meta.url);
(slothContext as SlothContext).currentDir = getCurrentDir();
(slothContext as SlothContext).installDir = getInstallDir();

program
    .name('gsloth')
    .description('Gaunt Sloth Assistant reviewing your PRs')
    .version(getSlothVersion());

initCommand(program, slothContext);
reviewCommand(program, slothContext);
askCommand(program, slothContext);

// TODO add general interactive chat command

await readStdin(program); 