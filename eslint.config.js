import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'index.html'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    // Server (Node) code
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    // Client (browser) code
    files: ['client/**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  prettier,
];
