module.exports = {
  unmockedModulePathPatterns: ['babel-core'],
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.js',
  ],
  coverageDirectory: 'jest-coverage',
  coverageReporters: ['lcov'],
};
