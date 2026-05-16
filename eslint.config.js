const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,

  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",

      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },

    rules: {
      "no-unused-vars": "warn",
      "no-empty": "off",
      "no-useless-escape": "off",
      "no-control-regex": "off",
    },
  },

  {
    ignores: [
      "node_modules/**",
      "output/**",
      "memory/**",
      "*.json",
    ],
  },
];
