module.exports = {
  env: {
    browser: true,
    es6: true
  },
  parser: '@babel/eslint-parser',
  extends: ['prettier', 'eslint:recommended'],
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: []
    },
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    moment: true,
    handlebars: true,
    google: true,
    jQuery: true,
    $: true,
    VERSION: true,
    module: true,
    require: true
  },
  plugins: [],
  rules: {
    'no-alert': 0,
    'no-unused-vars': 1,
    'class-methods-use-this': 0,
    'no-shadow': 0,
    'no-underscore-dangle': 0,
    'import/no-extraneous-dependencies': 0,
    'arrow-body-style': 0,
    'prefer-arrow-callback': 0,
    'func-names': 0,
    'no-param-reassign': 0,
    'no-console': 0,
    'max-len': [2, { code: 120, ignoreTemplateLiterals: true, ignoreStrings: true }],
    'jsx-a11y/control-has-associated-label': 0,
    'arrow-parens': ['error', 'as-needed'],
    'space-before-function-paren': 0,
    'import/prefer-default-export': 0,
    'jsx-a11y/label-has-associated-control': 0,
    'jsx-a11y/no-static-element-interactions': 0,
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/no-noninteractive-tabindex': 0,
    'import/no-named-as-default': 0,
    'global-require': 0,
    'jsx-a11y/no-noninteractive-element-interactions': 0,
    'function-paren-newline': 0,
    'no-useless-return': 0,
    'object-curly-newline': 0,
    indent: 0,
    'comma-dangle': ['error', 'never'],
    'operator-linebreak': ['error', 'after'],
    'no-use-before-define': 0,
    'no-plusplus': 0
  }
};
