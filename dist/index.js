#!/usr/bin/env node
import { Command } from 'commander';
import { askCommand } from "#src/commands/askCommand.js";
import { initCommand } from "./commands/initCommand.js";
import { reviewCommand } from "./commands/reviewCommand.js";
import { slothContext } from "./config.js";
import { getCurrentDir, getInstallDir, setEntryPoint } from "./systemUtils.js";
import { getSlothVersion, readStdin } from "./utils.js";
/*
 TODO figure out how to deal with path aliases, tsc does not convert them itself
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
*/
const program = new Command();
setEntryPoint(import.meta.url);
slothContext.currentDir = getCurrentDir();
slothContext.installDir = getInstallDir();
program
    .name('gsloth')
    .description('Gaunt Sloth Assistant reviewing your PRs')
    .version(getSlothVersion());
initCommand(program, slothContext);
reviewCommand(program, slothContext);
askCommand(program, slothContext);
// TODO add general interactive chat command
await readStdin(program);
//# sourceMappingURL=index.js.map