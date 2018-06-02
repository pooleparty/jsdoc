module.exports = {
  extends: 'airbnb-base',
  parser: 'babel-eslint',
  env: {
    browser: true,
    jest: true,
    jasmine: true,
  },
  rules: {
    'no-plusplus': 'off',
    'no-param-reassign': 'off',
    'no-underscore-dangle': 'off',
    'prefer-destructuring': 'off',
    'prefer-const': 'off',
    'no-multi-assign': 'off',
    'func-names': 'off',
    'brace-style': 'off',
    'prefer-rest-params': 'off',
    'no-console': 'off',
    'no-continue': 'off',
    'no-var': 'off',
    'vars-on-top': 'off',
    'no-fallthrough': 'off',
    'block-scoped-var': 'off',
    'no-mixed-operators': 'off',
    'global-require': 'off',
    'import/prefer-default-export': 'off',
    'import/no-unresolved': 'off',
    'import/no-dynamic-require': 'off',
    // git will switch LF based on OS, so rule should switch also
    'linebreak-style': ['error', require('os').EOL === '\r\n' ? 'windows' : 'unix'],
  },
};