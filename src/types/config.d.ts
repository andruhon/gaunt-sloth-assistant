export const USER_PROJECT_CONFIG_JS: string;
export const USER_PROJECT_CONFIG_JSON: string;
export const USER_PROJECT_CONFIG_MJS: string;
export const SLOTH_INTERNAL_PREAMBLE: string;
export const USER_PROJECT_REVIEW_PREAMBLE: string;

export const availableDefaultConfigs: string[];

export interface DefaultConfig {
    llm?: any;
    contentProvider?: string;
    requirementsProvider?: string;
    commands?: {
        pr?: {
            contentProvider?: string;
        };
    };
}

export const DEFAULT_CONFIG: DefaultConfig;

export interface SlothContext {
    installDir: string | null | undefined;
    currentDir: string | null | undefined;
    config: DefaultConfig;
    stdin: string;
    session: {
        configurable: {
            thread_id: string;
        };
    };
}

export const slothContext: SlothContext = {
    installDir: undefined,
    currentDir: undefined,
    config: {
        llm: undefined,
        contentProvider: "file",
        requirementsProvider: "file",
        commands: {
            pr: {
                contentProvider: "gh"
            }
        }
    },
    stdin: '',
    session: {
        configurable: {
            thread_id: ''
        }
    }
};

export function initConfig(): Promise<void>;
export function tryJsonConfig(jsonConfig: any): Promise<void>;
export function createProjectConfig(configType: string): Promise<void>;
export function writeProjectReviewPreamble(): void; 