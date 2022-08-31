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
        "plugin:promise/recommended"
    ],
    plugins: [
        "jsdoc",
        "write-good-comments",
        "regexp",
        "promise"
    ],
    parserOptions: {
        ecmaVersion: 2020,
    },
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
        "@typescript-eslint/no-explicit-any": "off",
        "write-good-comments/write-good-comments": "warn"
    },
};
