import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import { globalIgnores } from "eslint/config"
import next from "@next/eslint-plugin-next"
import globals from "globals"
import js from "@eslint/js"

export default [
  js.configs.recommended,

  globalIgnores([".next/"]),

  {
    files: ["**/*.ts", "**/*.tsx", "**/*.config.js"],
    languageOptions: {
      parser: tsparser,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
        React: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@next/next": next,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { "argsIgnorePattern": "_" }]
    },
  },
];