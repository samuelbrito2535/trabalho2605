import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                process: "readonly",
                require: "readonly",
                __dirname: "readonly",
                module: "readonly",
                console: "readonly"
            }
        },
        rules: {
            "no-var": "error",
            "prefer-const": "error",
            "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "no-console": "off",
            "radix": "error",
            "eqeqeq": ["error", "always"],
            "semi": ["error", "always"],
            "quotes": ["error", "double"],
            "indent": ["error", 4],
            "max-len": ["error", { "code": 120 }],
            "no-magic-numbers": ["warn", {
                "ignore": [
                    0, 1, -1, 2, 3, 4, 10, 100, 1000, 5000, 8000, 9000,
                    10000, 1000000000, 200, 400, 404
                ]
            }],
            "consistent-return": "error",
            "max-params": ["error", 4]
        }
    }
]);
