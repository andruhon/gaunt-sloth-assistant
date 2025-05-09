export function getCurrentDir(): string;
export function getInstallDir(): undefined;
export function exit(code: any): never;
export const stdin: NodeJS.ReadStream & {
    fd: 0;
};
export const stdout: NodeJS.WriteStream & {
    fd: 1;
};
export const argv: string[];
export const env: NodeJS.ProcessEnv;
export function setInstallDir(dir: any): any;
export function log(message: any): void;
export function error(message: any): void;
export function warn(message: any): void;
export function info(message: any): void;
export function debug(message: any): void;
