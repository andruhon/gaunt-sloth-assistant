export declare const getCurrentDir: () => string;
export declare const getInstallDir: () => string;
export declare const exit: (code?: number) => never;
export declare const stdin: NodeJS.ReadStream & {
    fd: 0;
};
export declare const stdout: NodeJS.WriteStream & {
    fd: 1;
};
export declare const argv: string[];
export declare const env: NodeJS.ProcessEnv;
/**
 * Provide the path to the entry point of the application.
 * This is used to set the install directory.
 */
export declare const setEntryPoint: (indexJs: string) => void;
export declare const log: (message: string) => void;
export declare const error: (message: string) => void;
export declare const warn: (message: string) => void;
export declare const info: (message: string) => void;
export declare const debug: (message: string) => void;
