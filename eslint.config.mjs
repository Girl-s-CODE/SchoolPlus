import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/prisma/migrations/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...nextPlugin.flatConfig.recommended,
    settings: { next: { rootDir: 'client' } },
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
