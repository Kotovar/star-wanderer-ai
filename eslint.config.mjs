import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
    ...nextCoreWebVitals,
    ...nextTypescript,
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
    {
        rules: {
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/ban-ts-comment": "error",
            "react-hooks/exhaustive-deps": "error",
            "no-empty": "error",
            "no-unreachable": "error",
            eqeqeq: "error",
            "no-fallthrough": "error",
            "no-shadow": "error",
        },
    },
]);

export default eslintConfig;
