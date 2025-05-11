import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";

const { setTimeout, setInterval, clearInterval, Buffer, fetch } = globals.node;

// FIXME this lint config needs to be updated to work with TS

export default defineConfig([
  {
    files: ["src/**/*.js"],
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    rules: {
      semi: "error",
      "eol-last": "error"
    },
    languageOptions: {
      globals: {
        setTimeout,
        setInterval,
        clearInterval,
        Buffer,
        fetch
      },
    },
  }
]);
