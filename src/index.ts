#!/usr/bin/env node
import { Command } from "commander";
import { askCommand } from "#src/commands/askCommand.js";
import { initCommand } from "#src/commands/initCommand.js";
import { reviewCommand } from "#src/commands/reviewCommand.js";
import type { SlothContext } from "#src/config.js";
import { slothContext } from "#src/config.js";
import { getCurrentDir, getInstallDir, setEntryPoint } from "#src/systemUtils.js";
import { getSlothVersion, readStdin } from "#src/utils.js";

/*
 TODO figure out how to deal with path aliases, tsc does not convert them itself
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
*/

const program = new Command();

setEntryPoint(import.meta.url);
(slothContext as SlothContext).currentDir = getCurrentDir();
(slothContext as SlothContext).installDir = getInstallDir();

program
  .name("gsloth")
  .description("Gaunt Sloth Assistant reviewing your PRs")
  .version(getSlothVersion());

initCommand(program);
reviewCommand(program, slothContext);
askCommand(program);

// TODO add general interactive chat command

await readStdin(program);
