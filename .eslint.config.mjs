// TODO
// // eslint.config.mjs
// // Remember to install dependencies:
// // npm install --save-dev eslint @eslint/js eslint-plugin-n globals eslint-config-prettier
// // yarn add --dev eslint @eslint/js eslint-plugin-n globals eslint-config-prettier
// // pnpm add -D eslint @eslint/js eslint-plugin-n globals eslint-config-prettier
//
// import js from "@eslint/js"; // Provides eslint:recommended and eslint:all
// import pluginN from "eslint-plugin-n"; // Successor to eslint-plugin-node
// import globals from "globals"; // Provides standard global variables (node, browser, etc.)
// import eslintConfigPrettier from "eslint-config-prettier"; // Disables rules that conflict with Prettier
//
// export default [
//     // 1. Global Ignores
//     // Files/directories to ignore globally. You can add more patterns.
//     {
//         ignores: [
//             "node_modules/",
//             "dist/", // Common build output directory
//             "build/",  // Another common build output directory
//             ".env",
//             "*.log",
//             "coverage/", // Test coverage reports
//         ],
//     },
//
//     // 2. ESLint Recommended Rules
//     // Provides a good baseline set of rules maintained by the ESLint team.
//     js.configs.recommended,
//
//     // 3. Node.js Specific Rules (using eslint-plugin-n)
//     // Recommended configuration for Node.js projects.
//     pluginN.configs['flat/recommended'],
//
//     // 4. Custom Configuration for your JS/MJS files
//     {
//         files: ["**/*.{js,mjs}"], // Apply these settings to .js and .mjs files
//         languageOptions: {
//             ecmaVersion: "latest", // Use the latest ECMAScript features
//             sourceType: "module",  // Set to "module" for ES Modules (import/export)
//             globals: {
//                 ...globals.nodeBuiltin, // Includes Node.js built-in globals like 'process', 'Buffer', etc.
//                 // Add other global environments if needed:
//                 // ...globals.browser, // If your code also runs in the browser
//                 // Add any other custom global variables your project uses:
//                 // myCustomGlobal: "readonly",
//             }
//         },
//         rules: {
//             // Customize or override rules here
//             "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Warn about unused vars, except those starting with _
//             "semi": ["error", "always"], // Enforce semicolons
//             "quotes": ["warn", "single"], // Prefer single quotes
//             "indent": ["warn", 2],        // Enforce 2-space indentation
//
//             // Node specific rule examples (from eslint-plugin-n) - adjust as needed
//             "n/no-unpublished-import": ["error", {
//                 "allowModules": [], // Add exceptions for modules used in dev but not in dependencies
//             }],
//             "n/no-missing-import": "error", // Ensure imports can be resolved
//             "n/no-extraneous-import": "error", // Prevent importing devDependencies in production code
//
//             // Add other rules or modify existing ones based on your team's style guide
//         }
//     },
//
//     // 5. Prettier Configuration (Optional but Recommended)
//     // IMPORTANT: This MUST be the LAST configuration object in the array.
//     // It disables ESLint rules that would conflict with Prettier's formatting.
//     // Assumes you are using Prettier for code formatting.
//     eslintConfigPrettier,
// ];