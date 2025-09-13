module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    // 通用规则
    indent: ['error', 2],
    'linebreak-style': 'off', // 关闭行尾风格检查，让Prettier处理
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'prettier/prettier': 'error',
  },
};
