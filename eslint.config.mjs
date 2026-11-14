import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      '.local-server/**',
      'public/**',
      'next-env.d.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
