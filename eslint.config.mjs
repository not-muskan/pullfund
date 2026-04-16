import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      "@next/next": next,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y
    },
    rules: {
      ...next.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules
    },
    settings: {
      react: { version: "detect" }
    }
  },
  {
    files: ["next.config.js", "**/*.config.js", "**/*.config.mjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
        process: "readonly"
      }
    },
    rules: {
      "no-undef": "off"
    }
  },
  {
    ignores: [".next/**", "node_modules/**", "data.js"]
  }
];

