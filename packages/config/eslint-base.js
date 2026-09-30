const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const security = require('eslint-plugin-security');

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      'security/detect-object-injection': 'off'
    }
  }
];
