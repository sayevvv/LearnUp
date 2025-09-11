import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Ignore generated code and prisma runtime bundled in repo
      "app/generated/**",
    ],
  },
  // Project overrides
  {
    rules: {
      // Allow any in app code to keep velocity; revisit later for strict typing
      "@typescript-eslint/no-explicit-any": "off",
      // Some third-party or generated code may alias `this` — do not block build
      "@typescript-eslint/no-this-alias": "off",
      // Allow require in generated/bundled files (we already ignore generated folder)
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
