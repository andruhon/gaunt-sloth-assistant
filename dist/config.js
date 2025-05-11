import path from "node:path/posix";
import { v4 as uuidv4 } from "uuid";
import { displayDebug, displayError, displayInfo, displayWarning } from "#src/consoleUtils.js";
import { importExternalFile, writeFileIfNotExistsWithMessages } from "#src/utils.js";
import { existsSync, readFileSync } from "node:fs";
import { exit, getCurrentDir } from "#src/systemUtils.js";
export const USER_PROJECT_CONFIG_JS = '.gsloth.config.js';
export const USER_PROJECT_CONFIG_JSON = '.gsloth.config.json';
export const USER_PROJECT_CONFIG_MJS = '.gsloth.config.mjs';
export const SLOTH_INTERNAL_PREAMBLE = '.gsloth.preamble.internal.md';
export const USER_PROJECT_REVIEW_PREAMBLE = '.gsloth.preamble.review.md';
export const availableDefaultConfigs = ['vertexai', 'anthropic', 'groq'];
export const DEFAULT_CONFIG = {
    llm: undefined,
    contentProvider: "file",
    requirementsProvider: "file",
    commands: {
        pr: {
            contentProvider: "gh"
        }
    }
};
// TODO this should be reworked to something more robust
export const slothContext = {
    /**
     * Directory where the sloth is installed.
     * index.js should set up this.
     */
    // installDir // FIXME
    /**
     * Directory where the sloth has been invoked. Usually user's project root.
     * index.js should set up this.
     */
    // currentDir // FIXME
    config: DEFAULT_CONFIG,
    stdin: '',
    session: { configurable: { thread_id: uuidv4() } }
};
export async function initConfig() {
    const currentDir = getCurrentDir();
    const jsonConfigPath = path.join(currentDir, USER_PROJECT_CONFIG_JSON);
    const jsConfigPath = path.join(currentDir, USER_PROJECT_CONFIG_JS);
    const mjsConfigPath = path.join(currentDir, USER_PROJECT_CONFIG_MJS);
    // Try loading JSON config file first
    if (existsSync(jsonConfigPath)) {
        try {
            const jsonConfig = JSON.parse(readFileSync(jsonConfigPath, 'utf8'));
            // If the config has an LLM with a type, create the appropriate LLM instance
            if (jsonConfig.llm && typeof jsonConfig.llm === 'object' && 'type' in jsonConfig.llm) {
                await tryJsonConfig(jsonConfig);
            }
            else {
                slothContext.config = { ...slothContext.config, ...jsonConfig };
            }
        }
        catch (e) {
            displayDebug(e instanceof Error ? e : String(e));
            displayError(`Failed to read config from ${USER_PROJECT_CONFIG_JSON}, will try other formats.`);
            // Continue to try other formats
            return tryJsConfig();
        }
    }
    else {
        // JSON config not found, try JS
        return tryJsConfig();
    }
    // Helper function to try loading JS config
    async function tryJsConfig() {
        if (existsSync(jsConfigPath)) {
            return importExternalFile(jsConfigPath)
                .then((i) => i.configure(jsConfigPath))
                .then((config) => {
                slothContext.config = { ...slothContext.config, ...config };
            })
                .catch((e) => {
                displayDebug(e instanceof Error ? e : String(e));
                displayError(`Failed to read config from ${USER_PROJECT_CONFIG_JS}, will try other formats.`);
                // Continue to try other formats
                return tryMjsConfig();
            });
        }
        else {
            // JS config not found, try MJS
            return tryMjsConfig();
        }
    }
    // Helper function to try loading MJS config
    async function tryMjsConfig() {
        if (existsSync(mjsConfigPath)) {
            return importExternalFile(mjsConfigPath)
                .then((i) => i.configure(mjsConfigPath))
                .then((config) => {
                slothContext.config = { ...slothContext.config, ...config };
            })
                .catch((e) => {
                displayDebug(e instanceof Error ? e : String(e));
                displayError(`Failed to read config from ${USER_PROJECT_CONFIG_MJS}.`);
                displayError(`No valid configuration found. Please create a valid configuration file.`);
                exit();
            });
        }
        else {
            // No config files found
            displayError('No configuration file found. Please create one of: '
                + `${USER_PROJECT_CONFIG_JSON}, ${USER_PROJECT_CONFIG_JS}, or ${USER_PROJECT_CONFIG_MJS} `
                + 'in your project directory.');
            exit();
        }
    }
}
// Process JSON LLM config by creating the appropriate LLM instance
export async function tryJsonConfig(jsonConfig) {
    const llmConfig = jsonConfig?.llm;
    const llmType = llmConfig?.type?.toLowerCase();
    // Check if the LLM type is in availableDefaultConfigs
    if (!llmType || !availableDefaultConfigs.includes(llmType)) {
        displayError(`Unsupported LLM type: ${llmType}. Available types are: ${availableDefaultConfigs.join(', ')}`);
        slothContext.config = { ...slothContext.config, ...jsonConfig };
        return;
    }
    try {
        // Import the appropriate config module based on the LLM type
        try {
            const configModule = await import(`./configs/${llmType}.js`);
            if (configModule.processJsonConfig) {
                jsonConfig.llm = await configModule.processJsonConfig(llmConfig);
            }
            else {
                displayWarning(`Config module for ${llmType} does not have processJsonConfig function.`);
            }
        }
        catch (importError) {
            displayDebug(importError instanceof Error ? importError : String(importError));
            displayWarning(`Could not import config module for ${llmType}.`);
        }
    }
    catch (error) {
        displayDebug(error instanceof Error ? error : String(error));
        displayError(`Error creating LLM instance for type ${llmType}.`);
    }
    slothContext.config = { ...slothContext.config, ...jsonConfig };
}
export async function createProjectConfig(configType) {
    displayInfo(`Setting up your project\n`);
    writeProjectReviewPreamble();
    displayWarning(`Make sure you add as much detail as possible to your ${USER_PROJECT_REVIEW_PREAMBLE}.\n`);
    // Check if the config type is in availableDefaultConfigs
    if (!availableDefaultConfigs.includes(configType)) {
        displayError(`Unsupported config type: ${configType}. Available types are: ${availableDefaultConfigs.join(', ')}`);
        exit(1);
        return;
    }
    displayInfo(`Creating project config for ${configType}`);
    const vendorConfig = await import(`./configs/${configType}.js`);
    vendorConfig.init(USER_PROJECT_CONFIG_JSON, slothContext);
}
export function writeProjectReviewPreamble() {
    if (!slothContext.currentDir) {
        throw new Error('Current directory not set');
    }
    const reviewPreamblePath = path.join(slothContext.currentDir, USER_PROJECT_REVIEW_PREAMBLE);
    writeFileIfNotExistsWithMessages(reviewPreamblePath, 'You are doing generic code review.\n'
        + ' Important! Please remind user to prepare proper AI preamble in'
        + USER_PROJECT_REVIEW_PREAMBLE
        + ' for this project. Use decent amount of ⚠️ to highlight lack of config.'
        + ' Explicitly mention `' + USER_PROJECT_REVIEW_PREAMBLE + '`.');
}
//# sourceMappingURL=config.js.map