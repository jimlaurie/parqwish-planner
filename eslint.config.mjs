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
    // Calendar dates come from src/lib/dates.ts (park time). toISOString()
    // is UTC, which is already tomorrow after 5 PM Pacific.
    rules: {
      "no-restricted-syntax": ["error",
        {
          selector: "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
          message: "toISOString() is UTC (tomorrow after 5 PM Pacific). Use parkDate/parkToday/addDays/datesBetween from @/lib/dates.",
        },
        {
          selector: "CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']",
          message: "toISOString() is UTC (tomorrow after 5 PM Pacific). Use parkDate/parkToday/addDays/datesBetween from @/lib/dates.",
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
