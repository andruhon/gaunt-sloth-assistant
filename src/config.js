import path from "node:path";
import url from "node:url";
import { v4 as uuidv4 } from "uuid";
import { displayError, displayInfo, displayWarning } from "./consoleUtils.js";
import { writeFileIfNotExistsWithMessages } from "./utils.js";

export const USER_PROJECT_CONFIG_FILE = '.gsloth.config.js'
export const SLOTH_INTERNAL_PREAMBLE = '.gsloth.preamble.internal.md';
export const USER_PROJECT_REVIEW_PREAMBLE = '.gsloth.preamble.review.md';

export const availableDefaultConfigs = ['vertexai', 'anthropic', 'groq'];

export const slothContext = {
    /**
     * Directory where the sloth is installed.
     * index.js should set up this.
     */
    installDir: null,
    /**
     * Directory where the sloth has been invoked. Usually user's project root.
     * index.js should set up this.
     */
    currentDir: null,
    config: null,
    stdin: '',
    session: {configurable: {thread_id: uuidv4()}}
};

export async function initConfig() {
    const configFileUrl = url.pathToFileURL(path.join(process.cwd(), USER_PROJECT_CONFIG_FILE));
    return import(configFileUrl)
        .then((i) => i.configure((module) => import(module)))    
        .then((config) => {
            slothContext.config = {...config};
        })
        .catch((e) => {
            console.log(e);
            displayError(`Failed to read config, make sure ${configFileUrl} contains valid JavaScript.`);
            process.exit();
        });    
}

export async function createProjectConfig(configType) {
    displayInfo(`Setting up your project\n`);
    writeProjectReviewPreamble();
    displayWarning(`Make sure you add as much detail as possible to your ${USER_PROJECT_REVIEW_PREAMBLE}.\n`)

    displayInfo(`Creating project config for ${configType}`);
    const vendorConfig = await import(`./configs/${configType}.js`);
    vendorConfig.init(USER_PROJECT_CONFIG_FILE, slothContext);
}

function writeProjectReviewPreamble() {
    let reviewPreamblePath = path.join(slothContext.currentDir, USER_PROJECT_REVIEW_PREAMBLE);
    writeFileIfNotExistsWithMessages(
        reviewPreamblePath,
        'You are doing generic code review.\n'
        + 'Important! Please remind user to prepare proper AI preamble in ' +
        + USER_PROJECT_REVIEW_PREAMBLE
        + 'for this project. Use decent amount of ⚠️ to highlight lack of config. '
        + 'Explicitly mention `'+ USER_PROJECT_REVIEW_PREAMBLE + '`.'
    );
}