import chalk from 'chalk';
import { debug as systemDebug, error as systemError, log } from './systemUtils.js';
// TODO it seems like commander supports coloured output, maybe dependency to chalk can be removed
export function displayError(message) {
    systemError(chalk.red(message));
}
export function displayWarning(message) {
    systemError(chalk.yellow(message));
}
export function displaySuccess(message) {
    systemError(chalk.green(message));
}
export function displayInfo(message) {
    systemError(chalk.blue(message));
}
export function display(message) {
    log(message);
}
export function displayDebug(message) {
    // TODO make it controlled by config
    if (message instanceof Error) {
        systemDebug(message.stack || '');
    }
    else if (message !== undefined) {
        systemDebug(message);
    }
}
//# sourceMappingURL=consoleUtils.js.map