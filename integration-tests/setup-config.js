import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configName = process.argv[2];

const validConfigs = [
  'groq',
  'anthropic',
  'vertexai',
  'deepseek',
  'openai',
  'inception',
  'google-genai',
  'xai',
  'openrouter',
];

console.log(`Provided config "${configName}"`);
if (!configName) {
  console.error(`Please provide a config name: ${validConfigs.join(', ')}`);
  process.exit(1);
}

if (!validConfigs.includes(configName)) {
  console.error(`Invalid config name. Must be one of: ${validConfigs.join(', ')}`);
  process.exit(1);
}

const sourceFile = path.join(__dirname, 'configs', `${configName}.gsloth.config.json`);
const targetFile = path.join(__dirname, '.gsloth.config.json');

// Remove existing config if it exists
if (fs.existsSync(targetFile)) {
  fs.unlinkSync(targetFile);
  console.log('Removed existing .gsloth.config.json');
}

// Copy the selected config
try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`Copied ${configName}.gsloth.config.json to .gsloth.config.json`);
} catch (error) {
  console.error(`Error copying config file: ${error.message}`);
  process.exit(1);
}

const reviewPath = path.join(__dirname, 'testreview.md');
if (fs.existsSync(reviewPath)) {
  fs.unlinkSync(reviewPath);
  console.log(`Removed testreview.md`);
}
