/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  setupFiles: ['./jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // `SyntaxError: Unexpected token 'export'` が発生するので uuid を強制的に CJS で読み込む.
    // skyway パッケージ内で使用している uuid モジュールを ^9.0.0 にすれば解決しそう
    // @see https://stackoverflow.com/questions/73203367/jest-syntaxerror-unexpected-token-export-with-uuid-library
    uuid: require.resolve('uuid'),
  },
};

module.exports = config;
