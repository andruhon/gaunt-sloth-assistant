import type { ConfigType } from "#src/config.js";
import { availableDefaultConfigs, createProjectConfig } from "#src/config.js";
import { Argument, Command } from "commander";

/**
 * Adds the init command to the program
 * @param program - The commander program
 */
export function initCommand(program: Command): void {
  program
    .command("init")
    .description(
      "Initialize the Gaunt Sloth Assistant in your project. This will write necessary config files."
    )
    .addArgument(new Argument("<type>", "Config type").choices(availableDefaultConfigs))
    .action(async (config: ConfigType) => {
      await createProjectConfig(config);
    });
}
