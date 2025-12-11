import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import globals from "globals"
import js from "@eslint/js"

export default [
  js.configs.recommended,

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,

      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "_",
      }],
    },
  },
];