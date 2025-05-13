import { Argument, Command } from "commander";
import { availableDefaultConfigs, createProjectConfig } from "#src/config.js";
import type { SlothContext, ConfigType } from "#src/config.js";

/**
 * Adds the init command to the program
 * @param program - The commander program
 * @param context - The context object
 */
export function initCommand(program: Command, context: SlothContext): void {
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
