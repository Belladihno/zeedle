const base = require('./packages/config/eslint-base.js');

module.exports = [
  ...base,
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.turbo/**', '**/next-env.d.ts'],
  },
];
