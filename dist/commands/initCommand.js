import { Argument } from 'commander';
import { availableDefaultConfigs, createProjectConfig } from "../config.js";
/**
 * Adds the init command to the program
 * @param {Object} program - The commander program
 * @param {Object} context - The context object
 */
// eslint-disable-next-line no-unused-vars
export function initCommand(program, context) {
    program.command('init')
        .description('Initialize the Gaunt Sloth Assistant in your project. This will write necessary config files.')
        .addArgument(new Argument('<type>', 'Config type').choices(availableDefaultConfigs))
        .action(async (config) => {
        await createProjectConfig(config);
    });
}
//# sourceMappingURL=initCommand.js.map