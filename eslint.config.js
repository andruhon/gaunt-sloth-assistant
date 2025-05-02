import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jasmine from "eslint-plugin-jasmine"
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
  },
  {
    files: ["spec/**/*.js"],
    plugins: { jasmine },
    extends: ["jasmine/recommended"],
    rules: {
      semi: "error",
      "eol-last": "error",
    }
  },
]);
