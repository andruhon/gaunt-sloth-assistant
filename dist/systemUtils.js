import { dirname, join } from 'node:path/posix';
import { fileURLToPath } from "url";
const innerState = {
    installDir: undefined
};
// Process-related functions and objects
export const getCurrentDir = () => process.cwd();
export const getInstallDir = () => {
    if (innerState.installDir) {
        return innerState.installDir;
    }
    throw new Error('Install directory not set');
};
export const exit = (code) => process.exit(code);
export const stdin = process.stdin;
export const stdout = process.stdout;
export const argv = process.argv;
export const env = process.env;
/**
 * Provide the path to the entry point of the application.
 * This is used to set the install directory.
 */
export const setEntryPoint = (indexJs) => {
    innerState.installDir = join(dirname(fileURLToPath(indexJs)), '..');
    console.log('installDir', innerState.installDir);
};
// Console-related functions
export const log = (message) => console.log(message);
export const error = (message) => console.error(message);
export const warn = (message) => console.warn(message);
export const info = (message) => console.info(message);
export const debug = (message) => console.debug(message);
//# sourceMappingURL=systemUtils.js.map