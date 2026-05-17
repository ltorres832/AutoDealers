import next from "eslint-config-next-flat";
import base from "../../eslint.autodealers.mjs";

export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "hosting/**",
      "*.config.js",
      "*.config.mjs",
      "check-*.js",
      "create-*.js",
    ],
  },
  ...base,
  next,
  {
    rules: {
      "@next/next/no-img-element": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/rules-of-hooks": "warn",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": "warn",
      "no-case-declarations": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-useless-escape": "warn",
      "react-hooks/purity": "warn",
      "no-constant-binary-expression": "warn",
    },
  },
];
