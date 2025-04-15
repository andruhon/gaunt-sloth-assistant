import path from "node:path";
import url from "node:url";
import { v4 as uuidv4 } from "uuid";

export async function getConfig() {
    const CONFIG_FILE = '.gsloth.config.js'
    const session = { configurable: { thread_id: uuidv4() } };
    const configFileUrl = url.pathToFileURL(path.join(process.cwd(),CONFIG_FILE));
    const { configure } = await import(configFileUrl);
    const config = await configure((module) => import(module));
    return { ...config, session };
}