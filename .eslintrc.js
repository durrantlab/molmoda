module.exports = {
    root: true,
    env: {
        node: true,
    },
    extends: [
        "plugin:vue/vue3-essential",
        "eslint:recommended",
        "@vue/typescript/recommended",
        "plugin:jsdoc/recommended",
        "plugin:regexp/recommended",
        "plugin:promise/recommended",
        "plugin:sonarjs/recommended",
        "plugin:vue/essential"
    ],
    plugins: [
        "jsdoc",
        // "write-good-comments",
        "regexp",
        "promise",
        "sonarjs",
    ],
    parserOptions: {
        ecmaVersion: 2020,
    },
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
        "@typescript-eslint/no-explicit-any": "off",
        // "write-good-comments/write-good-comments": "warn",
        "sonarjs/no-redundant-jump": "off",
        "sonarjs/no-duplicate-string": "off",
        "sonarjs/cognitive-complexity": "off",
        "jsdoc/require-jsdoc": [
            1,
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
    ignorePatterns: [
        "**/node_modules/*",
        "**/dist/*",
        "**/public/*",
        "**/docker_compiling/*",
        "**/docs/*",
        "**/wasm-compile/*",
        
    ],
};
