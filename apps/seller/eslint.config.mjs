import js from "@eslint/js";
import next from "eslint-config-next-flat";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  { 
    ignores: [
      ".next/**", 
      "out/**", 
      "build/**", 
      "node_modules/**",
      "hosting/**",
      "*.config.js",
      "*.config.mjs"
    ] 
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
  },
  next,
];
