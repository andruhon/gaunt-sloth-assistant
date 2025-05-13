import jsConfig from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  // Base configuration for all JavaScript files
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "dist/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    plugins: {
      "prettier": prettierPlugin
    },
    rules: {
      ...jsConfig.configs.recommended.rules,
      ...prettierConfig.rules,
      semi: "error",
      "eol-last": "error",
      "prettier/prettier": "error"
    }
  },
  // TypeScript specific configuration
  {
    files: ["**/*.ts"],
    ignores: ["node_modules/**", "dist/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: path.resolve(__dirname, "tsconfig.json")
      },
      globals: {
        ...globals.node
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "prettier": prettierPlugin
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      semi: "error",
      "eol-last": "error",
      "prettier/prettier": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
]);
