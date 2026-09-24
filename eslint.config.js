import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Non-null assertions are used deliberately with noUncheckedIndexedAccess
      // on loop-bounded array/typed-array reads, where TS can't see the
      // invariant but the code has already proven the index is in range.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
    },
  },
  {
    files: ["*.config.js", "*.config.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    ...tseslint.configs.disableTypeChecked,
  },
);
