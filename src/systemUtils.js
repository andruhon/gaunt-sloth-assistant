/**
 * This file contains all system functions and objects that are globally available
 * but not imported directly, such as process.stdin, process.stdout, process.argv,
 * process.env, process.cwd(), process.exit(), etc.
 *
 * By centralizing these in one file, we improve testability and make it easier
 * to mock these dependencies in tests.
 */

const innerState = {
    installDir: undefined
};

/* eslint-disable no-undef */
// Process-related functions and objects
export const getCurrentDir = () => process.cwd();
export const getInstallDir = () => innerState.installDir;
export const exit = (code) => process.exit(code);
export const stdin = process.stdin;
export const stdout = process.stdout;
export const argv = process.argv;
export const env = process.env;

export const setInstallDir = (dir) => innerState.installDir = dir;

// Console-related functions
export const log = (message) => console.log(message);
export const error = (message) => console.error(message);
export const warn = (message) => console.warn(message);
export const info = (message) => console.info(message);
export const debug = (message) => console.debug(message);
/* eslint-enable no-undef */
