#!/usr/bin/env node
import { Command } from 'commander';
import { dirname } from 'node:path';
import { fileURLToPath } from "url";
import { reviewCommand } from "./src/commands/reviewCommand.js";
import { initCommand } from "./src/commands/initCommand.js";
import { askCommand } from "./src/commands/askCommand.js";
import { slothContext } from "./src/config.js";
import { getSlothVersion, readStdin } from "./src/utils.js";
import {getCurrentDir, getInstallDir, setInstallDir} from "./src/systemUtils.js";

const program = new Command();

setInstallDir(dirname(fileURLToPath(import.meta.url)));
slothContext.currentDir = getCurrentDir();
slothContext.installDir = getInstallDir();

program
    .name('gsloth')
    .description('Gaunt Sloth Assistant reviewing your PRs')
    .version(getSlothVersion());

initCommand(program, slothContext);

reviewCommand(program, slothContext)

askCommand(program, slothContext);

// TODO add general interactive chat command

await readStdin(program);
