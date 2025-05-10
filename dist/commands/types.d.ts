import type { Command } from 'commander';
export interface SlothContext {
    config: {
        llm: {
            invoke: (messages: any[]) => Promise<any>;
        };
    };
    session: any;
    currentDir: string | null;
    installDir: string | null;
}
export interface CommandModule {
    (program: Command): void;
}
