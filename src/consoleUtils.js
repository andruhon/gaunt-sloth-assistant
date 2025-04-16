import chalk from 'chalk';

export function displayError (message) {
    console.error(chalk.red(message));
}

export function displayWarning (message) {
    console.error(chalk.yellow(message));
}

export function displaySuccess (message) {
    console.error(chalk.green(message));
}

export function displayInfo (message) {
    console.error(chalk.blue(message));
}

export function display(message) {
    console.log(message);
}
