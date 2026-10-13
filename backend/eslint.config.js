const js = require('@eslint/js');
const prettier = require('eslint-config-prettier/flat');
const globals = require('globals');

module.exports = [
    { ignores: ['node_modules/', 'uploads/'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: globals.node,
        },
        rules: {
            eqeqeq: 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-const': 'error',
            'prefer-template': 'error',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['admin/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            globals: globals.browser,
        },
    },
    prettier,
];
