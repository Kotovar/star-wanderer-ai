import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
    ...nextCoreWebVitals,
    ...nextTypescript,
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
    {
        // ponytail: pinned explicitly because eslint-plugin-react's auto-detect
        // uses context.getFilename(), removed in ESLint 10. Drop when the plugin updates.
        settings: { react: { version: "19.2" } },
        rules: {
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/ban-ts-comment": "error",
            "react-hooks/exhaustive-deps": "error",
            "no-empty": "error",
            "no-unreachable": "error",
            eqeqeq: "error",
            "no-fallthrough": "error",
            "no-shadow": "error",
            "@next/next/no-page-custom-font": "off",
        },
    },
]);

export default eslintConfig;
