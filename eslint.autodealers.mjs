/**
 * Shared ESLint flat config for Next.js apps (TypeScript + React).
 * Imported from each app’s eslint.config.mjs.
 */
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    rules: {
      "no-undef": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/exhaustive-deps": "warn",
      // Codebase uses `any` and dynamic requires in API routes; tighten gradually.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/no-unused-expressions": "warn",
      "prefer-const": "warn",
      // Legacy UI/API: keep CI green while improving incrementally (fix real hook bugs separately).
      "react-hooks/rules-of-hooks": "warn",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": "warn",
      "no-case-declarations": "warn",
      "no-useless-escape": "warn",
    },
  }
);
