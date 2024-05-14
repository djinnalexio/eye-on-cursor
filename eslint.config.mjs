import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginJs from '@eslint/js';
import stylisticJs from '@stylistic/eslint-plugin-js';

export default [
    pluginJs.configs.recommended,
    {
        plugins: {
            stylisticJS: stylisticJs,
        },
        languageOptions: {
            globals: {console: true},
        },
        linterOptions: {
            noInlineConfig: true,
        },
        rules: {
            'capitalized-comments': [
                'warn',
                'always',
                {
                    ignorePattern: 'pragma|ignored|import|let|const|this|function',
                    ignoreInlineComments: true,
                    ignoreConsecutiveComments: true,
                },
            ],
            'curly': ['error', 'multi-or-nest', 'consistent'],
            'dot-notation': 'error',
            'eqeqeq': ['error', 'smart'],
            'func-style': ['error', 'declaration'],
            'no-console': 'warn',
            'no-var': 'error',
            'prefer-const': 'warn',
            'strict': ['error', 'safe'],
        },
    },
    eslintPluginPrettierRecommended,
];
