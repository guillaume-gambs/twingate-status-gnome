import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {languageOptions: { globals: { ...globals.browser, log: "readonly" } }},
  pluginJs.configs.recommended,
  {rules: { "no-unused-vars": ["error", { "caughtErrors": "none" }] }},
];