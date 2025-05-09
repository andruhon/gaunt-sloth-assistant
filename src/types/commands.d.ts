import { Command } from 'commander';

export interface SlothContext {
    installDir: string | null | undefined;
    currentDir: string | null | undefined;
    config: {
        llm?: any;
        contentProvider?: string;
        requirementsProvider?: string;
        contentProviderConfig?: Record<string, any>;
        requirementsProviderConfig?: Record<string, any>;
        commands?: {
            pr?: {
                contentProvider?: string;
            };
        };
    };
    stdin: string;
    session: {
        configurable: {
            thread_id: string;
        };
    };
}

export interface ReviewOptions {
    file?: string[];
    requirements?: string;
    requirementsProvider?: string;
    contentProvider?: string;
    message?: string;
}

export interface AskOptions {
    file?: string[];
}

export function reviewCommand(program: Command, context: SlothContext): void;
export function initCommand(program: Command, context: SlothContext): void;
export function askCommand(program: Command, context: SlothContext): void; 