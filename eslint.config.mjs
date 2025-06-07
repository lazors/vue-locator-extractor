import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    {
        ignores: [
            "**/node_modules/",
            "**/dist/",
            "**/build/",
            "**/output/",
            "**/coverage/",
            "**/*.generated.ts",
            "**/*.d.ts",
            "**/package-lock.json",
            "**/yarn.lock",
            "**/.vscode/",
            "**/.idea/",
            "**/.DS_Store",
            "**/Thumbs.db",
            "**/test-vue-src/",
            "**/examples/",
            "**/.git/"
        ]
    },
    {
        ...js.configs.recommended,
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: "module",
            parserOptions: {
                project: true,
            }
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        rules: {
            ...typescriptEslint.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
            }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-inferrable-types": "error",
            "@typescript-eslint/array-type": ["error", {
                default: "array-simple",
            }],
            "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
            "no-console": "warn",
            "no-debugger": "error",
            "no-duplicate-imports": "error",
            "no-unused-expressions": "error",
            "no-var": "error",
            "prefer-const": "error",
            "prefer-template": "error",
            eqeqeq: ["error", "always"],
            indent: ["error", 2, {
                SwitchCase: 1,
            }],
            quotes: ["error", "single", {
                avoidEscape: true,
            }],
            semi: ["error", "never"],
            "comma-dangle": ["error", "never"],
            "object-curly-spacing": ["error", "always"],
            "array-bracket-spacing": ["error", "never"],
            "max-len": ["warn", {
                code: 120,
                tabWidth: 2,
            }],
            complexity: ["warn", 10],
        },
    },
    {
        files: ["**/*.test.ts", "src/test/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "no-console": "off",
        },
    }
];