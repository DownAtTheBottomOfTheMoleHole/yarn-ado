const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");

module.exports = [
  {
    ignores: ["**/node_modules/**/*", "**/*.d.ts"],
  },
  ...tsPlugin.configs["flat/recommended"],
  {
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
    },
  },
];
