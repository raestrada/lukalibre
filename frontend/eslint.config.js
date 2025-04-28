import svelte from 'eslint-plugin-svelte';
import security from 'eslint-plugin-security';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelteParser from 'svelte-eslint-parser';

/** @type {import('eslint').Linter.FlatConfig} */
export default [
  {
    ignores: [
      'node_modules',
      'build',
      'dist',
    ],
  },
  {
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      security,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...security.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-unsafe-regex': 'warn',
    },
  },
  {
    files: ['**/*.svelte'],
    plugins: {
      svelte,
      '@typescript-eslint': tseslint,
      security,
    },
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      ...svelte.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-unsafe-regex': 'warn',
    },
  },
];
