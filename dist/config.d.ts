export function initConfig(): Promise<void>;
export function tryJsonConfig(jsonConfig: any): Promise<void>;
export function createProjectConfig(configType: any): Promise<void>;
export function writeProjectReviewPreamble(): void;
export const USER_PROJECT_CONFIG_JS: ".gsloth.config.js";
export const USER_PROJECT_CONFIG_JSON: ".gsloth.config.json";
export const USER_PROJECT_CONFIG_MJS: ".gsloth.config.mjs";
export const SLOTH_INTERNAL_PREAMBLE: ".gsloth.preamble.internal.md";
export const USER_PROJECT_REVIEW_PREAMBLE: ".gsloth.preamble.review.md";
export const availableDefaultConfigs: string[];
export namespace DEFAULT_CONFIG {
    let llm: undefined;
    let contentProvider: string;
    let requirementsProvider: string;
    namespace commands {
        namespace pr {
            let contentProvider_1: string;
            export { contentProvider_1 as contentProvider };
        }
    }
}
export namespace slothContext {
    export let installDir: null;
    export let currentDir: null;
    export { DEFAULT_CONFIG as config };
    export let stdin: string;
    export namespace session {
        namespace configurable {
            let thread_id: string;
        }
    }
}
