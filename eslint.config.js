import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "AUDIT/**",
      "tmp/**",
      "output/**",
      ".playwright-cli/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react },
    settings: { react: { version: "19.2" } },
    rules: {
      "react/jsx-uses-vars": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "no-constant-binary-expression": "error",
    },
  },
];
