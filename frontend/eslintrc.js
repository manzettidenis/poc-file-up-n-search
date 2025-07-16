module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
    createDefaultProgram: true,
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'prettier', 'import', 'solid'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:solid/typescript',
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: true,
    },
  },
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  ignorePatterns: ['.eslintrc.js', 'commitlint.config.js', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js'],
  rules: {
    'import/no-unresolved': 'error',
    'import/no-named-as-default-member': 'off',
    'import/order': [
      'error',
      {
        alphabetize: {
          caseInsensitive: true,
          order: 'asc',
        },
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'newlines-between': 'always-and-inside-groups',
        pathGroupsExcludedImportTypes: ['builtin'],
      },
    ],
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    // SolidJS specific rules
    'solid/reactivity': 'warn',
    'solid/no-destructure': 'warn',
    'solid/jsx-no-duplicate-props': 'error',
  },
}
