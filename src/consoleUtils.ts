import chalk from "chalk";
import { debug as systemDebug, error as systemError, log } from "#src/systemUtils.js";

// TODO it seems like commander supports coloured output, maybe dependency to chalk can be removed

export function displayError(message: string): void {
  systemError(chalk.red(message));
}

export function displayWarning(message: string): void {
  systemError(chalk.yellow(message));
}

export function displaySuccess(message: string): void {
  systemError(chalk.green(message));
}

export function displayInfo(message: string): void {
  systemError(chalk.blue(message));
}

export function display(message: string): void {
  log(message);
}

export function displayDebug(message: string | Error | undefined): void {
  // TODO make it controlled by config
  if (message instanceof Error) {
    systemDebug(message.stack || "");
  } else if (message !== undefined) {
    systemDebug(message);
  }
}
