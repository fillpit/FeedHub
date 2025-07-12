module.exports = {
  root: true,
  ignorePatterns: ["node_modules", "dist", "build", "coverage"],
  env: {
    node: true,
    es6: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": 0,
  },
  overrides: [
    {
      files: ["frontend/**/*.{js,ts,vue}"],
      env: {
        browser: true,
      },
      parser: "vue-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: 2020,
        sourceType: "module",
      },
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:vue/vue3-recommended",
        "plugin:prettier/recommended",
      ],
      plugins: ["@typescript-eslint", "vue"],
      rules: {
        "vue/multi-word-component-names": "off",
        "vue/require-default-prop": "off",
        "vue/no-v-html": "off",
      },
    },
    {
      files: ["backend/**/*.{js,ts}"],
      env: {
        node: true,
      },
      rules: {
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-non-null-assertion": "warn",
      },
    },
  ],
};
