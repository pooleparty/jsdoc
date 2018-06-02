describe('jsdoc/util/error', () => {
  var error = require('jsdoc/util/error');
  var handle = error.handle;
  var logger = require('jsdoc/util/logger').default;

  it('should exist', () => {
    expect(error).toBeDefined();
    expect(typeof error).toBe('object');
  });

  it('should export a "handle" function', () => {
    expect(handle).toBeDefined();
    expect(typeof handle).toBe('function');
  });

  describe('handle', () => {
    it('should not throw', () => {
      expect(handle).not.toThrow();
    });

    it('should log messages with logger.error()', () => {
      spyOn(logger, 'error');
      handle('test');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should use special formatting for Error instances', () => {
      spyOn(logger, 'error');
      handle(new Error('Oh no!'));

      expect(logger.error).toHaveBeenCalledWith('Error: Oh no!');
    });
  });
});
