export function getCurrentDir(): string;
export function getInstallDir(): string | null | undefined;
export function setInstallDir(dir: string): void;
export function exit(code?: number): never;
export function log(message: string): void;
export function error(message: string): void;
export function warn(message: string): void;
export function info(message: string): void;
export function debug(message: string): void; 