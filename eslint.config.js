import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";

const { setTimeout, setInterval, clearInterval, Buffer, fetch } = globals.node;

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
