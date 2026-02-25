module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "simple-import-sort", "import"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  rules: {
    "simple-import-sort/imports": "off",
    "simple-import-sort/exports": "off",
    "import/no-duplicates": "error",
    "@typescript-eslint/no-explicit-any": "off"
  },
  ignorePatterns: ["dist", ".next", "node_modules"]
};
