// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

import {defineConfig} from '@eslint/config-helpers';
import gnome from 'eslint-config-gnome';
import stylistic from '@stylistic/eslint-plugin';

const scopedFiles = ['eslint.config.mjs', 'src/**/*.js'];

export default defineConfig([
    ...gnome.configs.recommended.map((config) => ({
        ...config,
        files: scopedFiles,
    })),
    ...gnome.configs.jsdoc.map((config) => ({
        ...config,
        files: scopedFiles,
    })),
    ...[stylistic.configs['disable-legacy']].map((config) => ({
        ...config,
        files: scopedFiles,
    })),
    {
        files: scopedFiles,
        languageOptions: {
            globals: {
                GIRepositoryGType: 'readonly',
                pkg: 'readonly',
                // GNOME Shell Only
                _: 'readonly',
                C_: 'readonly',
                N_: 'readonly',
                global: 'readonly',
                ngettext: 'readonly',
            },
        },
        plugins: {'@stylistic': stylistic},
        rules: {
            //#region GNOME rules
            // See https://gitlab.gnome.org/GNOME/gnome-shell-extensions/-/blob/main/tools/eslint.config.js
            // See https://gitlab.gnome.org/World/javascript/eslint-config-gnome/-/blob/main/src/configs/gnome-recommended.js?ref_type=heads
            'camelcase': ['error', {properties: 'never'}],
            'consistent-return': 'error',
            'eqeqeq': ['error', 'smart'],
            'prefer-arrow-callback': 'error',
            'prefer-const': ['error', {destructuring: 'all'}],
            //#endregion

            //#region JSDoc rules
            // See https://github.com/gajus/eslint-plugin-jsdoc#rules
            'jsdoc/require-description': 'warn',
            'jsdoc/require-jsdoc': [
                'error',
                {
                    require: {
                        ClassDeclaration: true,
                    },
                    exemptEmptyFunctions: true,
                    // Contexts: ['VariableDeclarator[init.callee.object.name="GObject"][init.callee.property.name="registerClass"]'],
                    // ESLint cannot cleanly put the JSDoc above
                    // `const Foo = GObject.registerClass({}, class Foo extends GObject {})`
                },
            ],
            'jsdoc/require-param-description': 'warn',
            'jsdoc/require-param-type': 'warn',
            'jsdoc/require-returns': 'error',
            'jsdoc/require-returns-check': 'error',
            'jsdoc/require-returns-description': 'warn',
            'jsdoc/require-returns-type': 'warn',
            'jsdoc/valid-types': 'warn',
            //#endregion

            //#region Possible problems
            // See https://eslint.org/docs/latest/rules/#possible-problems
            'no-constructor-return': 'error',
            'no-promise-executor-return': 'error',
            'no-template-curly-in-string': 'error',
            'no-unmodified-loop-condition': 'error',
            'no-unreachable-loop': 'error',
            'no-unused-expressions': ['error', {allowTernary: true}],
            'no-use-before-define': [
                'error',
                {
                    functions: false,
                    classes: true,
                    variables: true,
                    allowNamedExports: true,
                },
            ],
            //#endregion

            //#region Suggestions
            // See https://eslint.org/docs/latest/rules/#suggestions
            'arrow-body-style': ['error', 'as-needed'],
            'capitalized-comments': [
                'warn',
                'always',
                {ignoreConsecutiveComments: true},
            ],
            'complexity': 'warn',
            'default-param-last': 'error',
            'no-console': 'warn',
            'no-extend-native': 'error',
            'no-extra-label': 'error',
            'no-multi-assign': 'warn',
            'no-new': 'error',
            // 'no-shadow' flags the common GNOME syntax
            // `const Foo = GObject.registerClass({}, class Foo extends GObject {})`
            'no-shadow': 'off',
            'no-var': 'warn',
            //#endregion

            //#region Formatting
            // See https://eslint.style/rules#rules
            '@stylistic/array-bracket-newline': ['warn', {multiline: true}],
            '@stylistic/array-bracket-spacing': 'warn',
            '@stylistic/array-element-newline': [
                'warn',
                {
                    multiline: true,
                    minItems: 3,
                },
            ],
            '@stylistic/arrow-parens': 'warn',
            '@stylistic/arrow-spacing': 'warn',
            '@stylistic/block-spacing': 'warn',
            '@stylistic/brace-style': 'warn',
            '@stylistic/comma-dangle': [
                'warn',
                {
                    arrays: 'always-multiline',
                    objects: 'always-multiline',
                    imports: 'always-multiline',
                    functions: 'never',
                },
            ],
            '@stylistic/comma-spacing': 'warn',
            '@stylistic/comma-style': 'warn',
            '@stylistic/computed-property-spacing': 'warn',
            '@stylistic/eol-last': 'warn',
            '@stylistic/indent': [
                'warn',
                4,
                {
                // Allow not indenting the body of GObject.registerClass, since in the future
                // it's intended to be a decorator
                    ignoredNodes:
                    [
                        'CallExpression[callee.object.name=GObject]' +
                        '[callee.property.name=registerClass] > ClassExpression:first-child',
                    ],
                    // Allow dedenting chained member expressions
                    MemberExpression: 'off',
                },
            ],
            '@stylistic/key-spacing': 'warn',
            '@stylistic/keyword-spacing': 'warn',
            '@stylistic/linebreak-style': 'warn',
            '@stylistic/lines-between-class-members': [
                'warn',
                'always',
                {exceptAfterSingleLine: true},
            ],
            '@stylistic/max-len': [
                'warn',
                {
                    code: 100,
                    ignoreComments: true,
                },
            ],
            '@stylistic/max-statements-per-line': 'warn',
            '@stylistic/multiline-comment-style': ['warn', 'separate-lines'],
            '@stylistic/new-parens': 'warn',
            '@stylistic/no-extra-parens': [
                'warn',
                'all',
                {
                    conditionalAssign: false,
                    nestedBinaryExpressions: false,
                    nestedConditionalExpressions: false,
                    returnAssign: false,
                },
            ],
            '@stylistic/function-call-spacing': 'error',
            '@stylistic/no-extra-semi': 'warn',
            '@stylistic/no-mixed-operators': 'error',
            '@stylistic/no-multi-spaces': 'warn',
            '@stylistic/no-multiple-empty-lines': ['warn', {max: 1}],
            '@stylistic/no-tabs': 'warn',
            '@stylistic/no-trailing-spaces': 'warn',
            '@stylistic/no-whitespace-before-property': 'error',
            '@stylistic/nonblock-statement-body-position': ['warn', 'below'],
            '@stylistic/object-curly-newline': [
                'warn',
                {
                    consistent: true,
                    multiline: true,
                },
            ],
            '@stylistic/object-curly-spacing': 'warn',
            '@stylistic/object-property-newline': 'warn',
            '@stylistic/operator-linebreak': 'error',
            '@stylistic/padded-blocks': ['error', 'never'],
            '@stylistic/quote-props': ['warn', 'consistent-as-needed'],
            '@stylistic/quotes': [
                'warn',
                'single',
                {avoidEscape: true},
            ],
            '@stylistic/rest-spread-spacing': ['error'],
            '@stylistic/semi': 'warn',
            '@stylistic/semi-spacing': [
                'error',
                {
                    before: false,
                    after: true,
                },
            ],
            '@stylistic/semi-style': 'error',
            '@stylistic/space-before-blocks': 'error',
            '@stylistic/space-before-function-paren': [
                'error',
                {
                    named: 'never',
                    anonymous: 'always',
                    asyncArrow: 'always',
                },
            ],
            '@stylistic/space-in-parens': 'warn',
            '@stylistic/space-infix-ops': ['error', {int32Hint: false}],
            '@stylistic/space-unary-ops': 'error',
            '@stylistic/spaced-comment': [
                'warn',
                'always',
                {
                    line: {
                        markers: [
                            '/',
                            '#region',
                            '#endregion',
                        ],
                        exceptions: ['-', '+'],
                    },
                    block: {
                        markers: ['!'],
                        exceptions: ['*'],
                        balanced: true,
                    },
                },
            ],
            '@stylistic/switch-colon-spacing': 'warn',
            '@stylistic/template-curly-spacing': 'warn',
            '@stylistic/template-tag-spacing': 'error',
            '@stylistic/wrap-iife': ['error', 'inside'],
            '@stylistic/yield-star-spacing': 'error',
            //#endregion

            //#region GJS restrictions
            // See https://gitlab.gnome.org/World/javascript/gjs-guide/-/blob/main/src/guides/gjs/style-guide/eslint.config.js?ref_type=heads
            'no-restricted-globals': [
                'error',
                {
                    name: 'Debugger',
                    message: 'Internal use only',
                },
                {
                    name: 'GIRepositoryGType',
                    message: 'Internal use only',
                },
                {
                    name: 'log',
                    message: 'Use console.log()',
                },
                {
                    name: 'logError',
                    message: 'Use console.warn() or console.error()',
                },
            ],
            'no-restricted-properties': [
                'error',
                {
                    object: 'imports',
                    property: 'format',
                    message: 'Use template strings',
                },
                {
                    object: 'pkg',
                    property: 'initFormat',
                    message: 'Use template strings',
                },
                {
                    object: 'Lang',
                    property: 'copyProperties',
                    message: 'Use Object.assign()',
                },
                {
                    object: 'Lang',
                    property: 'bind',
                    message: 'Use arrow notation or Function.prototype.bind()',
                },
                {
                    object: 'Lang',
                    property: 'Class',
                    message: 'Use ES6 classes',
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector:
                    'MethodDefinition[key.name="_init"] ' +
                    'CallExpression[arguments.length<=1]' +
                    '[callee.object.type="Super"]' +
                    '[callee.property.name="_init"]',
                    message: 'Use constructor() and super()',
                },
            ],
            //#endregion
        },
    },
]);
