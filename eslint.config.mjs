import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import jsdoc from "eslint-plugin-jsdoc";
import promise from "eslint-plugin-promise";
import regexp from "eslint-plugin-regexp";

export default tseslint.config(
    // Global ignores
    {
        ignores: [
            "**/node_modules/*",
            "**/dist/*",
            "**/public/*",
            "**/docker_compiling/*",
            "**/docs/*",
            "**/wasm-compile/*",
        ],
    },

    // Base configs
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/essential"],

    // Plugin recommended configs
    jsdoc.configs["flat/recommended"],
    promise.configs["flat/recommended"],
    regexp.configs["flat/recommended"],

    // Main configuration
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx,vue}"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
        },
        rules: {
            // Core rules
            "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
            "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",

            // TypeScript
            "@typescript-eslint/no-explicit-any": "off",

            // JSDoc
            "jsdoc/require-jsdoc": [
                "warn",
                {
                    require: {
                        FunctionExpression: true,
                        ClassDeclaration: true,
                        ClassExpression: true,
                        MethodDefinition: true,
                    },
                },
            ],
            "jsdoc/check-tag-names": "off",
        },
    },

    // Vue-specific configuration
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
            },
        },
    }
);