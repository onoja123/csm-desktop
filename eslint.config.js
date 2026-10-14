import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const singleLineDeclarations = ['singleline-const', 'singleline-let', 'singleline-var'];
const multiLineStatements = [
  'multiline-const',
  'multiline-let',
  'multiline-var',
  'multiline-expression',
  'multiline-export',
  'multiline-type',
];
const singleLineIf = { selector: 'IfStatement', lineMode: 'singleline' };

export default tseslint.config(
  { ignores: ['dist', 'src-tauri', 'node_modules'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  {
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'always', prev: '*', next: ['const', 'let', 'var'] },
        { blankLine: 'any', prev: singleLineDeclarations, next: singleLineDeclarations },
        {
          blankLine: 'always',
          prev: '*',
          next: [...multiLineStatements, 'multiline-block-like', 'interface'],
        },
        {
          blankLine: 'always',
          prev: [...multiLineStatements, 'block-like', 'interface'],
          next: '*',
        },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'do'], next: '*' },
        { blankLine: 'any', prev: singleLineIf, next: singleLineIf },
      ],
    },
  },
);
