describe('JSX support', () => {
  it('should parse JSX files without errors', () => {
    var logger = require('jsdoc/util/logger').default;

    function parseJsx() {
      return jasmine.getDocSetFromFile('test/fixtures/jsx.js');
    }

    spyOn(logger, 'error');
    expect(parseJsx).not.toThrow();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
