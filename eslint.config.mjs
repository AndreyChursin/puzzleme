import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', '**/coverage/**', 'artifacts/**'] },
  { ...js.configs.recommended, files: ['**/*.{js,cjs,mjs}'], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended.map(config => ({ ...config, files: ['**/*.{ts,tsx}'] })),
);
