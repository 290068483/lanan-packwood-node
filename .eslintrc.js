module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // 通用规则
    'indent': ['error', 2],
    'linebreak-style': ['error', 'windows'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
  // 对于XML文件，我们使用overrides来设置特定规则
  overrides: [
    {
      files: ['*.xml'],
      // 对于XML文件，我们禁用JavaScript规则，因为它们不适用
      rules: {
        // 禁用所有JavaScript规则
        'indent': 'off',
        'quotes': 'off',
        'semi': 'off',
      },
    },
  ],
};