// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

// MVC-Abhängigkeitsregel: view -> controller -> model.
// Fremde Schichten nur über ihren Alias (@controller, @model) importieren.
const layerRule = (forbidden) => [
  'error',
  {
    patterns: forbidden.flatMap((layer) => [
      {
        group: [`@${layer}`, `@${layer}/*`, `**/${layer}`, `**/${layer}/*`],
        message: `Diese Schicht darf nicht auf "${layer}" zugreifen (MVC-Regel, siehe AGENTS.md).`,
      },
    ]),
  },
];

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  { ignores: ['dist/*', '.expo/*'] },
  {
    files: ['src/model/**'],
    rules: { 'no-restricted-imports': layerRule(['controller', 'view']) },
  },
  { files: ['src/controller/**'], rules: { 'no-restricted-imports': layerRule(['view']) } },
  { files: ['src/view/**'], rules: { 'no-restricted-imports': layerRule(['model']) } },
]);
